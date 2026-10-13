# SmartLib – Smart Library Management System (Role-Based & Database-Backed)

SmartLib 2.0 is a complete, role-based Library Management System built with a **Python Flask** backend, **SQLite** database, and a modern, responsive frontend with **browser-based QR Scanning** and **Department-Wise Book Compartments**.

---

## 🚀 Key Features

### 1. Role-Based Access Control (RBAC)
* **Two Distinct Roles**:
  * **Librarian / Admin**: Full library control, inventory management, user blocking/unblocking, book issue/return, fine calculations, audit reports, and QR camera scanning.
  * **Student / User**: Personalized dashboard, active book loan tracking, return history, catalog search & filtering, QR book lookup, and personal profile.
* **Security**:
  * Session-based authentication with `Werkzeug` secure password hashing (`generate_password_hash` & `check_password_hash`).
  * Backend route protections (`@login_required`, `@role_required('librarian')`).
  * Direct URL access prevention: Students cannot access admin routes or APIs.

### 2. Relational Database Architecture (SQLite)
* Replaces previous localStorage-only storage with a structured SQLite database (`database.db`).
* **7 Normalized Tables**:
  * `users`: Patrons and librarians with credentials, roles, and status.
  * `departments`: 5 academic engineering branches (`Computer Engineering`, `Electrical Engineering`, `Mechanical Engineering`, `Electronics & Telecommunication`, `General`).
  * `categories`: Genre/subject taxonomy.
  * `books`: Catalog titles with unique ISBN, department allocations, and live copy counts.
  * `transactions`: Loan lifecycle (`issued`, `returned`, `overdue`) with live fine calculations.
  * `qr_codes`: QR associations per catalog entry.
  * `activity_logs`: Administrative audit trail.

### 3. QR Book Scanner (`html5-qrcode`)
* Real-time camera scanner supporting desktop webcams, mobile phone cameras, and mobile rear cameras (`facingMode: "environment"`).
* Intelligent QR Normalization:
  * Accepts raw ISBNs (e.g. `9780132350884`).
  * Strips prefixes (e.g. `ISBN: 9780132350884`, `BOOK-ID: 4`, `ID: 4`).
* **Librarian Flow**:
  * Existing book &rarr; Displays "Book Found" card with live stock and 1-click **[+ Add 1 Copy]** or **[Add Multiple Copies]**.
  * New book &rarr; Displays "New Book Detected" and automatically opens the Add Book form with the scanned ISBN pre-filled.
* **Student Flow**:
  * Scans any physical shelf QR code to check availability and copies in stock.
* **Manual ISBN Fallback**: Manual input form allows instant lookups without camera permissions.

### 4. Department-Wise Book Compartments
* 5 Academic Departments:
  * 💻 Computer Engineering (`COMP`)
  * ⚡ Electrical Engineering (`ELEC`)
  * 🔧 Mechanical Engineering (`MECH`)
  * 📡 Electronics & Telecommunication (`ENTC`)
  * 📚 General (`GEN`)
* Summary cards with live copy counts and distinct title metrics.
* Visual shelf compartments showcasing actual books stored dynamically in the database.

### 5. Circulation & Fine Management
* **Issue Book**: Checks patron active status (blocked patrons cannot borrow) and stock availability. Auto-decrements available copies.
* **Return Book**: Automatically increments available copies and calculates overdue fines (configurable at ₹5/day past the 14-day loan window).

---

## 🔑 Demo Login Credentials

For testing and development, the database is pre-seeded with the following accounts:

| Role | Username / Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Librarian / Admin** | `librarian` *(or `librarian@smartlib.edu`)* | `librarian123` | Full Library Administration |
| **Student (Demo 1)** | `student@smartlib.edu` *(or `STU-101`)* | `student123` | Student Dashboard & Catalog |
| **Student (Demo 2)** | `priya@smartlib.edu` *(or `STU-102`)* | `student123` | Student Dashboard & Catalog |

> **Note**: Passwords are saved in `database.db` as PBKDF2/SHA256 hashes, never in plain text.

---

## 📁 Project Structure

```
smartlib/
├── app.py                      # Flask Application Factory & Blueprints
├── config.py                   # App Configuration, Database Path, Fines
├── database.db                 # SQLite Relational Database (Auto-created)
├── requirements.txt            # Python Dependencies
├── README.md                   # Project Documentation
│
├── models/
│   ├── __init__.py
│   ├── db.py                   # DB Connection, Schema Setup & Data Seeder
│   ├── user.py                 # User Auth, Hashing, Profiles, Block/Unblock
│   ├── book.py                 # Books CRUD, QR Normalization, Copies
│   ├── department.py           # Departments & Dynamic Metrics
│   └── transaction.py          # Issue, Return, Fine Calculations & KPIs
│
├── routes/
│   ├── __init__.py             # Auth & Role Decorators
│   ├── auth.py                 # Login, Student Registration, Logout
│   ├── user.py                 # Student Dashboard, Browse, QR Lookup
│   ├── admin.py                # Admin Dashboard, User Management, Reports
│   ├── books.py                # Admin Books, Departments, QR Scanner, APIs
│   └── transactions.py         # Circulation Desk, Issue/Return APIs
│
├── templates/
│   ├── base.html               # Role-Adaptive Layout & Dark Sidebar
│   ├── login.html              # Library-Themed Login & Autofill Demo
│   ├── register.html           # Student Registration Form
│   ├── librarian_dashboard.html# Admin Analytics & Quick Actions
│   ├── user_dashboard.html     # Student Loans, Due Soon & History
│   ├── books.html              # Admin Catalog & Add/Edit Modals
│   ├── user_books.html         # Student Catalog (Read-Only)
│   ├── departments.html        # 5 Department Shelf Compartments
│   ├── users.html              # Patron List, Loans & Block/Unblock
│   ├── transactions.html       # Loan Lifecycle & Return Desk
│   ├── reports.html            # Department Audits & Overdue Tracking
│   ├── scan_qr.html            # Admin QR Scanner Engine
│   ├── user_scan_qr.html       # Student QR Availability Scanner
│   ├── user_profile.html       # Student Profile Card
│   └── errors/
│       ├── 403.html            # Restricted Area
│       ├── 404.html            # Page Not Found
│       └── 500.html            # Server Error
│
└── static/
    ├── css/
    │   └── style.css           # Design System & Responsive Layout
    └── js/
        ├── app.js              # Toasts, Modals, Mobile Sidebar
        └── qr-scanner.js       # HTML5-QRCode Wrapper & Normalizer
```

---

## 🛠️ How to Run the Application

### 1. Requirements
Ensure Python 3.8+ is available on your machine. Install dependencies if needed:
```bash
pip install -r requirements.txt
```

### 2. Start the Server
Run the Flask server:
```bash
python app.py
```

Upon first startup, SmartLib automatically:
1. Creates all tables in `database.db`.
2. Seeds default departments and categories.
3. Inserts the demo librarian and student accounts.
4. Populates sample books across all 5 engineering departments.

### 3. Open in Browser
Visit in your web browser:
```
http://127.0.0.1:5000
```
or
```
http://localhost:5000
```

---

## 📱 Testing QR Scanning

1. Log in as **Librarian** (`librarian` / `librarian123`) or **Student** (`student@smartlib.edu` / `student123`).
2. Navigate to **📷 Scan QR** in the sidebar.
3. Click **▶️ Start Scanner** to enable your webcam or phone camera.
4. Point your camera at any book QR code or barcode.
5. **Quick Demo Testing (Without Camera)**:
   - Click the built-in test buttons on the Scan QR page:
     - `9780132350884` &rarr; Finds *Clean Code* (Computer Engineering) with copy management.
     - `ISBN: 9781593279288` &rarr; Tests prefix normalization for *Python Crash Course*.
     - `BOOK-ID: 4` &rarr; Tests ID prefix resolution for *Electric Machinery Fundamentals*.
     - `9781234567890` &rarr; Triggers the "New Book Detected" flow and opens the registration modal.
6. **Manual Fallback**: Type any ISBN into the manual search bar and click **Search Book**.
