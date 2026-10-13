from .db import get_db_connection

def get_all_departments():
    conn = get_db_connection()
    depts = conn.execute("SELECT * FROM departments ORDER BY id ASC").fetchall()
    conn.close()
    return depts

def get_department_by_id(dept_id):
    conn = get_db_connection()
    dept = conn.execute("SELECT * FROM departments WHERE id = ?", (dept_id,)).fetchone()
    conn.close()
    return dept

def get_department_by_name(name):
    conn = get_db_connection()
    dept = conn.execute("SELECT * FROM departments WHERE LOWER(name) = LOWER(?)", (name.strip(),)).fetchone()
    conn.close()
    return dept

def get_department_stats():
    """Calculates live metrics for all departments."""
    conn = get_db_connection()
    query = """
        SELECT 
            d.id, d.name, d.code, d.description,
            COUNT(DISTINCT b.id) AS different_books,
            COALESCE(SUM(b.total_copies), 0) AS total_copies,
            COALESCE(SUM(b.available_copies), 0) AS available_copies,
            COALESCE(SUM(b.total_copies - b.available_copies), 0) AS issued_copies
        FROM departments d
        LEFT JOIN books b ON d.id = b.department_id
        GROUP BY d.id, d.name, d.code, d.description
        ORDER BY d.id ASC
    """
    stats = conn.execute(query).fetchall()
    conn.close()

    result = []
    # Map icons
    icons = {
        'Computer Engineering': '💻',
        'Electrical Engineering': '⚡',
        'Mechanical Engineering': '🔧',
        'Electronics & Telecommunication': '📡',
        'General': '📚'
    }
    badge_classes = {
        'Computer Engineering': 'badge-dept-computer',
        'Electrical Engineering': 'badge-dept-electrical',
        'Mechanical Engineering': 'badge-dept-mechanical',
        'Electronics & Telecommunication': 'badge-dept-electronics',
        'General': 'badge-dept-general'
    }

    for row in stats:
        d_dict = dict(row)
        tot = d_dict['total_copies']
        iss = d_dict['issued_copies']
        d_dict['icon'] = icons.get(d_dict['name'], '📚')
        d_dict['badge_class'] = badge_classes.get(d_dict['name'], 'badge-dept-general')
        d_dict['circulation_rate'] = round((iss / tot) * 100) if tot > 0 else 0
        result.append(d_dict)

    return result

def get_all_categories():
    conn = get_db_connection()
    cats = conn.execute("SELECT * FROM categories ORDER BY name ASC").fetchall()
    conn.close()
    return cats
