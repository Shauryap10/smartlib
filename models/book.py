import re
from datetime import datetime
from .db import get_db_connection

def normalize_isbn(isbn):
    if not isbn:
        return ''
    return re.sub(r'[\s\-]', '', str(isbn)).strip().upper()

def parse_qr_text(raw_text):
    """
    Intelligently extracts ISBN or Book ID from raw QR text:
    Formats supported:
      - 9780132350884
      - ISBN:9780132350884
      - ISBN: 9780132350884
      - BOOK-ID:123
      - BOOK ID: 123
      - ID: 123
      - ID:123
    """
    if not raw_text:
        return {'isbn': None, 'book_id': None, 'clean': ''}

    text = str(raw_text).strip()
    book_id = None
    clean = text

    # Check for BOOK-ID / ID prefixes
    id_match = re.match(r'^(?:book[-\s]?id|id)\s*[:=]\s*(\d+)', text, re.IGNORECASE)
    if id_match:
        book_id = int(id_match.group(1))
        clean = id_match.group(1)
    else:
        # Check for ISBN prefix
        clean = re.sub(r'^(?:isbn|book)\s*[:=]\s*', '', text, flags=re.IGNORECASE).strip()
        # Fallback: if pure short digits (< 6 digits), also check as book_id
        if clean.isdigit() and len(clean) <= 4:
            book_id = int(clean)

    norm_isbn = normalize_isbn(clean)

    return {
        'isbn': norm_isbn,
        'book_id': book_id,
        'clean': clean
    }

def find_book_by_qr(raw_qr_text):
    parsed = parse_qr_text(raw_qr_text)
    conn = get_db_connection()

    # 1. Search by ISBN first
    if parsed['isbn'] and len(parsed['isbn']) >= 8:
        # Search comparing normalized ISBN in SQL
        book = conn.execute("""
            SELECT b.*, d.name AS department_name, d.code AS department_code, c.name AS category_name
            FROM books b
            LEFT JOIN departments d ON b.department_id = d.id
            LEFT JOIN categories c ON b.category_id = c.id
            WHERE REPLACE(REPLACE(UPPER(b.isbn), '-', ''), ' ', '') = ?
        """, (parsed['isbn'],)).fetchone()
        if book:
            conn.close()
            return dict(book), parsed

    # 2. Search by Book ID
    if parsed['book_id']:
        book = conn.execute("""
            SELECT b.*, d.name AS department_name, d.code AS department_code, c.name AS category_name
            FROM books b
            LEFT JOIN departments d ON b.department_id = d.id
            LEFT JOIN categories c ON b.category_id = c.id
            WHERE b.id = ?
        """, (parsed['book_id'],)).fetchone()
        if book:
            conn.close()
            return dict(book), parsed

    # Fallback search by clean value
    if parsed['clean']:
        clean_norm = normalize_isbn(parsed['clean'])
        book = conn.execute("""
            SELECT b.*, d.name AS department_name, d.code AS department_code, c.name AS category_name
            FROM books b
            LEFT JOIN departments d ON b.department_id = d.id
            LEFT JOIN categories c ON b.category_id = c.id
            WHERE REPLACE(REPLACE(UPPER(b.isbn), '-', ''), ' ', '') = ?
        """, (clean_norm,)).fetchone()
        if book:
            conn.close()
            return dict(book), parsed

    conn.close()
    return None, parsed

def get_all_books(search=None, department_id=None, category_id=None, availability=None):
    conn = get_db_connection()
    query = """
        SELECT b.*, d.name AS department_name, d.code AS department_code, c.name AS category_name,
               (b.total_copies - b.available_copies) AS issued_copies
        FROM books b
        LEFT JOIN departments d ON b.department_id = d.id
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE 1=1
    """
    params = []

    if department_id and str(department_id) != 'All':
        query += " AND b.department_id = ?"
        params.append(department_id)

    if category_id and str(category_id) != 'All':
        query += " AND b.category_id = ?"
        params.append(category_id)

    if availability == 'Available':
        query += " AND b.available_copies > 0"
    elif availability == 'Issued':
        query += " AND (b.total_copies - b.available_copies) > 0"
    elif availability == 'Out of Stock':
        query += " AND b.available_copies = 0"

    if search:
        s = f"%{search.strip().lower()}%"
        query += " AND (LOWER(b.title) LIKE ? OR LOWER(b.author) LIKE ? OR LOWER(b.isbn) LIKE ?)"
        params.extend([s, s, s])

    query += " ORDER BY b.title ASC"
    books = conn.execute(query, params).fetchall()
    conn.close()
    return books

def get_book_by_id(book_id):
    conn = get_db_connection()
    book = conn.execute("""
        SELECT b.*, d.name AS department_name, d.code AS department_code, c.name AS category_name,
               (b.total_copies - b.available_copies) AS issued_copies
        FROM books b
        LEFT JOIN departments d ON b.department_id = d.id
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.id = ?
    """, (book_id,)).fetchone()
    conn.close()
    return book

def get_book_by_isbn(isbn, exclude_id=None):
    norm = normalize_isbn(isbn)
    if not norm:
        return None
    conn = get_db_connection()
    if exclude_id:
        book = conn.execute("""
            SELECT b.*, d.name AS department_name, c.name AS category_name
            FROM books b
            LEFT JOIN departments d ON b.department_id = d.id
            LEFT JOIN categories c ON b.category_id = c.id
            WHERE REPLACE(REPLACE(UPPER(b.isbn), '-', ''), ' ', '') = ? AND b.id != ?
        """, (norm, exclude_id)).fetchone()
    else:
        book = conn.execute("""
            SELECT b.*, d.name AS department_name, c.name AS category_name
            FROM books b
            LEFT JOIN departments d ON b.department_id = d.id
            LEFT JOIN categories c ON b.category_id = c.id
            WHERE REPLACE(REPLACE(UPPER(b.isbn), '-', ''), ' ', '') = ?
        """, (norm,)).fetchone()
    conn.close()
    return book

def create_book(title, author, isbn, category_id, department_id, total_copies):
    total_copies = max(1, int(total_copies))
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO books (title, author, isbn, category_id, department_id, total_copies, available_copies, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    """, (title.strip(), author.strip(), isbn.strip(), category_id, department_id, total_copies, total_copies))
    new_id = cursor.lastrowid

    # Record QR code
    cursor.execute("INSERT INTO qr_codes (book_id, qr_value) VALUES (?, ?)", (new_id, isbn.strip()))

    conn.commit()
    conn.close()
    return new_id

def update_book(book_id, title, author, isbn, category_id, department_id, new_total_copies):
    conn = get_db_connection()
    book = conn.execute("SELECT * FROM books WHERE id = ?", (book_id,)).fetchone()
    if not book:
        conn.close()
        return False, "Book not found."

    issued_copies = book['total_copies'] - book['available_copies']
    new_total = int(new_total_copies)

    if new_total < issued_copies:
        conn.close()
        return False, f"Copies cannot be less than currently issued copies (Currently issued: {issued_copies})."

    # New available copies calculation
    new_available = new_total - issued_copies

    conn.execute("""
        UPDATE books
        SET title = ?, author = ?, isbn = ?, category_id = ?, department_id = ?,
            total_copies = ?, available_copies = ?, updated_at = datetime('now')
        WHERE id = ?
    """, (title.strip(), author.strip(), isbn.strip(), category_id, department_id, new_total, new_available, book_id))
    conn.commit()
    conn.close()
    return True, "Book updated successfully."

def add_book_copies(book_id, count=1):
    count = max(1, int(count))
    conn = get_db_connection()
    conn.execute("""
        UPDATE books
        SET total_copies = total_copies + ?,
            available_copies = available_copies + ?,
            updated_at = datetime('now')
        WHERE id = ?
    """, (count, count, book_id))
    conn.commit()
    conn.close()
    return True

def delete_book(book_id):
    conn = get_db_connection()
    book = conn.execute("SELECT * FROM books WHERE id = ?", (book_id,)).fetchone()
    if not book:
        conn.close()
        return False, "Book not found."

    issued_copies = book['total_copies'] - book['available_copies']
    if issued_copies > 0:
        conn.close()
        return False, f"Cannot delete book. {issued_copies} copies are currently on loan."

    conn.execute("DELETE FROM books WHERE id = ?", (book_id,))
    conn.commit()
    conn.close()
    return True, "Book deleted successfully."

def get_books_by_department(department_id):
    conn = get_db_connection()
    books = conn.execute("""
        SELECT b.*, c.name AS category_name,
               (b.total_copies - b.available_copies) AS issued_copies
        FROM books b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.department_id = ?
        ORDER BY b.title ASC
    """, (department_id,)).fetchall()
    conn.close()
    return books
