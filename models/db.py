import sqlite3
import os
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
from config import Config

def get_db_connection():
    """Returns a SQLite connection configured with Row factory and Foreign Keys enabled."""
    conn = sqlite3.connect(Config.DATABASE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Initializes tables and seeds default data idempotently."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Departments Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        code TEXT UNIQUE NOT NULL,
        description TEXT
    );
    """)

    # 2. Categories Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
    );
    """)

    # 3. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        student_id TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        mobile TEXT,
        department_id INTEGER,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    );
    """)

    # 4. Books Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT UNIQUE NOT NULL,
        category_id INTEGER,
        department_id INTEGER,
        total_copies INTEGER NOT NULL DEFAULT 1,
        available_copies INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT
    );
    """)

    # 5. Transactions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        issue_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        return_date TEXT,
        status TEXT NOT NULL DEFAULT 'issued',
        fine_amount REAL DEFAULT 0.0,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 6. QR Codes Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS qr_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        qr_value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
    """)

    # 7. Activity Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    """)

    conn.commit()

    # --- SEED DEFAULT DATA IF EMPTY ---
    # Seed Departments
    default_depts = [
        ("Computer Engineering", "COMP", "Computing systems, software architecture & data science"),
        ("Electrical Engineering", "ELEC", "Power distribution, circuit analysis & electrical machinery"),
        ("Mechanical Engineering", "MECH", "Thermodynamics, fluid mechanics & structural dynamics"),
        ("Electronics & Telecommunication", "ENTC", "Microprocessors, VLSI & digital signal communication"),
        ("General", "GEN", "General literature, humanities, self-improvement & foundational texts")
    ]
    for name, code, desc in default_depts:
        cursor.execute("SELECT id FROM departments WHERE name = ?", (name,))
        if not cursor.fetchone():
            cursor.execute("INSERT INTO departments (name, code, description) VALUES (?, ?, ?)", (name, code, desc))

    # Seed Categories
    default_cats = ["Technology", "Engineering", "Mechanical", "Electronics", "Fiction", "Self Help", "Biography", "Mathematics", "Science"]
    for cat in default_cats:
        cursor.execute("SELECT id FROM categories WHERE name = ?", (cat,))
        if not cursor.fetchone():
            cursor.execute("INSERT INTO categories (name) VALUES (?)", (cat,))

    conn.commit()

    # Helper to resolve Dept ID and Cat ID
    def get_dept_id(dname):
        cursor.execute("SELECT id FROM departments WHERE name = ?", (dname,))
        r = cursor.fetchone()
        return r['id'] if r else 1

    def get_cat_id(cname):
        cursor.execute("SELECT id FROM categories WHERE name = ?", (cname,))
        r = cursor.fetchone()
        return r['id'] if r else 1

    # Seed Librarian Account
    cursor.execute("SELECT id FROM users WHERE email = ? OR student_id = ?", ("librarian@smartlib.edu", "librarian"))
    if not cursor.fetchone():
        admin_pass = generate_password_hash("librarian123")
        cursor.execute("""
            INSERT INTO users (full_name, student_id, email, mobile, department_id, password_hash, role, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "Chief Librarian",
            "librarian",
            "librarian@smartlib.edu",
            "+91 98000 11223",
            get_dept_id("General"),
            admin_pass,
            "librarian",
            "active"
        ))

    # Seed Demo Student Accounts
    demo_students = [
        ("Aarav Sharma", "STU-101", "student@smartlib.edu", "+91 98765 43210", "Computer Engineering", "student123"),
        ("Priya Patel", "STU-102", "priya@smartlib.edu", "+91 98234 56789", "Electrical Engineering", "student123"),
        ("Rohan Kulkarni", "STU-103", "rohan@smartlib.edu", "+91 99887 76655", "Mechanical Engineering", "student123"),
        ("Ananya Iyer", "STU-104", "ananya@smartlib.edu", "+91 97654 32109", "Electronics & Telecommunication", "student123")
    ]
    for s_name, s_id, s_email, s_phone, s_dept, s_pwd in demo_students:
        cursor.execute("SELECT id FROM users WHERE email = ? OR student_id = ?", (s_email, s_id))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO users (full_name, student_id, email, mobile, department_id, password_hash, role, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                s_name,
                s_id,
                s_email,
                s_phone,
                get_dept_id(s_dept),
                generate_password_hash(s_pwd),
                "user",
                "active"
            ))

    # Seed Default Books (Preserving all original SmartLib books)
    sample_books = [
        ("Clean Code: A Handbook of Agile Software Craftsmanship", "Robert C. Martin", "9780132350884", "Technology", "Computer Engineering", 3, 2),
        ("Python Crash Course: A Hands-On Project-Based Guide", "Eric Matthes", "9781593279288", "Technology", "Computer Engineering", 4, 4),
        ("Data Structures & Algorithms in Java", "Robert Lafore", "9780672324536", "Technology", "Computer Engineering", 3, 3),
        ("Electric Machinery Fundamentals", "Stephen J. Chapman", "9780073529547", "Engineering", "Electrical Engineering", 3, 2),
        ("Power System Analysis and Design", "J. Duncan Glover", "9781305632134", "Engineering", "Electrical Engineering", 2, 2),
        ("Fundamentals of Thermodynamics", "Claus Borgnakke & Richard Sonntag", "9781118131992", "Mechanical", "Mechanical Engineering", 4, 3),
        ("Engineering Mechanics: Dynamics", "J.L. Meriam & L.G. Kraige", "9781119022534", "Mechanical", "Mechanical Engineering", 2, 2),
        ("Digital Design & Computer Architecture", "David Harris & Sarah Harris", "9780123944245", "Electronics", "Electronics & Telecommunication", 3, 3),
        ("Electronic Communication Systems", "George Kennedy & Bernard Davis", "9780074636824", "Electronics", "Electronics & Telecommunication", 2, 2),
        ("The Alchemist", "Paulo Coelho", "9780062315007", "Fiction", "General", 4, 4),
        ("Atomic Habits", "James Clear", "9780735211292", "Self Help", "General", 5, 5),
        ("Wings of Fire: An Autobiography", "A.P.J. Abdul Kalam", "9788173711466", "Biography", "General", 3, 3)
    ]

    for title, author, isbn, cat_name, dept_name, total_copies, avail_copies in sample_books:
        cursor.execute("SELECT id FROM books WHERE isbn = ?", (isbn,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO books (title, author, isbn, category_id, department_id, total_copies, available_copies)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                title,
                author,
                isbn,
                get_cat_id(cat_name),
                get_dept_id(dept_name),
                total_copies,
                avail_copies
            ))

    conn.commit()

    # Seed Sample Transactions if empty
    cursor.execute("SELECT COUNT(*) as count FROM transactions")
    tx_count = cursor.fetchone()['count']
    if tx_count == 0:
        cursor.execute("SELECT id FROM users WHERE email = 'student@smartlib.edu'")
        u1 = cursor.fetchone()
        cursor.execute("SELECT id FROM users WHERE email = 'priya@smartlib.edu'")
        u2 = cursor.fetchone()
        cursor.execute("SELECT id FROM users WHERE email = 'rohan@smartlib.edu'")
        u3 = cursor.fetchone()

        cursor.execute("SELECT id FROM books WHERE isbn = '9780132350884'") # Clean Code
        b1 = cursor.fetchone()
        cursor.execute("SELECT id FROM books WHERE isbn = '9780073529547'") # Electric Machinery
        b2 = cursor.fetchone()
        cursor.execute("SELECT id FROM books WHERE isbn = '9781118131992'") # Thermodynamics
        b3 = cursor.fetchone()
        cursor.execute("SELECT id FROM books WHERE isbn = '9780062315007'") # The Alchemist
        b4 = cursor.fetchone()

        today = datetime.now()
        # Overdue transaction for student 1 (issued 20 days ago, due 6 days ago)
        date_issued_1 = (today - timedelta(days=20)).strftime("%Y-%m-%d")
        date_due_1 = (today - timedelta(days=6)).strftime("%Y-%m-%d")

        # Active current transaction (issued 5 days ago, due in 9 days)
        date_issued_2 = (today - timedelta(days=5)).strftime("%Y-%m-%d")
        date_due_2 = (today + timedelta(days=9)).strftime("%Y-%m-%d")

        # Returned transaction
        date_issued_3 = (today - timedelta(days=30)).strftime("%Y-%m-%d")
        date_due_3 = (today - timedelta(days=16)).strftime("%Y-%m-%d")
        date_return_3 = (today - timedelta(days=18)).strftime("%Y-%m-%d")

        if u1 and b1:
            cursor.execute("""
                INSERT INTO transactions (book_id, user_id, issue_date, due_date, return_date, status, fine_amount)
                VALUES (?, ?, ?, ?, NULL, 'issued', 0.0)
            """, (b1['id'], u1['id'], date_issued_1, date_due_1))

        if u2 and b2:
            cursor.execute("""
                INSERT INTO transactions (book_id, user_id, issue_date, due_date, return_date, status, fine_amount)
                VALUES (?, ?, ?, ?, NULL, 'issued', 0.0)
            """, (b2['id'], u2['id'], date_issued_2, date_due_2))

        if u3 and b3:
            # Overdue transaction
            cursor.execute("""
                INSERT INTO transactions (book_id, user_id, issue_date, due_date, return_date, status, fine_amount)
                VALUES (?, ?, ?, ?, NULL, 'issued', 0.0)
            """, (b3['id'], u3['id'], date_issued_1, date_due_1))

        if u1 and b4:
            cursor.execute("""
                INSERT INTO transactions (book_id, user_id, issue_date, due_date, return_date, status, fine_amount)
                VALUES (?, ?, ?, ?, ?, 'returned', 0.0)
            """, (b4['id'], u1['id'], date_issued_3, date_due_3, date_return_3))

        conn.commit()

    conn.close()

def log_activity(user_id, action, description):
    """Utility to record administrative or system actions."""
    try:
        conn = get_db_connection()
        conn.execute("INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)",
                     (user_id, action, description))
        conn.commit()
        conn.close()
    except Exception as e:
        print("Activity log error:", e)
