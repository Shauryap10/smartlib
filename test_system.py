import os
import unittest
from app import create_app
from models.db import init_db, get_db_connection
from models.user import get_user_by_identifier, verify_user_password, create_user
from models.book import get_all_books, find_book_by_qr, add_book_copies, create_book
from models.transaction import issue_book, return_book, get_all_transactions, calculate_fine

class SmartLibSystemTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()

    def test_01_database_and_seed_data(self):
        conn = get_db_connection()
        depts = conn.execute("SELECT COUNT(*) as c FROM departments").fetchone()['c']
        books = conn.execute("SELECT COUNT(*) as c FROM books").fetchone()['c']
        users = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()['c']
        conn.close()

        self.assertEqual(depts, 5, "Must have exactly 5 default departments")
        self.assertGreaterEqual(books, 10, "Default books should be seeded")
        self.assertGreaterEqual(users, 2, "Default users should be seeded")
        print(f"[OK] Test 1 Passed: Database initialized with {depts} departments, {books} books, {users} users.")

    def test_02_librarian_and_student_auth(self):
        # 1. Librarian Auth
        librarian = get_user_by_identifier("librarian")
        self.assertIsNotNone(librarian, "Librarian demo user must exist")
        self.assertEqual(librarian['role'], 'librarian')
        self.assertTrue(verify_user_password(librarian, "librarian123"), "Librarian password must verify correctly")
        self.assertFalse(verify_user_password(librarian, "wrongpass"), "Wrong password must fail")

        # 2. Student Auth
        student = get_user_by_identifier("student@smartlib.edu")
        self.assertIsNotNone(student, "Student demo user must exist")
        self.assertEqual(student['role'], 'user')
        self.assertTrue(verify_user_password(student, "student123"), "Student password must verify correctly")
        print("[OK] Test 2 Passed: Role detection & password hashing verified.")

    def test_03_student_registration(self):
        res = self.client.post('/register', data={
            'full_name': 'New Student Test',
            'student_id': 'STU-999',
            'email': 'newstudent@smartlib.edu',
            'mobile': '+91 99999 88888',
            'department_id': 1,
            'password': 'password123',
            'confirm_password': 'password123'
        }, follow_redirects=True)
        self.assertEqual(res.status_code, 200)

        # Check DB
        user = get_user_by_identifier('newstudent@smartlib.edu')
        self.assertIsNotNone(user)
        self.assertEqual(user['role'], 'user')
        self.assertEqual(user['status'], 'active')
        self.assertTrue(verify_user_password(user, 'password123'))
        print("[OK] Test 3 Passed: Student registration with hashing and default role 'user' verified.")

    def test_04_role_based_access_control(self):
        # 1. Anonymous accessing admin dashboard should redirect to login
        res = self.client.get('/admin/dashboard', follow_redirects=False)
        self.assertEqual(res.status_code, 302)
        self.assertIn('/login', res.headers['Location'])

        # 2. Login as student
        with self.client.session_transaction() as sess:
            sess['user_id'] = 2
            sess['role'] = 'user'
            sess['user_name'] = 'Aarav Sharma'

        # Student trying to access /admin/dashboard must be rejected
        res = self.client.get('/admin/dashboard', follow_redirects=True)
        self.assertEqual(res.status_code, 200)
        # Should be redirected to student dashboard
        self.assertIn(b"My Dashboard", res.data)

        # 3. Login as librarian
        with self.client.session_transaction() as sess:
            sess['user_id'] = 1
            sess['role'] = 'librarian'
            sess['user_name'] = 'Chief Librarian'

        res = self.client.get('/admin/dashboard')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"Librarian Dashboard", res.data)
        print("[OK] Test 4 Passed: RBAC protection strictly blocks students from admin routes.")

    def test_05_qr_scanning_and_normalization(self):
        # 1. Raw ISBN
        book1, parsed1 = find_book_by_qr("9780132350884")
        self.assertIsNotNone(book1)
        self.assertEqual(book1['isbn'], "9780132350884")
        self.assertIn("Clean Code", book1['title'])

        # 2. ISBN: prefix
        book2, parsed2 = find_book_by_qr("ISBN: 9781593279288")
        self.assertIsNotNone(book2)
        self.assertIn("Python Crash Course", book2['title'])

        # 3. BOOK-ID: prefix
        book3, parsed3 = find_book_by_qr("BOOK-ID: 4")
        self.assertIsNotNone(book3)
        self.assertEqual(book3['id'], 4)

        # 4. Unregistered ISBN
        book4, parsed4 = find_book_by_qr("9781234567890")
        self.assertIsNone(book4)
        self.assertEqual(parsed4['isbn'], "9781234567890")
        print("[OK] Test 5 Passed: QR normalization and multi-format lookup verified.")

    def test_06_add_copies_and_duplicate_protection(self):
        book = find_book_by_qr("9780132350884")[0]
        initial_copies = book['total_copies']

        # Add 2 copies
        add_book_copies(book['id'], 2)
        conn = get_db_connection()
        updated = conn.execute("SELECT total_copies FROM books WHERE id = ?", (book['id'],)).fetchone()
        conn.close()
        self.assertEqual(updated['total_copies'], initial_copies + 2)

        # Attempt to add duplicate ISBN via API
        with self.client.session_transaction() as sess:
            sess['user_id'] = 1
            sess['role'] = 'librarian'

        res = self.client.post('/api/books/add', json={
            'title': 'Duplicate Clean Code',
            'author': 'Robert C. Martin',
            'isbn': '9780132350884',
            'category_id': 1,
            'department_id': 1,
            'total_copies': 1
        })
        self.assertEqual(res.status_code, 400)
        self.assertTrue(res.json['is_duplicate'])
        print("[OK] Test 6 Passed: Copy increment and duplicate ISBN protection verified.")

    def test_07_issue_and_return_lifecycle(self):
        # Clean Code book id = 1, student id = 2
        conn = get_db_connection()
        b_before = conn.execute("SELECT available_copies FROM books WHERE id = 1").fetchone()['available_copies']
        conn.close()

        # Issue
        ok, tx_id = issue_book(1, 2)
        self.assertTrue(ok)

        conn = get_db_connection()
        b_after = conn.execute("SELECT available_copies FROM books WHERE id = 1").fetchone()['available_copies']
        conn.close()
        self.assertEqual(b_after, b_before - 1)

        # Return
        ok_ret, result = return_book(tx_id)
        self.assertTrue(ok_ret)

        conn = get_db_connection()
        b_final = conn.execute("SELECT available_copies FROM books WHERE id = 1").fetchone()['available_copies']
        tx_row = conn.execute("SELECT status, return_date FROM transactions WHERE id = ?", (tx_id,)).fetchone()
        conn.close()

        self.assertEqual(b_final, b_before)
        self.assertEqual(tx_row['status'], 'returned')
        self.assertIsNotNone(tx_row['return_date'])
        print("[OK] Test 7 Passed: Loan issue/return lifecycle & stock counts verified.")

    def test_08_fine_calculation(self):
        # 10 days overdue at default 5/day = 50.0
        from datetime import datetime, timedelta
        due_str = (datetime.now() - timedelta(days=10)).strftime("%Y-%m-%d")
        fine, days = calculate_fine(due_str, fine_rate=5.0)
        self.assertEqual(days, 10)
        self.assertEqual(fine, 50.0)
        print("[OK] Test 8 Passed: Fine calculation verified (Rs 50 for 10 overdue days).")

if __name__ == '__main__':
    unittest.main()
