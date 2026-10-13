from flask import Blueprint, render_template, request, session, redirect, url_for, flash, jsonify
from . import login_required, role_required
from models.transaction import issue_book, return_book, get_all_transactions
from models.book import get_all_books
from models.user import get_all_users
from models.db import log_activity

trans_bp = Blueprint('transactions', __name__)

@trans_bp.route('/transactions')
@login_required
@role_required('librarian')
def transactions_list():
    status_filter = request.args.get('status', 'all')
    search = request.args.get('search', '').strip()

    all_tx = get_all_transactions(status=status_filter, search=search)
    books = get_all_books()
    users = get_all_users(role='user', status='active')

    return render_template(
        'transactions.html',
        transactions=all_tx,
        books=books,
        users=users,
        active_tab=status_filter,
        search_query=search
    )

@trans_bp.route('/api/transactions/issue', methods=['POST'])
@login_required
@role_required('librarian')
def api_issue_book():
    data = request.get_json() or request.form
    book_id = data.get('book_id')
    user_id = data.get('user_id')
    issue_date = data.get('issue_date')
    due_date = data.get('due_date')

    if not book_id or not user_id:
        return jsonify({'success': False, 'message': 'Please select both a book and a patron.'}), 400

    ok, result = issue_book(int(book_id), int(user_id), issue_date, due_date)
    if not ok:
        return jsonify({'success': False, 'message': result}), 400

    log_activity(session['user_id'], 'ISSUE_BOOK', f"Issued book #{book_id} to user #{user_id} (TX #{result}).")
    return jsonify({
        'success': True,
        'transaction_id': result,
        'message': 'Book issued successfully.'
    })

@trans_bp.route('/api/transactions/return/<int:tx_id>', methods=['POST'])
@login_required
@role_required('librarian')
def api_return_book(tx_id):
    ok, result = return_book(tx_id)
    if not ok:
        return jsonify({'success': False, 'message': result}), 400

    fine = result.get('fine_amount', 0.0)
    days = result.get('overdue_days', 0)
    fine_note = f" (Overdue by {days} days, fine: ₹{fine})" if fine > 0 else ""

    log_activity(session['user_id'], 'RETURN_BOOK', f"Returned book loan TX #{tx_id}.{fine_note}")
    return jsonify({
        'success': True,
        'fine_amount': fine,
        'overdue_days': days,
        'message': f"Book returned successfully.{fine_note}"
    })
