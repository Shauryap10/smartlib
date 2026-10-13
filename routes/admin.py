from flask import Blueprint, render_template, request, session, redirect, url_for, flash, jsonify
from . import login_required, role_required
from models.user import get_all_users, get_user_by_id, update_user_status
from models.book import get_all_books, get_books_by_department
from models.department import get_all_departments, get_department_stats, get_all_categories
from models.transaction import get_admin_dashboard_stats, get_all_transactions
from models.db import init_db, log_activity

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

@admin_bp.route('/dashboard')
@login_required
@role_required('librarian')
def dashboard():
    stats = get_admin_dashboard_stats()
    dept_stats = get_department_stats()
    recent_transactions = get_all_transactions()[:5]
    recent_books = get_all_books()[:5]
    overdue_loans = [t for t in get_all_transactions(status='issued') if t.get('is_overdue')][:5]

    return render_template(
        'librarian_dashboard.html',
        stats=stats,
        dept_stats=dept_stats,
        recent_transactions=recent_transactions,
        recent_books=recent_books,
        overdue_loans=overdue_loans
    )

@admin_bp.route('/users')
@login_required
@role_required('librarian')
def users():
    search = request.args.get('search', '').strip()
    status_filter = request.args.get('status')
    dept_id = request.args.get('department_id')

    user_list = get_all_users(
        search=search,
        role='user',  # only students/patrons in the user list
        status=status_filter,
        department_id=dept_id
    )
    departments = get_all_departments()

    return render_template(
        'users.html',
        users=user_list,
        departments=departments,
        search_query=search,
        selected_status=status_filter,
        selected_dept=dept_id
    )

@admin_bp.route('/users/status/<int:user_id>', methods=['POST'])
@login_required
@role_required('librarian')
def toggle_user_status(user_id):
    target = get_user_by_id(user_id)
    if not target:
        return jsonify({'success': False, 'message': 'User not found.'}), 404

    if target['role'] == 'librarian':
        return jsonify({'success': False, 'message': 'Cannot block a librarian account.'}), 400

    new_status = 'blocked' if target['status'] == 'active' else 'active'
    update_user_status(user_id, new_status)
    log_activity(session['user_id'], 'USER_STATUS_CHANGE', f"Changed status of user #{user_id} ({target['email']}) to {new_status}")

    return jsonify({
        'success': True,
        'new_status': new_status,
        'message': f"User '{target['full_name']}' is now {new_status}."
    })

@admin_bp.route('/reports')
@login_required
@role_required('librarian')
def reports():
    stats = get_admin_dashboard_stats()
    dept_stats = get_department_stats()
    all_books = get_all_books()
    all_categories = get_all_categories()
    overdue_loans = [t for t in get_all_transactions(status='issued') if t.get('is_overdue')]

    # Category distribution stats
    cat_summary = []
    for cat in all_categories:
        cat_books = [b for b in all_books if b['category_id'] == cat['id']]
        total_copies = sum(b['total_copies'] for b in cat_books)
        avail_copies = sum(b['available_copies'] for b in cat_books)
        cat_summary.append({
            'name': cat['name'],
            'count': len(cat_books),
            'total_copies': total_copies,
            'available_copies': avail_copies,
            'issued_copies': max(0, total_copies - avail_copies)
        })

    return render_template(
        'reports.html',
        stats=stats,
        dept_stats=dept_stats,
        cat_summary=cat_summary,
        overdue_loans=overdue_loans
    )

@admin_bp.route('/reset-demo', methods=['POST'])
@login_required
@role_required('librarian')
def reset_demo():
    try:
        init_db()
        log_activity(session['user_id'], 'RESET_DEMO', "Restored demo library database.")
        flash("SmartLib demo database has been successfully re-initialized with sample data.", "success")
    except Exception as e:
        flash(f"Error resetting database: {str(e)}", "danger")
    return redirect(url_for('admin.dashboard'))
