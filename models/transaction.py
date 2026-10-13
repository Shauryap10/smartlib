from datetime import datetime, timedelta
from .db import get_db_connection
from config import Config

def calculate_fine(due_date_str, return_date_str=None, fine_rate=Config.DEFAULT_FINE_RATE):
    try:
        due = datetime.strptime(due_date_str, "%Y-%m-%d")
        if return_date_str:
            target = datetime.strptime(return_date_str, "%Y-%m-%d")
        else:
            target = datetime.now()
        
        diff_days = (target.date() - due.date()).days
        if diff_days > 0:
            return round(diff_days * fine_rate, 2), diff_days
        return 0.0, 0
    except Exception:
        return 0.0, 0

def issue_book(book_id, user_id, issue_date=None, due_date=None):
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Check User
    user = cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        conn.close()
        return False, "Selected patron/student does not exist."
    if user['status'] != 'active':
        conn.close()
        return False, f"Patron account '{user['full_name']}' is blocked and cannot borrow books."

    # 2. Check Book
    book = cursor.execute("SELECT * FROM books WHERE id = ?", (book_id,)).fetchone()
    if not book:
        conn.close()
        return False, "Selected book does not exist."
    if book['available_copies'] <= 0:
        conn.close()
        return False, f"'{book['title']}' has 0 available copies in stock."

    # Dates
    today_str = datetime.now().strftime("%Y-%m-%d")
    if not issue_date:
        issue_date = today_str
    if not due_date:
        due_date = (datetime.now() + timedelta(days=Config.DEFAULT_LOAN_DAYS)).strftime("%Y-%m-%d")

    # 3. Insert transaction
    cursor.execute("""
        INSERT INTO transactions (book_id, user_id, issue_date, due_date, return_date, status, fine_amount)
        VALUES (?, ?, ?, ?, NULL, 'issued', 0.0)
    """, (book_id, user_id, issue_date, due_date))
    new_tx_id = cursor.lastrowid

    # 4. Decrement available copies
    cursor.execute("""
        UPDATE books
        SET available_copies = available_copies - 1,
            updated_at = datetime('now')
        WHERE id = ?
    """, (book_id,))

    conn.commit()
    conn.close()
    return True, new_tx_id

def return_book(transaction_id, fine_rate=Config.DEFAULT_FINE_RATE):
    conn = get_db_connection()
    cursor = conn.cursor()

    tx = cursor.execute("SELECT * FROM transactions WHERE id = ?", (transaction_id,)).fetchone()
    if not tx:
        conn.close()
        return False, "Transaction record not found."
    if tx['status'] != 'issued':
        conn.close()
        return False, "This book loan has already been marked as returned."

    today_str = datetime.now().strftime("%Y-%m-%d")
    fine_amount, overdue_days = calculate_fine(tx['due_date'], today_str, fine_rate)

    # 1. Update Transaction
    cursor.execute("""
        UPDATE transactions
        SET status = 'returned',
            return_date = ?,
            fine_amount = ?
        WHERE id = ?
    """, (today_str, fine_amount, transaction_id))

    # 2. Increment available copies
    cursor.execute("""
        UPDATE books
        SET available_copies = available_copies + 1,
            updated_at = datetime('now')
        WHERE id = ?
    """, (tx['book_id'],))

    conn.commit()
    conn.close()
    return True, {"fine_amount": fine_amount, "overdue_days": overdue_days}

def get_all_transactions(status=None, user_id=None, book_id=None, search=None):
    conn = get_db_connection()
    query = """
        SELECT t.*, 
               b.title AS book_title, b.isbn AS book_isbn,
               d.name AS department_name, d.code AS department_code,
               u.full_name AS user_name, u.student_id AS user_student_id, u.email AS user_email
        FROM transactions t
        JOIN books b ON t.book_id = b.id
        LEFT JOIN departments d ON b.department_id = d.id
        JOIN users u ON t.user_id = u.id
        WHERE 1=1
    """
    params = []

    if status and status != 'all':
        query += " AND t.status = ?"
        params.append(status)

    if user_id:
        query += " AND t.user_id = ?"
        params.append(user_id)

    if book_id:
        query += " AND t.book_id = ?"
        params.append(book_id)

    if search:
        s = f"%{search.strip().lower()}%"
        query += " AND (LOWER(b.title) LIKE ? OR LOWER(b.isbn) LIKE ? OR LOWER(u.full_name) LIKE ? OR LOWER(u.student_id) LIKE ?)"
        params.extend([s, s, s, s])

    query += " ORDER BY t.id DESC"
    records = conn.execute(query, params).fetchall()
    conn.close()

    result = []
    for r in records:
        item = dict(r)
        if item['status'] == 'issued':
            live_fine, o_days = calculate_fine(item['due_date'])
            item['current_fine'] = live_fine
            item['is_overdue'] = o_days > 0
            item['overdue_days'] = o_days
        else:
            item['current_fine'] = item['fine_amount']
            item['is_overdue'] = False
            item['overdue_days'] = 0
        result.append(item)

    return result

def get_user_dashboard_stats(user_id):
    conn = get_db_connection()
    
    # 1. Available books
    avail_books = conn.execute("SELECT SUM(available_copies) as total FROM books").fetchone()['total'] or 0
    
    # 2. User active loans
    active_loans = conn.execute("SELECT * FROM transactions WHERE user_id = ? AND status = 'issued'", (user_id,)).fetchall()
    my_issued = len(active_loans)

    due_soon = 0
    overdue = 0
    today = datetime.now().date()

    for l in active_loans:
        due = datetime.strptime(l['due_date'], "%Y-%m-%d").date()
        diff = (due - today).days
        if diff < 0:
            overdue += 1
        elif 0 <= diff <= 3:
            due_soon += 1

    conn.close()
    return {
        'available_books': avail_books,
        'my_issued': my_issued,
        'due_soon': due_soon,
        'overdue': overdue
    }

def get_admin_dashboard_stats():
    conn = get_db_connection()

    distinct_books = conn.execute("SELECT COUNT(*) as c FROM books").fetchone()['c'] or 0
    total_copies = conn.execute("SELECT SUM(total_copies) as c FROM books").fetchone()['c'] or 0
    available_copies = conn.execute("SELECT SUM(available_copies) as c FROM books").fetchone()['c'] or 0
    total_users = conn.execute("SELECT COUNT(*) as c FROM users WHERE role = 'user'").fetchone()['c'] or 0
    active_tx = conn.execute("SELECT COUNT(*) as c FROM transactions WHERE status = 'issued'").fetchone()['c'] or 0
    total_depts = conn.execute("SELECT COUNT(*) as c FROM departments").fetchone()['c'] or 0

    # Overdue and total fines
    active_loans = conn.execute("SELECT * FROM transactions WHERE status = 'issued'").fetchall()
    overdue_count = 0
    total_unpaid_fines = 0.0

    for l in active_loans:
        fine, o_days = calculate_fine(l['due_date'])
        if o_days > 0:
            overdue_count += 1
            total_unpaid_fines += fine

    conn.close()

    return {
        'distinct_books': distinct_books,
        'total_copies': total_copies,
        'available_copies': available_copies,
        'issued_copies': max(0, total_copies - available_copies),
        'total_users': total_users,
        'active_transactions': active_tx,
        'overdue_books': overdue_count,
        'total_fines': round(total_unpaid_fines, 2),
        'total_departments': total_depts
    }
