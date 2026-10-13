from flask import Blueprint, render_template, request, session, redirect, url_for, flash, jsonify
from . import login_required, role_required
from models.user import get_user_by_id, update_user_profile
from models.book import get_all_books, get_book_by_id, find_book_by_qr
from models.department import get_all_departments, get_all_categories
from models.transaction import get_user_dashboard_stats, get_all_transactions

user_bp = Blueprint('user', __name__, url_prefix='/user')

@user_bp.route('/dashboard')
@login_required
@role_required('user')
def dashboard():
    user_id = session['user_id']
    user = get_user_by_id(user_id)
    stats = get_user_dashboard_stats(user_id)

    # Active loans for current student
    current_loans = get_all_transactions(status='issued', user_id=user_id)
    
    # Past returned loans for current student
    loan_history = get_all_transactions(status='returned', user_id=user_id)

    # Featured available books for browsing
    browse_books = get_all_books()[:6]

    return render_template(
        'user_dashboard.html',
        user=user,
        stats=stats,
        current_loans=current_loans,
        loan_history=loan_history,
        browse_books=browse_books
    )

@user_bp.route('/books')
@login_required
@role_required('user')
def books():
    search = request.args.get('search', '').strip()
    dept_id = request.args.get('department_id')
    cat_id = request.args.get('category_id')
    availability = request.args.get('availability', 'All')

    books_list = get_all_books(
        search=search,
        department_id=dept_id,
        category_id=cat_id,
        availability=availability
    )
    departments = get_all_departments()
    categories = get_all_categories()

    return render_template(
        'user_books.html',
        books=books_list,
        departments=departments,
        categories=categories,
        selected_dept=dept_id,
        selected_cat=cat_id,
        selected_avail=availability,
        search_query=search
    )

@user_bp.route('/scan-qr')
@login_required
@role_required('user')
def scan_qr():
    return render_template('user_scan_qr.html')

@user_bp.route('/api/book-lookup/<query>')
@login_required
def book_lookup(query):
    book, parsed = find_book_by_qr(query)
    if book:
        return jsonify({
            'success': True,
            'found': True,
            'book': book,
            'query_info': parsed
        })
    return jsonify({
        'success': True,
        'found': False,
        'query_info': parsed
    })

@user_bp.route('/profile')
@login_required
@role_required('user')
def profile():
    user = get_user_by_id(session['user_id'])
    stats = get_user_dashboard_stats(session['user_id'])
    return render_template('user_profile.html', user=user, stats=stats)
