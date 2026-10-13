from flask import Blueprint, render_template, request, session, redirect, url_for, flash, jsonify
from . import login_required, role_required
from models.book import (
    get_all_books, get_book_by_id, get_book_by_isbn,
    create_book, update_book, delete_book, add_book_copies,
    find_book_by_qr, get_books_by_department, normalize_isbn
)
from models.department import get_all_departments, get_department_stats, get_all_categories
from models.db import log_activity

books_bp = Blueprint('books', __name__)

@books_bp.route('/books')
@login_required
@role_required('librarian')
def books_list():
    search = request.args.get('search', '').strip()
    dept_id = request.args.get('department_id')
    cat_id = request.args.get('category_id')
    availability = request.args.get('availability', 'All')

    books = get_all_books(
        search=search,
        department_id=dept_id,
        category_id=cat_id,
        availability=availability
    )
    departments = get_all_departments()
    categories = get_all_categories()

    return render_template(
        'books.html',
        books=books,
        departments=departments,
        categories=categories,
        selected_dept=dept_id,
        selected_cat=cat_id,
        selected_avail=availability,
        search_query=search
    )

@books_bp.route('/departments')
@login_required
def departments():
    # Both librarian and user can view department compartments, but librarian has management controls
    dept_stats = get_department_stats()
    
    # Preload books for each department
    for d in dept_stats:
        d['books'] = get_books_by_department(d['id'])

    all_departments = get_all_departments()
    all_categories = get_all_categories()

    return render_template(
        'departments.html',
        dept_stats=dept_stats,
        departments=all_departments,
        categories=all_categories
    )

@books_bp.route('/scan-qr')
@login_required
def scan_qr():
    departments = get_all_departments()
    categories = get_all_categories()
    return render_template('scan_qr.html', departments=departments, categories=categories)

# --- REST APIs for Dynamic Operations ---

@books_bp.route('/api/books/add', methods=['POST'])
@login_required
@role_required('librarian')
def api_add_book():
    data = request.get_json() or request.form
    title = data.get('title', '').strip()
    author = data.get('author', '').strip()
    isbn = data.get('isbn', '').strip()
    category_id = data.get('category_id')
    department_id = data.get('department_id')
    copies = int(data.get('total_copies', 1))

    if not title or not author or not isbn or not department_id:
        return jsonify({'success': False, 'message': 'All required fields must be provided.'}), 400

    # Duplicate ISBN Check
    existing = get_book_by_isbn(isbn)
    if existing:
        return jsonify({
            'success': False,
            'is_duplicate': True,
            'existing_book': dict(existing),
            'message': f"Book with this ISBN already exists: '{existing['title']}'."
        }), 400

    new_id = create_book(title, author, isbn, category_id, department_id, copies)
    log_activity(session['user_id'], 'ADD_BOOK', f"Added book #{new_id} ({title}) with {copies} copies.")

    return jsonify({
        'success': True,
        'book_id': new_id,
        'message': 'New book added successfully.'
    })

@books_bp.route('/api/books/edit/<int:book_id>', methods=['POST'])
@login_required
@role_required('librarian')
def api_edit_book(book_id):
    data = request.get_json() or request.form
    title = data.get('title', '').strip()
    author = data.get('author', '').strip()
    isbn = data.get('isbn', '').strip()
    category_id = data.get('category_id')
    department_id = data.get('department_id')
    copies = int(data.get('total_copies', 1))

    # Duplicate check for ISBN on other books
    existing = get_book_by_isbn(isbn, exclude_id=book_id)
    if existing:
        return jsonify({
            'success': False,
            'message': f"Another book with this ISBN already exists: '{existing['title']}'."
        }), 400

    ok, msg = update_book(book_id, title, author, isbn, category_id, department_id, copies)
    if not ok:
        return jsonify({'success': False, 'message': msg}), 400

    log_activity(session['user_id'], 'EDIT_BOOK', f"Updated book #{book_id} ({title}).")
    return jsonify({'success': True, 'message': 'Book updated successfully.'})

@books_bp.route('/api/books/delete/<int:book_id>', methods=['POST'])
@login_required
@role_required('librarian')
def api_delete_book(book_id):
    ok, msg = delete_book(book_id)
    if not ok:
        return jsonify({'success': False, 'message': msg}), 400

    log_activity(session['user_id'], 'DELETE_BOOK', f"Deleted book #{book_id}.")
    return jsonify({'success': True, 'message': msg})

@books_bp.route('/api/books/add-copy/<int:book_id>', methods=['POST'])
@login_required
@role_required('librarian')
def api_add_copies(book_id):
    data = request.get_json() or request.form
    count = int(data.get('count', 1))

    add_book_copies(book_id, count)
    book = get_book_by_id(book_id)

    log_activity(session['user_id'], 'ADD_COPY', f"Added {count} copies to book #{book_id} ({book['title']}).")
    return jsonify({
        'success': True,
        'message': f"{count} {'copy' if count == 1 else 'copies'} added successfully.",
        'new_total': book['total_copies'],
        'new_available': book['available_copies']
    })

@books_bp.route('/api/books/lookup/<path:query>')
@login_required
def api_lookup_book(query):
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

@books_bp.route('/api/books/check-isbn/<isbn>')
@login_required
def api_check_isbn(isbn):
    book = get_book_by_isbn(isbn)
    if book:
        return jsonify({'exists': True, 'book': dict(book)})
    return jsonify({'exists': False})
