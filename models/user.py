from werkzeug.security import generate_password_hash, check_password_hash
from .db import get_db_connection

def get_user_by_id(user_id):
    conn = get_db_connection()
    user = conn.execute("""
        SELECT u.*, d.name AS department_name, d.code AS department_code
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.id = ?
    """, (user_id,)).fetchone()
    conn.close()
    return user

def get_user_by_identifier(identifier):
    """Finds user by email or student_id/username."""
    if not identifier:
        return None
    ident = identifier.strip().lower()
    conn = get_db_connection()
    user = conn.execute("""
        SELECT u.*, d.name AS department_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE LOWER(u.email) = ? OR LOWER(u.student_id) = ?
    """, (ident, ident)).fetchone()
    conn.close()
    return user

def verify_user_password(user, password):
    if not user or not user['password_hash']:
        return False
    return check_password_hash(user['password_hash'], password)

def create_user(full_name, student_id, email, mobile, department_id, password, role='user', status='active'):
    """Hashes password and inserts user."""
    pwd_hash = generate_password_hash(password)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO users (full_name, student_id, email, mobile, department_id, password_hash, role, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (full_name, student_id, email, mobile, department_id, pwd_hash, role, status))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id

def check_email_exists(email, exclude_id=None):
    conn = get_db_connection()
    if exclude_id:
        row = conn.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?", (email, exclude_id)).fetchone()
    else:
        row = conn.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (email,)).fetchone()
    conn.close()
    return row is not None

def check_student_id_exists(student_id, exclude_id=None):
    if not student_id:
        return False
    conn = get_db_connection()
    if exclude_id:
        row = conn.execute("SELECT id FROM users WHERE LOWER(student_id) = LOWER(?) AND id != ?", (student_id, exclude_id)).fetchone()
    else:
        row = conn.execute("SELECT id FROM users WHERE LOWER(student_id) = LOWER(?)", (student_id,)).fetchone()
    conn.close()
    return row is not None

def update_user_status(user_id, new_status):
    """Sets status to 'active' or 'blocked'."""
    conn = get_db_connection()
    conn.execute("UPDATE users SET status = ? WHERE id = ?", (new_status, user_id))
    conn.commit()
    conn.close()

def update_user_profile(user_id, full_name, mobile, department_id):
    conn = get_db_connection()
    conn.execute("""
        UPDATE users SET full_name = ?, mobile = ?, department_id = ?
        WHERE id = ?
    """, (full_name, mobile, department_id, user_id))
    conn.commit()
    conn.close()

def get_all_users(search=None, role=None, status=None, department_id=None):
    conn = get_db_connection()
    query = """
        SELECT u.*, d.name AS department_name,
               (SELECT COUNT(*) FROM transactions t WHERE t.user_id = u.id AND t.status = 'issued') AS active_loans_count
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE 1=1
    """
    params = []

    if role:
        query += " AND u.role = ?"
        params.append(role)
    if status:
        query += " AND u.status = ?"
        params.append(status)
    if department_id:
        query += " AND u.department_id = ?"
        params.append(department_id)
    if search:
        s = f"%{search.strip().lower()}%"
        query += " AND (LOWER(u.full_name) LIKE ? OR LOWER(u.student_id) LIKE ? OR LOWER(u.email) LIKE ? OR u.mobile LIKE ?)"
        params.extend([s, s, s, s])

    query += " ORDER BY u.created_at DESC"
    users = conn.execute(query, params).fetchall()
    conn.close()
    return users
