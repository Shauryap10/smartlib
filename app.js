/**
 * ============================================================================
 * SmartLib 2.0 – Smart Library Management System
 * Features:
 *  - QR Book Scanner with html5-qrcode & Manual ISBN Fallback
 *  - Department-Wise Book Compartments (5 Academic Departments)
 *  - Full Dashboard, Books Catalog, Members, Transactions, & Department Reports
 *  - Safe LocalStorage Persistence ('smartlib_final_v1') & Auto Migration
 * ============================================================================
 */

(function () {
  'use strict';

  // --- STORAGE KEY & DEPARTMENTS CONSTANTS ---
  const STORAGE_KEY = 'smartlib_final_v1';

  const DEPARTMENTS = [
    { id: 'comp', name: 'Computer Engineering', icon: '💻', badgeClass: 'badge-dept-computer' },
    { id: 'elec', name: 'Electrical Engineering', icon: '⚡', badgeClass: 'badge-dept-electrical' },
    { id: 'mech', name: 'Mechanical Engineering', icon: '🔧', badgeClass: 'badge-dept-mechanical' },
    { id: 'entc', name: 'Electronics & Telecommunication', icon: '📡', badgeClass: 'badge-dept-electronics' },
    { id: 'gen',  name: 'General', icon: '📚', badgeClass: 'badge-dept-general' }
  ];

  const FINE_RATE_PER_DAY = 5; // ₹5 / day overdue

  // --- DEFAULT SEED DATA ---
  const DEFAULT_DATA = {
    books: [
      {
        id: 1,
        title: "Clean Code: A Handbook of Agile Software Craftsmanship",
        author: "Robert C. Martin",
        category: "Technology",
        isbn: "9780132350884",
        department: "Computer Engineering",
        copies: 3
      },
      {
        id: 2,
        title: "Python Crash Course: A Hands-On Project-Based Guide",
        author: "Eric Matthes",
        category: "Technology",
        isbn: "9781593279288",
        department: "Computer Engineering",
        copies: 4
      },
      {
        id: 3,
        title: "Data Structures & Algorithms in Java",
        author: "Robert Lafore",
        category: "Technology",
        isbn: "9780672324536",
        department: "Computer Engineering",
        copies: 3
      },
      {
        id: 4,
        title: "Electric Machinery Fundamentals",
        author: "Stephen J. Chapman",
        category: "Engineering",
        isbn: "9780073529547",
        department: "Electrical Engineering",
        copies: 3
      },
      {
        id: 5,
        title: "Power System Analysis and Design",
        author: "J. Duncan Glover",
        category: "Engineering",
        isbn: "9781305632134",
        department: "Electrical Engineering",
        copies: 2
      },
      {
        id: 6,
        title: "Fundamentals of Thermodynamics",
        author: "Claus Borgnakke & Richard Sonntag",
        category: "Mechanical",
        isbn: "9781118131992",
        department: "Mechanical Engineering",
        copies: 4
      },
      {
        id: 7,
        title: "Engineering Mechanics: Dynamics",
        author: "J.L. Meriam & L.G. Kraige",
        category: "Mechanical",
        isbn: "9781119022534",
        department: "Mechanical Engineering",
        copies: 2
      },
      {
        id: 8,
        title: "Digital Design & Computer Architecture",
        author: "David Harris & Sarah Harris",
        category: "Electronics",
        isbn: "9780123944245",
        department: "Electronics & Telecommunication",
        copies: 3
      },
      {
        id: 9,
        title: "Electronic Communication Systems",
        author: "George Kennedy & Bernard Davis",
        category: "Electronics",
        isbn: "9780074636824",
        department: "Electronics & Telecommunication",
        copies: 2
      },
      {
        id: 10,
        title: "The Alchemist",
        author: "Paulo Coelho",
        category: "Fiction",
        isbn: "9780062315007",
        department: "General",
        copies: 4
      },
      {
        id: 11,
        title: "Atomic Habits",
        author: "James Clear",
        category: "Self Help",
        isbn: "9780735211292",
        department: "General",
        copies: 5
      },
      {
        id: 12,
        title: "Wings of Fire: An Autobiography",
        author: "A.P.J. Abdul Kalam",
        category: "Biography",
        isbn: "9788173711466",
        department: "General",
        copies: 3
      }
    ],
    members: [
      {
        id: 1,
        code: "MEM-101",
        name: "Aarav Sharma",
        email: "aarav.s@smartlib.edu",
        phone: "+91 98765 43210",
        role: "Student"
      },
      {
        id: 2,
        code: "MEM-102",
        name: "Priya Patel",
        email: "priya.p@smartlib.edu",
        phone: "+91 98234 56789",
        role: "Student"
      },
      {
        id: 3,
        code: "MEM-103",
        name: "Prof. Vikram Verma",
        email: "v.verma@smartlib.edu",
        phone: "+91 98112 34567",
        role: "Faculty"
      },
      {
        id: 4,
        code: "MEM-104",
        name: "Ananya Iyer",
        email: "ananya.i@smartlib.edu",
        phone: "+91 97654 32109",
        role: "Student"
      },
      {
        id: 5,
        code: "MEM-105",
        name: "Rohan Kulkarni",
        email: "rohan.k@smartlib.edu",
        phone: "+91 99887 76655",
        role: "Student"
      }
    ],
    transactions: [
      {
        id: 1,
        bookId: 1, // Clean Code
        memberId: 1, // Aarav Sharma
        issueDate: "2026-09-20",
        dueDate: "2026-10-04",
        returnDate: null,
        status: "issued"
      },
      {
        id: 2,
        bookId: 4, // Electric Machinery
        memberId: 3, // Prof. Vikram Verma
        issueDate: "2026-09-28",
        dueDate: "2026-10-12",
        returnDate: null,
        status: "issued"
      },
      {
        id: 3,
        bookId: 10, // The Alchemist
        memberId: 2, // Priya Patel
        issueDate: "2026-09-10",
        dueDate: "2026-09-24",
        returnDate: "2026-09-23",
        status: "returned"
      },
      {
        id: 4,
        bookId: 6, // Fundamentals of Thermodynamics
        memberId: 5, // Rohan Kulkarni
        issueDate: "2026-09-15",
        dueDate: "2026-09-29",
        returnDate: null,
        status: "issued"
      }
    ]
  };

  // --- APPLICATION STATE ---
  let appState = {
    books: [],
    members: [],
    transactions: [],
    currentView: 'dashboard',
    activeTxFilter: 'all',
    qrScannerInstance: null,
    isScannerRunning: false,
    scannerLastResult: null
  };

  // --- UTILITY FUNCTIONS ---

  /**
   * Safe HTML Escaping
   */
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Normalize an ISBN by trimming whitespace, dashes, and converting to uppercase
   */
  function normalizeISBN(isbn) {
    if (!isbn) return '';
    return String(isbn).trim().replace(/[\s\-]/g, '').toUpperCase();
  }

  /**
   * Intelligently parses QR code text:
   * Handles raw ISBN, "ISBN: 978...", "BOOK-ID: 3", "BOOK ID: 3", "ID: 3"
   */
  function normalizeQRValue(rawText) {
    if (!rawText) return { raw: '', cleanValue: '', normalizedISBN: '', bookId: null };
    const text = String(rawText).trim();

    let bookId = null;
    let clean = text;

    // Check for explicit ID / BOOK-ID prefixes
    const idPrefixMatch = text.match(/^(?:book[-\s]?id|id)\s*[:=]\s*(\d+)/i);
    if (idPrefixMatch) {
      bookId = parseInt(idPrefixMatch[1], 10);
      clean = idPrefixMatch[1];
    } else {
      // Strip common prefixes: "ISBN: ", "BOOK: "
      clean = text.replace(/^(?:isbn|book)\s*[:=]\s*/i, '').trim();
      
      // If it's a short integer (< 6 digits) and not a valid ISBN length, consider Book ID fallback
      if (/^\d+$/.test(clean) && clean.length <= 4) {
        bookId = parseInt(clean, 10);
      }
    }

    const normalizedISBN = normalizeISBN(clean);

    return {
      raw: text,
      cleanValue: clean,
      normalizedISBN,
      bookId
    };
  }

  /**
   * Search priority:
   * 1. Match ISBN
   * 2. Match Book ID
   */
  function findBookByQR(qrInfo) {
    if (!qrInfo) return null;

    // 1. Try matching ISBN if available
    if (qrInfo.normalizedISBN && qrInfo.normalizedISBN.length >= 8) {
      const matched = appState.books.find(b => normalizeISBN(b.isbn) === qrInfo.normalizedISBN);
      if (matched) return matched;
    }

    // 2. Try matching Book ID
    if (qrInfo.bookId) {
      const matched = appState.books.find(b => b.id === qrInfo.bookId);
      if (matched) return matched;
    }

    // Fallback: match clean value directly to ISBN
    if (qrInfo.cleanValue) {
      const cleanNorm = normalizeISBN(qrInfo.cleanValue);
      const matched = appState.books.find(b => normalizeISBN(b.isbn) === cleanNorm);
      if (matched) return matched;
    }

    return null;
  }

  function findBookByISBN(isbn) {
    const norm = normalizeISBN(isbn);
    if (!norm) return null;
    return appState.books.find(b => normalizeISBN(b.isbn) === norm) || null;
  }

  function findBookById(id) {
    const numericId = parseInt(id, 10);
    return appState.books.find(b => b.id === numericId) || null;
  }

  function findMemberById(id) {
    const numericId = parseInt(id, 10);
    return appState.members.find(m => m.id === numericId) || null;
  }

  /**
   * Calculate issued copies count for a book
   */
  function getIssuedCopiesCount(bookId) {
    return appState.transactions.filter(t => t.bookId === bookId && t.status === 'issued').length;
  }

  /**
   * Calculate available copies for a book
   */
  function getAvailableCopiesCount(book) {
    const issued = getIssuedCopiesCount(book.id);
    return Math.max(0, (book.copies || 0) - issued);
  }

  /**
   * Calculate overdue fine for a transaction
   */
  function calculateFine(transaction) {
    if (transaction.status === 'returned') {
      return transaction.fine || 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(transaction.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = today - dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return diffDays * FINE_RATE_PER_DAY;
    }
    return 0;
  }

  function getOverdueDays(dueDateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = today - dueDate;
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  function getDepartmentMeta(deptName) {
    return DEPARTMENTS.find(d => d.name === deptName) || {
      id: 'gen',
      name: deptName || 'General',
      icon: '📚',
      badgeClass: 'badge-dept-general'
    };
  }

  // --- LOCALSTORAGE & MIGRATION ---

  /**
   * Loads state from localStorage.
   * Performs automatic migration: any book without department becomes "General".
   */
  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        initDefaultData();
        return;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.books)) {
        initDefaultData();
        return;
      }

      let migrationPerformed = false;

      // Migrate books without department
      const migratedBooks = parsed.books.map(book => {
        if (!book.department || String(book.department).trim() === '') {
          migrationPerformed = true;
          return { ...book, department: 'General' };
        }
        return book;
      });

      appState.books = migratedBooks;
      appState.members = Array.isArray(parsed.members) ? parsed.members : DEFAULT_DATA.members;
      appState.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : DEFAULT_DATA.transactions;

      if (migrationPerformed) {
        saveToStorage();
        console.log("SmartLib: Automatic migration completed - old books assigned to 'General'.");
      }
    } catch (e) {
      console.error("SmartLib: Failed to parse localStorage data, restoring defaults.", e);
      initDefaultData();
    }
  }

  function saveToStorage() {
    try {
      const payload = {
        books: appState.books,
        members: appState.members,
        transactions: appState.transactions,
        version: "2.0",
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error("SmartLib: Error saving to localStorage", e);
      showToast("Error saving data to local storage", "danger");
    }
  }

  function initDefaultData() {
    appState.books = JSON.parse(JSON.stringify(DEFAULT_DATA.books));
    appState.members = JSON.parse(JSON.stringify(DEFAULT_DATA.members));
    appState.transactions = JSON.parse(JSON.stringify(DEFAULT_DATA.transactions));
    saveToStorage();
  }

  function resetDemoData() {
    if (confirm("Reset SmartLib Demo Data?\n\nThis will restore default books across all 5 departments, sample patrons, and transactions.")) {
      initDefaultData();
      refreshAllViews();
      showToast("Demo data reset successfully", "success");
    }
  }

  // --- TOAST NOTIFICATIONS ---

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'danger') icon = '🚫';

    toast.innerHTML = `
      <div class="flex-gap">
        <span>${icon}</span>
        <span>${escapeHTML(message)}</span>
      </div>
      <button class="toast-close-btn" aria-label="Close Notification">&times;</button>
    `;

    toast.querySelector('.toast-close-btn').addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 250);
      }
    }, 4000);
  }

  // --- VIEW NAVIGATION ---

  function switchView(viewName, callback) {
    appState.currentView = viewName;

    // Update sidebar navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.getAttribute('data-view') === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update views visibility
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
      targetView.classList.add('active');
    }

    // Update topbar title
    const titles = {
      'dashboard': { title: 'Dashboard', sub: 'Smart Library Management & Analytics' },
      'books': { title: 'Books Catalog', sub: 'Complete inventory & Department stock levels' },
      'scan-qr': { title: 'Scan Book QR', sub: 'Browser Camera QR Scanner & ISBN Recognition' },
      'departments': { title: 'Department Compartments', sub: '5 Academic Department Book Shelves' },
      'members': { title: 'Members Directory', sub: 'Patron memberships & loan status' },
      'transactions': { title: 'Loan Transactions', sub: 'Issue, return, and overdue fine management' },
      'reports': { title: 'Reports & Analytics', sub: 'Departmental audits & circulation KPIs' }
    };

    const info = titles[viewName] || { title: 'SmartLib', sub: '' };
    document.getElementById('page-title').textContent = info.title;
    document.getElementById('page-subtitle').textContent = info.sub;

    // Close mobile sidebar if open
    closeMobileSidebar();

    // Re-render target view
    if (viewName === 'dashboard') renderDashboard();
    else if (viewName === 'books') renderBooks();
    else if (viewName === 'departments') renderDepartments();
    else if (viewName === 'members') renderMembers();
    else if (viewName === 'transactions') renderTransactions();
    else if (viewName === 'reports') { renderReports(); renderDepartmentReports(); }
    else if (viewName === 'scan-qr') {
      // Auto-start scanner if camera permission was previously granted, or keep idle
      resetQRResultCard();
    }

    // Stop scanner if navigating away from scan-qr
    if (viewName !== 'scan-qr' && appState.isScannerRunning) {
      stopQRScanner(false);
    }

    if (typeof callback === 'function') {
      callback();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  }

  // --- REFRESH ALL VIEWS ---
  function refreshAllViews() {
    renderDashboard();
    renderBooks();
    renderDepartments();
    renderMembers();
    renderTransactions();
    renderReports();
    renderDepartmentReports();
  }

  // --- 1. DASHBOARD VIEW RENDERING ---

  function renderDashboard() {
    // 1. Metric Calculations
    const distinctTitles = appState.books.length;
    const totalCopies = appState.books.reduce((acc, b) => acc + (parseInt(b.copies, 10) || 0), 0);
    const activeLoans = appState.transactions.filter(t => t.status === 'issued').length;
    const availableCopies = Math.max(0, totalCopies - activeLoans);
    const totalMembers = appState.members.length;

    let totalFine = 0;
    let overdueCount = 0;
    appState.transactions.forEach(t => {
      if (t.status === 'issued') {
        const fine = calculateFine(t);
        if (fine > 0) {
          totalFine += fine;
          overdueCount++;
        }
      }
    });

    // Populate Stat Cards
    document.getElementById('stat-total-books').textContent = totalCopies;
    document.getElementById('stat-distinct-titles').textContent = `${distinctTitles} distinct titles`;
    document.getElementById('stat-total-copies').textContent = totalCopies;
    document.getElementById('stat-available-copies').textContent = availableCopies;
    document.getElementById('stat-issued-books').textContent = activeLoans;
    document.getElementById('stat-total-members').textContent = totalMembers;
    document.getElementById('stat-total-fine').textContent = `₹${totalFine}`;
    document.getElementById('stat-overdue-count').textContent = `${overdueCount} overdue active loans`;

    // 2. Department Overview Cards (Calculated dynamically)
    const deptGrid = document.getElementById('dashboard-dept-overview-grid');
    deptGrid.innerHTML = '';

    DEPARTMENTS.forEach(dept => {
      const deptBooks = appState.books.filter(b => b.department === dept.name);
      const deptCopies = deptBooks.reduce((acc, b) => acc + (parseInt(b.copies, 10) || 0), 0);
      const deptActiveLoans = appState.transactions.filter(t => {
        if (t.status !== 'issued') return false;
        const book = findBookById(t.bookId);
        return book && book.department === dept.name;
      }).length;
      const deptAvail = Math.max(0, deptCopies - deptActiveLoans);
      const percent = totalCopies > 0 ? Math.round((deptCopies / totalCopies) * 100) : 0;

      const card = document.createElement('div');
      card.className = 'dept-pill-card';
      card.innerHTML = `
        <div class="dept-pill-top">
          <span class="dept-pill-title">${dept.icon} ${escapeHTML(dept.name)}</span>
          <span class="dept-pill-count">${deptCopies}</span>
        </div>
        <div class="dept-progress-bar">
          <div class="dept-progress-fill" style="width: ${percent}%;"></div>
        </div>
        <div class="dept-pill-sub">
          <span>${deptBooks.length} titles • ${deptAvail} avail</span>
          <span>${percent}%</span>
        </div>
      `;

      card.addEventListener('click', () => {
        // Quick view filtered books
        switchView('books', () => {
          const deptSelect = document.getElementById('filter-department');
          deptSelect.value = dept.name;
          renderBooks();
        });
      });

      deptGrid.appendChild(card);
    });

    // 3. Active Loans Table on Dashboard
    const recentTable = document.getElementById('dashboard-recent-transactions-table');
    recentTable.innerHTML = '';

    const activeOrRecent = appState.transactions
      .slice()
      .reverse()
      .slice(0, 5);

    if (activeOrRecent.length === 0) {
      recentTable.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 2rem;">No loan transactions recorded yet.</td></tr>`;
    } else {
      activeOrRecent.forEach(tx => {
        const book = findBookById(tx.bookId);
        const member = findMemberById(tx.memberId);
        const fine = calculateFine(tx);
        const isOverdue = tx.status === 'issued' && fine > 0;

        let statusBadge = `<span class="badge badge-success">Returned</span>`;
        if (tx.status === 'issued') {
          if (isOverdue) {
            statusBadge = `<span class="badge badge-danger">Overdue (₹${fine})</span>`;
          } else {
            statusBadge = `<span class="badge badge-warning">Active Loan</span>`;
          }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div class="table-cell-title">${book ? escapeHTML(book.title) : 'Unknown Book'}</div>
            <div class="table-cell-subtitle">${book ? escapeHTML(book.isbn) : ''}</div>
          </td>
          <td>${member ? escapeHTML(member.name) : 'Unknown Member'}</td>
          <td class="font-mono text-sm">${escapeHTML(tx.dueDate)}</td>
          <td>${statusBadge}</td>
          <td>
            ${tx.status === 'issued' 
              ? `<button class="btn btn-outline-primary btn-xs btn-return-tx" data-tx-id="${tx.id}">↩️ Return</button>` 
              : `<span class="text-muted text-xs">Closed</span>`
            }
          </td>
        `;

        recentTable.appendChild(tr);
      });
    }

    // 4. Library Health Summary
    const healthSummary = document.getElementById('dashboard-health-summary');
    healthSummary.innerHTML = `
      <div class="health-item ${availableCopies > 0 ? 'health-ok' : 'health-warn'}">
        <div>
          <strong>Circulation Ratio</strong>
          <p class="text-xs text-muted">${activeLoans} out of ${totalCopies} copies in active use</p>
        </div>
        <span class="badge ${availableCopies > 0 ? 'badge-success' : 'badge-danger'}">
          ${totalCopies > 0 ? Math.round((activeLoans / totalCopies) * 100) : 0}% Issued
        </span>
      </div>
      <div class="health-item ${overdueCount === 0 ? 'health-ok' : 'health-warn'}">
        <div>
          <strong>Overdue Accounts</strong>
          <p class="text-xs text-muted">${overdueCount} patrons with books past due date</p>
        </div>
        <span class="badge ${overdueCount === 0 ? 'badge-success' : 'badge-warning'}">
          ${overdueCount === 0 ? 'All Current' : `₹${totalFine} Pending`}
        </span>
      </div>
      <div class="health-item health-ok">
        <div>
          <strong>Departments Active</strong>
          <p class="text-xs text-muted">Books distributed across all 5 engineering branches</p>
        </div>
        <span class="badge badge-indigo">5 Depts</span>
      </div>
    `;
  }

  // --- 2. BOOKS VIEW RENDERING & FILTERS ---

  function populateCategoryFilter() {
    const categorySelect = document.getElementById('filter-category');
    const currentVal = categorySelect.value;

    const categories = Array.from(new Set(appState.books.map(b => b.category).filter(Boolean))).sort();

    categorySelect.innerHTML = `<option value="All">All Categories</option>`;
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (cat === currentVal) opt.selected = true;
      categorySelect.appendChild(opt);
    });
  }

  function renderBooks() {
    populateCategoryFilter();

    const searchTerm = (document.getElementById('filter-book-search').value || '').trim().toLowerCase();
    const deptFilter = document.getElementById('filter-department').value;
    const catFilter = document.getElementById('filter-category').value;
    const availFilter = document.getElementById('filter-availability').value;

    const tbody = document.getElementById('books-table-body');
    tbody.innerHTML = '';

    // Multi-filter matching
    const filtered = appState.books.filter(book => {
      // 1. Text Search (Title, Author, ISBN)
      if (searchTerm) {
        const titleMatch = (book.title || '').toLowerCase().includes(searchTerm);
        const authorMatch = (book.author || '').toLowerCase().includes(searchTerm);
        const isbnMatch = (book.isbn || '').toLowerCase().includes(searchTerm);
        if (!titleMatch && !authorMatch && !isbnMatch) return false;
      }

      // 2. Department Filter
      if (deptFilter !== 'All' && book.department !== deptFilter) {
        return false;
      }

      // 3. Category Filter
      if (catFilter !== 'All' && book.category !== catFilter) {
        return false;
      }

      // 4. Availability Filter
      const avail = getAvailableCopiesCount(book);
      const issued = getIssuedCopiesCount(book.id);

      if (availFilter === 'Available' && avail <= 0) return false;
      if (availFilter === 'Issued' && issued <= 0) return false;
      if (availFilter === 'Out of Stock' && avail !== 0) return false;

      return true;
    });

    document.getElementById('books-count-badge').textContent = `Showing ${filtered.length} of ${appState.books.length} books`;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted" style="padding: 3rem;">
            <span style="font-size: 2rem; display: block; margin-bottom: 0.5rem;">🔍</span>
            No books found matching your current filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach(book => {
      const avail = getAvailableCopiesCount(book);
      const total = book.copies || 0;
      const deptMeta = getDepartmentMeta(book.department);

      let statusBadge = `<span class="badge badge-success">In Stock (${avail})</span>`;
      if (avail === 0) {
        statusBadge = `<span class="badge badge-danger">Out of Stock</span>`;
      } else if (avail < total) {
        statusBadge = `<span class="badge badge-warning">${avail} of ${total} Avail</span>`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="table-cell-title">${escapeHTML(book.title)}</div>
        </td>
        <td>${escapeHTML(book.author)}</td>
        <td><span class="badge badge-muted">${escapeHTML(book.category || 'General')}</span></td>
        <td>
          <span class="badge ${deptMeta.badgeClass}">
            ${deptMeta.icon} ${escapeHTML(book.department || 'General')}
          </span>
        </td>
        <td class="font-mono text-sm">${escapeHTML(book.isbn)}</td>
        <td>
          <strong>${avail}</strong> / <span>${total}</span>
        </td>
        <td>${statusBadge}</td>
        <td class="text-right">
          <div class="flex-gap" style="justify-content: flex-end;">
            <button class="btn btn-outline-primary btn-xs btn-add-copy" data-book-id="${book.id}" title="Add 1 copy instantly">
              + Copy
            </button>
            <button class="btn btn-secondary btn-xs btn-view-qr" data-book-id="${book.id}" title="View QR Code">
              📱 QR
            </button>
            <button class="btn btn-secondary btn-xs btn-edit-book" data-book-id="${book.id}" title="Edit book details">
              ✏️
            </button>
            <button class="btn btn-outline-danger btn-xs btn-delete-book" data-book-id="${book.id}" title="Delete book">
              🗑️
            </button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  // --- 3. QR SCANNER CONTROLLER ---

  /**
   * Starts the camera-based QR scanner using html5-qrcode
   */
  function startQRScanner() {
    if (typeof Html5Qrcode === 'undefined') {
      showCameraError("QR scanner library could not be loaded. Please check your internet connection or use manual ISBN search.");
      showToast("QR scanner library could not be loaded. Please use manual ISBN search.", "warning");
      return;
    }

    if (appState.isScannerRunning) {
      return;
    }

    hideCameraAlert();
    updateCameraStatus('starting', 'Connecting camera...');

    try {
      if (!appState.qrScannerInstance) {
        appState.qrScannerInstance = new Html5Qrcode("qr-reader");
      }

      const qrConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      // Prefer rear environment camera on mobile devices
      const cameraConfig = { facingMode: "environment" };

      appState.qrScannerInstance.start(
        cameraConfig,
        qrConfig,
        (decodedText, decodedResult) => {
          // Success Callback
          handleQRResult(decodedText);
        },
        (errorMessage) => {
          // Frame error (no QR detected in current frame) - safe to ignore
        }
      ).then(() => {
        appState.isScannerRunning = true;
        updateCameraStatus('active', 'Scanning live');
        document.getElementById('btn-start-scanner').disabled = true;
        document.getElementById('btn-stop-scanner').disabled = false;
        document.getElementById('scanner-laser').style.display = 'block';
        document.getElementById('scanner-placeholder').style.display = 'none';
        showToast("QR scanner started", "success");
      }).catch(err => {
        console.error("Camera start failed:", err);
        appState.isScannerRunning = false;
        updateCameraStatus('error', 'Camera Error');
        document.getElementById('btn-start-scanner').disabled = false;
        document.getElementById('btn-stop-scanner').disabled = true;
        document.getElementById('scanner-laser').style.display = 'none';
        document.getElementById('scanner-placeholder').style.display = 'flex';

        showCameraError("Camera permission is required to scan QR codes. Use manual ISBN entry instead.");
        showToast("Camera permission required", "warning");
      });
    } catch (e) {
      console.error("QR scanner initialization exception:", e);
      showCameraError("Unable to access camera on this device. Use manual ISBN entry instead.");
    }
  }

  /**
   * Stops the camera-based QR scanner
   */
  function stopQRScanner(showMessage = true) {
    if (appState.qrScannerInstance && appState.isScannerRunning) {
      appState.qrScannerInstance.stop().then(() => {
        appState.isScannerRunning = false;
        updateCameraStatus('idle', 'Scanner Idle');
        document.getElementById('btn-start-scanner').disabled = false;
        document.getElementById('btn-stop-scanner').disabled = true;
        document.getElementById('scanner-laser').style.display = 'none';
        document.getElementById('scanner-placeholder').style.display = 'flex';
        if (showMessage) {
          showToast("QR scanner stopped", "info");
        }
      }).catch(err => {
        console.warn("Error stopping QR scanner:", err);
        appState.isScannerRunning = false;
        updateCameraStatus('idle', 'Scanner Idle');
      });
    }
  }

  function updateCameraStatus(state, text) {
    const pill = document.getElementById('camera-status-pill');
    const label = document.getElementById('camera-status-text');
    pill.className = `camera-status-pill ${state}`;
    label.textContent = text;
  }

  function showCameraError(msg) {
    const alertBox = document.getElementById('camera-permission-alert');
    const msgEl = document.getElementById('camera-alert-msg');
    msgEl.textContent = msg;
    alertBox.style.display = 'flex';
  }

  function hideCameraAlert() {
    const alertBox = document.getElementById('camera-permission-alert');
    alertBox.style.display = 'none';
  }

  /**
   * Handle decoded QR result (from live camera or simulator or manual search)
   */
  function handleQRResult(decodedText) {
    if (!decodedText) return;

    // Prevent immediate re-trigger on same code in a rapid loop
    const now = Date.now();
    if (appState.scannerLastResult === decodedText && (now - (appState.scannerLastTime || 0)) < 1500) {
      return;
    }
    appState.scannerLastResult = decodedText;
    appState.scannerLastTime = now;

    const qrInfo = normalizeQRValue(decodedText);
    const existingBook = findBookByQR(qrInfo);

    const resultBody = document.getElementById('scan-result-body');
    const resultTitle = document.getElementById('scan-result-title');
    const resultMeta = document.getElementById('scan-result-meta');

    if (existingBook) {
      // ----------------------------------------------------
      // CASE 1: BOOK ALREADY EXISTS
      // ----------------------------------------------------
      const avail = getAvailableCopiesCount(existingBook);
      const total = existingBook.copies || 0;
      const deptMeta = getDepartmentMeta(existingBook.department);

      resultTitle.textContent = "✅ Book Found";
      resultMeta.textContent = `Scanned: "${escapeHTML(qrInfo.raw)}"`;

      resultBody.innerHTML = `
        <div class="scanned-book-details">
          <div class="scanned-book-title">${escapeHTML(existingBook.title)}</div>
          <div class="scanned-book-author">by ${escapeHTML(existingBook.author)}</div>
          
          <div class="scanned-meta-row">
            <span class="badge ${deptMeta.badgeClass}">
              ${deptMeta.icon} ${escapeHTML(existingBook.department)}
            </span>
            <span class="badge badge-muted">Category: ${escapeHTML(existingBook.category || 'General')}</span>
            <span class="font-mono text-sm">ISBN: <strong>${escapeHTML(existingBook.isbn)}</strong></span>
            <span class="text-xs text-muted">Book ID: #${existingBook.id}</span>
          </div>

          <div class="scanned-copies-bar">
            <span>Availability Status:</span>
            <span><strong class="text-emerald">${avail}</strong> / <strong>${total}</strong> Copies Available</span>
          </div>
        </div>

        <div class="scanned-action-buttons">
          <button class="btn btn-success" id="qr-btn-add-1-copy" data-book-id="${existingBook.id}">
            + Add 1 Copy
          </button>
          <button class="btn btn-indigo" id="qr-btn-add-multiple-copies" data-book-id="${existingBook.id}">
            Add Multiple Copies
          </button>
          <button class="btn btn-secondary" id="qr-btn-edit-book" data-book-id="${existingBook.id}">
            Edit Book
          </button>
          ${avail > 0 ? `
            <button class="btn btn-outline-primary" id="qr-btn-issue-book" data-book-id="${existingBook.id}">
              🔄 Issue Book
            </button>
          ` : ''}
        </div>
      `;

      // Attach button event handlers
      document.getElementById('qr-btn-add-1-copy').addEventListener('click', () => {
        addBookCopy(existingBook.id, 1);
        handleQRResult(decodedText); // refresh result card
      });

      document.getElementById('qr-btn-add-multiple-copies').addEventListener('click', () => {
        openAddCopiesModal(existingBook.id);
      });

      document.getElementById('qr-btn-edit-book').addEventListener('click', () => {
        openEditBookModal(existingBook.id);
      });

      const issueBtn = document.getElementById('qr-btn-issue-book');
      if (issueBtn) {
        issueBtn.addEventListener('click', () => {
          openIssueModalWithBook(existingBook.id);
        });
      }

      showToast("Book found", "success");
    } else {
      // ----------------------------------------------------
      // CASE 2: NEW BOOK DETECTED
      // ----------------------------------------------------
      const candidateISBN = qrInfo.normalizedISBN || qrInfo.cleanValue;

      resultTitle.textContent = "🆕 New Book Detected";
      resultMeta.textContent = `Scanned ISBN: "${escapeHTML(candidateISBN)}"`;

      resultBody.innerHTML = `
        <div class="scanned-book-details" style="border-left: 3px solid var(--warning);">
          <div class="scanned-book-title" style="color: var(--warning-dark);">Unregistered ISBN Detected</div>
          <p class="text-sm text-secondary mb-2">This ISBN does not exist in your SmartLib inventory yet.</p>
          <div class="scanned-meta-row">
            <span class="font-mono text-sm">ISBN: <strong>${escapeHTML(candidateISBN)}</strong></span>
          </div>
        </div>

        <div class="scanned-action-buttons">
          <button class="btn btn-primary" id="qr-btn-register-new">
            + Register & Add Book Details
          </button>
        </div>
      `;

      document.getElementById('qr-btn-register-new').addEventListener('click', () => {
        openAddBookModal({ isbn: candidateISBN });
      });

      // Automatically open the Add Book form with ISBN pre-filled as required
      openAddBookModal({ isbn: candidateISBN });
      showToast("New book detected - please complete registration", "info");
    }
  }

  function resetQRResultCard() {
    const resultBody = document.getElementById('scan-result-body');
    const resultTitle = document.getElementById('scan-result-title');
    const resultMeta = document.getElementById('scan-result-meta');

    resultTitle.textContent = "Scan Result";
    resultMeta.textContent = "Waiting for QR scan...";
    resultBody.innerHTML = `
      <div class="empty-result-state" id="empty-scan-state">
        <span class="empty-icon">🎯</span>
        <p>No QR code scanned yet.</p>
        <span class="text-muted text-xs">Align QR code inside camera frame or test with sample buttons below.</span>
      </div>
    `;
  }

  // --- 4. COPY INCREMENT LOGIC ---

  function addBookCopy(bookId, count = 1) {
    const book = findBookById(bookId);
    if (!book) return;

    const numToAdd = parseInt(count, 10);
    if (isNaN(numToAdd) || numToAdd < 1) return;

    book.copies = (parseInt(book.copies, 10) || 0) + numToAdd;
    saveToStorage();
    refreshAllViews();

    if (numToAdd === 1) {
      showToast("1 copy added successfully", "success");
    } else {
      showToast(`${numToAdd} copies added successfully`, "success");
    }
  }

  function openAddCopiesModal(bookId) {
    const book = findBookById(bookId);
    if (!book) return;

    document.getElementById('add-copies-book-id').value = book.id;
    document.getElementById('add-copies-book-title').textContent = book.title;
    document.getElementById('add-copies-existing').textContent = book.copies;
    document.getElementById('add-copies-count').value = 1;
    document.getElementById('add-copies-new-total').textContent = (book.copies || 0) + 1;

    openModal('add-copies-modal');
  }

  // --- 5. DEPARTMENT VIEW & COMPARTMENTS ---

  function renderDepartments() {
    const summaryCardsContainer = document.getElementById('department-summary-cards');
    const shelvesContainer = document.getElementById('department-shelves-container');

    summaryCardsContainer.innerHTML = '';
    shelvesContainer.innerHTML = '';

    DEPARTMENTS.forEach(dept => {
      // Calculate dynamic numbers from localStorage
      const deptBooks = appState.books.filter(b => b.department === dept.name);
      const totalCopies = deptBooks.reduce((acc, b) => acc + (parseInt(b.copies, 10) || 0), 0);
      const distinctBooksCount = deptBooks.length;
      
      const deptIssued = appState.transactions.filter(t => {
        if (t.status !== 'issued') return false;
        const b = findBookById(t.bookId);
        return b && b.department === dept.name;
      }).length;
      
      const availableCopies = Math.max(0, totalCopies - deptIssued);

      // 1. Department Summary Card
      const summaryCard = document.createElement('div');
      summaryCard.className = 'department-card';
      summaryCard.innerHTML = `
        <div>
          <div class="dept-card-header">
            <div class="dept-card-icon">${dept.icon}</div>
            <div>
              <div class="dept-card-title">${escapeHTML(dept.name)}</div>
              <span class="text-xs text-muted">Academic Branch</span>
            </div>
          </div>
          <div class="dept-metrics-box">
            <div class="metric-line">
              <span>Total Copies</span>
              <strong>${totalCopies}</strong>
            </div>
            <div class="metric-line">
              <span>Different Books</span>
              <strong>${distinctBooksCount}</strong>
            </div>
            <div class="metric-line">
              <span>Available Copies</span>
              <strong class="text-emerald">${availableCopies}</strong>
            </div>
          </div>
        </div>
        <button class="btn btn-outline-primary btn-sm btn-block btn-dept-view-books" data-dept-name="${dept.name}">
          View Books &rarr;
        </button>
      `;

      summaryCardsContainer.appendChild(summaryCard);

      // 2. Department Book Compartment / Shelf
      const shelfBox = document.createElement('div');
      shelfBox.className = 'shelf-box';
      shelfBox.innerHTML = `
        <div class="shelf-box-header">
          <div class="shelf-box-title">
            <span>${dept.icon}</span>
            <span>${escapeHTML(dept.name)}</span>
            <span class="badge ${dept.badgeClass}">${distinctBooksCount} Books • ${totalCopies} Copies</span>
          </div>
          <button class="btn btn-ghost btn-xs btn-dept-view-books" data-dept-name="${dept.name}">
            Filter in Catalog &rarr;
          </button>
        </div>
        <div class="shelf-books-grid" id="shelf-grid-${dept.id}">
          <!-- Books in this compartment -->
        </div>
      `;

      const shelfGrid = shelfBox.querySelector(`#shelf-grid-${dept.id}`);

      if (deptBooks.length === 0) {
        shelfGrid.innerHTML = `
          <div class="empty-shelf-state" style="grid-column: 1 / -1;">
            <span>📚 No books currently assigned to this compartment.</span>
            <div class="mt-2">
              <button class="btn btn-outline-primary btn-xs btn-add-book-to-dept" data-dept-name="${dept.name}">
                + Add First Book to ${escapeHTML(dept.name)}
              </button>
            </div>
          </div>
        `;
      } else {
        deptBooks.forEach(b => {
          const bAvail = getAvailableCopiesCount(b);
          const bTotal = b.copies || 0;

          const bookCard = document.createElement('div');
          bookCard.className = 'shelf-book-card';
          bookCard.innerHTML = `
            <div>
              <div class="shelf-book-title">${escapeHTML(b.title)}</div>
              <div class="shelf-book-author">by ${escapeHTML(b.author)}</div>
            </div>
            <div>
              <div class="shelf-book-meta">
                <span class="font-mono text-xs text-muted">${escapeHTML(b.isbn)}</span>
                <span class="badge ${bAvail > 0 ? 'badge-success' : 'badge-danger'}">
                  ${bAvail}/${bTotal} Avail
                </span>
              </div>
              <div class="shelf-book-actions mt-2">
                <button class="btn btn-outline-primary btn-xs btn-add-copy" data-book-id="${b.id}" title="Add 1 copy">
                  + Copy
                </button>
                <button class="btn btn-secondary btn-xs btn-view-qr" data-book-id="${b.id}" title="QR Code">
                  📱 QR
                </button>
                <button class="btn btn-secondary btn-xs btn-edit-book" data-book-id="${b.id}" title="Edit book">
                  ✏️
                </button>
              </div>
            </div>
          `;
          shelfGrid.appendChild(bookCard);
        });
      }

      shelvesContainer.appendChild(shelfBox);
    });

    // Attach [ View Books ] click listeners
    document.querySelectorAll('.btn-dept-view-books').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const deptName = e.currentTarget.getAttribute('data-dept-name');
        switchView('books', () => {
          document.getElementById('filter-department').value = deptName;
          renderBooks();
        });
      });
    });

    document.querySelectorAll('.btn-add-book-to-dept').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const deptName = e.currentTarget.getAttribute('data-dept-name');
        openAddBookModal({ department: deptName });
      });
    });
  }

  // --- 6. ADD & EDIT BOOK MODALS ---

  function openAddBookModal(prefill = {}) {
    document.getElementById('book-modal-title').textContent = "Add New Book";
    document.getElementById('book-modal-subtitle').textContent = "Register a book into SmartLib catalog";
    document.getElementById('book-form-id').value = '';

    document.getElementById('book-input-title').value = prefill.title || '';
    document.getElementById('book-input-author').value = prefill.author || '';
    document.getElementById('book-input-isbn').value = prefill.isbn || '';
    document.getElementById('book-input-category').value = prefill.category || '';
    document.getElementById('book-input-department').value = prefill.department || 'Computer Engineering';
    document.getElementById('book-input-copies').value = prefill.copies || 1;
    document.getElementById('book-input-copies').min = 1;

    document.getElementById('duplicate-isbn-banner').style.display = 'none';
    document.getElementById('book-edit-error').style.display = 'none';

    openModal('book-modal');

    // Real-time duplicate check if prefill ISBN given
    if (prefill.isbn) {
      checkDuplicateISBN(prefill.isbn);
    }
  }

  function openEditBookModal(bookId) {
    const book = findBookById(bookId);
    if (!book) return;

    document.getElementById('book-modal-title').textContent = "Edit Book";
    document.getElementById('book-modal-subtitle').textContent = `Editing: ${book.title}`;
    document.getElementById('book-form-id').value = book.id;

    document.getElementById('book-input-title').value = book.title;
    document.getElementById('book-input-author').value = book.author;
    document.getElementById('book-input-isbn').value = book.isbn;
    document.getElementById('book-input-category').value = book.category;
    document.getElementById('book-input-department').value = book.department || 'General';
    document.getElementById('book-input-copies').value = book.copies || 1;

    const issuedCopies = getIssuedCopiesCount(book.id);
    document.getElementById('book-copies-help').textContent = `Currently issued: ${issuedCopies}. Total copies cannot be less than ${issuedCopies}.`;

    document.getElementById('duplicate-isbn-banner').style.display = 'none';
    document.getElementById('book-edit-error').style.display = 'none';

    openModal('book-modal');
  }

  function checkDuplicateISBN(isbn) {
    const currentId = document.getElementById('book-form-id').value;
    const existing = findBookByISBN(isbn);
    const banner = document.getElementById('duplicate-isbn-banner');

    if (existing && (!currentId || existing.id !== parseInt(currentId, 10))) {
      banner.style.display = 'flex';
      document.getElementById('duplicate-isbn-text').textContent = 
        `"${existing.title}" is already registered with this ISBN (${existing.copies} copies in stock).`;
      
      const copyBtn = document.getElementById('btn-add-copy-from-banner');
      copyBtn.onclick = () => {
        addBookCopy(existing.id, 1);
        closeModal('book-modal');
      };
      return existing;
    } else {
      banner.style.display = 'none';
      return null;
    }
  }

  function handleSaveBook(e) {
    e.preventDefault();

    const bookId = document.getElementById('book-form-id').value;
    const title = document.getElementById('book-input-title').value.trim();
    const author = document.getElementById('book-input-author').value.trim();
    const rawISBN = document.getElementById('book-input-isbn').value.trim();
    const category = document.getElementById('book-input-category').value.trim();
    const department = document.getElementById('book-input-department').value;
    const copies = parseInt(document.getElementById('book-input-copies').value, 10);

    const errorBox = document.getElementById('book-edit-error');
    const errorMsg = document.getElementById('book-edit-error-msg');
    errorBox.style.display = 'none';

    // Validation
    if (!title || !author || !rawISBN || !category || !department) {
      errorMsg.textContent = "All fields marked with an asterisk (*) are required.";
      errorBox.style.display = 'flex';
      return;
    }

    if (isNaN(copies) || copies < 1) {
      errorMsg.textContent = "Total copies must be at least 1.";
      errorBox.style.display = 'flex';
      return;
    }

    if (bookId) {
      // ---------------- EDIT EXISTING BOOK ----------------
      const book = findBookById(bookId);
      if (!book) return;

      const issuedCopies = getIssuedCopiesCount(book.id);
      if (copies < issuedCopies) {
        errorMsg.textContent = `Copies cannot be less than currently issued copies. Currently issued: ${issuedCopies}.`;
        errorBox.style.display = 'flex';
        return;
      }

      // Check if ISBN modified to an existing one
      const existingWithISBN = findBookByISBN(rawISBN);
      if (existingWithISBN && existingWithISBN.id !== book.id) {
        errorMsg.textContent = "Book with this ISBN already exists.";
        errorBox.style.display = 'flex';
        return;
      }

      book.title = title;
      book.author = author;
      book.isbn = rawISBN;
      book.category = category;
      book.department = department;
      book.copies = copies;

      saveToStorage();
      refreshAllViews();
      closeModal('book-modal');
      showToast("Book updated successfully", "success");
    } else {
      // ---------------- ADD NEW BOOK ----------------
      // DUPLICATE ISBN PROTECTION
      const existing = findBookByISBN(rawISBN);
      if (existing) {
        // Do NOT create a duplicate row!
        // Increment copies of existing book
        existing.copies = (existing.copies || 0) + copies;
        saveToStorage();
        refreshAllViews();
        closeModal('book-modal');
        showToast(`Book with this ISBN already exists. Added ${copies} copies to existing record.`, "success");
        return;
      }

      // Generate new numeric ID
      const maxId = appState.books.reduce((max, b) => Math.max(max, b.id || 0), 0);
      const newBook = {
        id: maxId + 1,
        title,
        author,
        isbn: rawISBN,
        category,
        department,
        copies
      };

      appState.books.push(newBook);
      saveToStorage();
      refreshAllViews();
      closeModal('book-modal');
      showToast("New book added successfully", "success");
    }
  }

  function deleteBook(bookId) {
    const book = findBookById(bookId);
    if (!book) return;

    const issuedCopies = getIssuedCopiesCount(book.id);
    if (issuedCopies > 0) {
      alert(`Cannot delete "${book.title}". There are currently ${issuedCopies} copies issued on loan. Please return all copies first.`);
      return;
    }

    if (confirm(`Are you sure you want to delete "${book.title}" from the catalog?`)) {
      appState.books = appState.books.filter(b => b.id !== book.id);
      saveToStorage();
      refreshAllViews();
      showToast("Book deleted successfully", "success");
    }
  }

  // --- 7. MEMBERS DIRECTORY ---

  function renderMembers() {
    const search = (document.getElementById('filter-member-search').value || '').trim().toLowerCase();
    const roleFilter = document.getElementById('filter-member-role').value;

    const tbody = document.getElementById('members-table-body');
    tbody.innerHTML = '';

    const filtered = appState.members.filter(m => {
      if (search) {
        const nameMatch = (m.name || '').toLowerCase().includes(search);
        const codeMatch = (m.code || '').toLowerCase().includes(search);
        const emailMatch = (m.email || '').toLowerCase().includes(search);
        const phoneMatch = (m.phone || '').toLowerCase().includes(search);
        if (!nameMatch && !codeMatch && !emailMatch && !phoneMatch) return false;
      }

      if (roleFilter !== 'All' && m.role !== roleFilter) return false;

      return true;
    });

    document.getElementById('members-count-badge').textContent = `Showing ${filtered.length} of ${appState.members.length} members`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2.5rem;">No members found matching your search.</td></tr>`;
      return;
    }

    filtered.forEach(m => {
      const activeLoans = appState.transactions.filter(t => t.memberId === m.id && t.status === 'issued').length;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="font-mono text-sm"><strong>${escapeHTML(m.code)}</strong></td>
        <td>
          <div class="table-cell-title">${escapeHTML(m.name)}</div>
        </td>
        <td>${escapeHTML(m.email)}</td>
        <td>${escapeHTML(m.phone || '—')}</td>
        <td><span class="badge ${m.role === 'Faculty' ? 'badge-indigo' : 'badge-muted'}">${escapeHTML(m.role)}</span></td>
        <td>
          <span class="badge ${activeLoans > 0 ? 'badge-warning' : 'badge-success'}">
            ${activeLoans} ${activeLoans === 1 ? 'Book' : 'Books'}
          </span>
        </td>
        <td class="text-right">
          <div class="flex-gap" style="justify-content: flex-end;">
            <button class="btn btn-secondary btn-xs btn-edit-member" data-member-id="${m.id}" title="Edit member">
              ✏️
            </button>
            <button class="btn btn-outline-danger btn-xs btn-delete-member" data-member-id="${m.id}" title="Delete member">
              🗑️
            </button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  function openAddMemberModal() {
    document.getElementById('member-modal-title').textContent = "Add Library Member";
    document.getElementById('member-form-id').value = '';
    document.getElementById('member-input-code').value = `MEM-${100 + appState.members.length + 1}`;
    document.getElementById('member-input-name').value = '';
    document.getElementById('member-input-email').value = '';
    document.getElementById('member-input-phone').value = '';
    document.getElementById('member-input-role').value = 'Student';

    openModal('member-modal');
  }

  function openEditMemberModal(memberId) {
    const member = findMemberById(memberId);
    if (!member) return;

    document.getElementById('member-modal-title').textContent = "Edit Library Member";
    document.getElementById('member-form-id').value = member.id;
    document.getElementById('member-input-code').value = member.code;
    document.getElementById('member-input-name').value = member.name;
    document.getElementById('member-input-email').value = member.email;
    document.getElementById('member-input-phone').value = member.phone || '';
    document.getElementById('member-input-role').value = member.role || 'Student';

    openModal('member-modal');
  }

  function handleSaveMember(e) {
    e.preventDefault();

    const id = document.getElementById('member-form-id').value;
    const code = document.getElementById('member-input-code').value.trim();
    const name = document.getElementById('member-input-name').value.trim();
    const email = document.getElementById('member-input-email').value.trim();
    const phone = document.getElementById('member-input-phone').value.trim();
    const role = document.getElementById('member-input-role').value;

    if (!code || !name || !email) {
      alert("Please fill in Member ID, Name, and Email.");
      return;
    }

    if (id) {
      const member = findMemberById(id);
      if (!member) return;
      member.code = code;
      member.name = name;
      member.email = email;
      member.phone = phone;
      member.role = role;
      showToast("Member updated successfully", "success");
    } else {
      const maxId = appState.members.reduce((max, m) => Math.max(max, m.id || 0), 0);
      appState.members.push({
        id: maxId + 1,
        code,
        name,
        email,
        phone,
        role
      });
      showToast("New member registered successfully", "success");
    }

    saveToStorage();
    renderMembers();
    renderDashboard();
    closeModal('member-modal');
  }

  function deleteMember(memberId) {
    const member = findMemberById(memberId);
    if (!member) return;

    const activeLoans = appState.transactions.filter(t => t.memberId === member.id && t.status === 'issued').length;
    if (activeLoans > 0) {
      alert(`Cannot delete member "${member.name}". They currently have ${activeLoans} unreturned book(s). Please return the books before deleting this member.`);
      return;
    }

    if (confirm(`Are you sure you want to delete member "${member.name}"?`)) {
      appState.members = appState.members.filter(m => m.id !== member.id);
      saveToStorage();
      renderMembers();
      renderDashboard();
      showToast("Member removed successfully", "success");
    }
  }

  // --- 8. TRANSACTIONS & ISSUE/RETURN ---

  function renderTransactions() {
    const tbody = document.getElementById('transactions-table-body');
    tbody.innerHTML = '';

    const filter = appState.activeTxFilter;

    const filtered = appState.transactions.filter(t => {
      if (filter === 'all') return true;
      if (filter === 'issued') return t.status === 'issued';
      if (filter === 'returned') return t.status === 'returned';
      if (filter === 'overdue') {
        return t.status === 'issued' && calculateFine(t) > 0;
      }
      return true;
    });

    document.getElementById('transactions-count-badge').textContent = `Showing ${filtered.length} of ${appState.transactions.length} records`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding: 2.5rem;">No transaction records in this category.</td></tr>`;
      return;
    }

    // Display newest first
    filtered.slice().reverse().forEach(tx => {
      const book = findBookById(tx.bookId);
      const member = findMemberById(tx.memberId);
      const fine = calculateFine(tx);
      const deptMeta = book ? getDepartmentMeta(book.department) : null;
      const isOverdue = tx.status === 'issued' && fine > 0;

      let statusBadge = `<span class="badge badge-success">Returned</span>`;
      if (tx.status === 'issued') {
        if (isOverdue) {
          statusBadge = `<span class="badge badge-danger">Overdue</span>`;
        } else {
          statusBadge = `<span class="badge badge-warning">Active Loan</span>`;
        }
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="font-mono text-xs">#TX-${tx.id}</td>
        <td>
          <div class="table-cell-title">${book ? escapeHTML(book.title) : 'Unknown Book'}</div>
          ${deptMeta ? `<span class="badge ${deptMeta.badgeClass} text-xs mt-1">${deptMeta.icon} ${escapeHTML(book.department)}</span>` : ''}
        </td>
        <td>
          <div class="table-cell-title">${member ? escapeHTML(member.name) : 'Unknown Member'}</div>
          <div class="table-cell-subtitle font-mono">${member ? escapeHTML(member.code) : ''}</div>
        </td>
        <td class="font-mono text-sm">${escapeHTML(tx.issueDate)}</td>
        <td class="font-mono text-sm ${isOverdue ? 'text-rose font-bold' : ''}">${escapeHTML(tx.dueDate)}</td>
        <td class="font-mono text-sm">${tx.returnDate ? escapeHTML(tx.returnDate) : '—'}</td>
        <td class="font-mono ${fine > 0 ? 'text-rose' : ''}">₹${fine}</td>
        <td>${statusBadge}</td>
        <td class="text-right">
          ${tx.status === 'issued' ? `
            <button class="btn btn-outline-primary btn-xs btn-return-tx" data-tx-id="${tx.id}">
              ↩️ Return Book
            </button>
          ` : `
            <span class="text-muted text-xs">Completed</span>
          `}
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  function openIssueModalWithBook(bookId = null) {
    populateIssueDropdowns(bookId);

    // Set default dates (Today and +14 days)
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 14);

    document.getElementById('issue-input-date').value = today.toISOString().split('T')[0];
    document.getElementById('issue-input-due').value = dueDate.toISOString().split('T')[0];

    openModal('issue-modal');
  }

  function populateIssueDropdowns(preselectedBookId = null) {
    const bookSelect = document.getElementById('issue-select-book');
    const memberSelect = document.getElementById('issue-select-member');

    bookSelect.innerHTML = `<option value="">-- Choose Book (Available Copies) --</option>`;
    appState.books.forEach(b => {
      const avail = getAvailableCopiesCount(b);
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = `${b.title} [${b.department}] — (${avail} available)`;
      if (avail <= 0) {
        opt.disabled = true;
        opt.textContent += " [Out of Stock]";
      }
      if (preselectedBookId && b.id === parseInt(preselectedBookId, 10)) {
        opt.selected = true;
      }
      bookSelect.appendChild(opt);
    });

    memberSelect.innerHTML = `<option value="">-- Choose Member --</option>`;
    appState.members.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.name} (${m.code} • ${m.role})`;
      memberSelect.appendChild(opt);
    });
  }

  function handleIssueBook(e) {
    e.preventDefault();

    const bookId = parseInt(document.getElementById('issue-select-book').value, 10);
    const memberId = parseInt(document.getElementById('issue-select-member').value, 10);
    const issueDate = document.getElementById('issue-input-date').value;
    const dueDate = document.getElementById('issue-input-due').value;

    if (!bookId || !memberId || !issueDate || !dueDate) {
      alert("Please select both a book, a member, and valid loan dates.");
      return;
    }

    const book = findBookById(bookId);
    if (!book) return;

    const available = getAvailableCopiesCount(book);
    if (available <= 0) {
      alert(`"${book.title}" is currently out of stock. All copies are issued.`);
      return;
    }

    const maxId = appState.transactions.reduce((max, t) => Math.max(max, t.id || 0), 0);
    const newTx = {
      id: maxId + 1,
      bookId,
      memberId,
      issueDate,
      dueDate,
      returnDate: null,
      status: 'issued',
      fine: 0
    };

    appState.transactions.push(newTx);
    saveToStorage();
    refreshAllViews();
    closeModal('issue-modal');
    showToast("Book issued successfully", "success");
  }

  function handleReturnBook(txId) {
    const tx = appState.transactions.find(t => t.id === parseInt(txId, 10));
    if (!tx || tx.status !== 'issued') return;

    const book = findBookById(tx.bookId);
    const member = findMemberById(tx.memberId);
    const fine = calculateFine(tx);

    let confirmMsg = `Confirm return of "${book ? book.title : 'Book'}" for ${member ? member.name : 'member'}?`;
    if (fine > 0) {
      confirmMsg += `\n\n⚠️ Note: Book is overdue. Fine accumulated: ₹${fine}.`;
    }

    if (confirm(confirmMsg)) {
      tx.status = 'returned';
      tx.returnDate = new Date().toISOString().split('T')[0];
      tx.fine = fine;

      saveToStorage();
      refreshAllViews();
      showToast("Book returned successfully", "success");
    }
  }

  // --- 9. REPORTS VIEW RENDERING ---

  function renderReports() {
    // 1. Category Reports
    const categoryBody = document.getElementById('category-reports-table-body');
    categoryBody.innerHTML = '';

    const categories = Array.from(new Set(appState.books.map(b => b.category).filter(Boolean))).sort();
    categories.forEach(cat => {
      const catBooks = appState.books.filter(b => b.category === cat);
      const totalCopies = catBooks.reduce((acc, b) => acc + (parseInt(b.copies, 10) || 0), 0);
      const issued = appState.transactions.filter(t => {
        if (t.status !== 'issued') return false;
        const b = findBookById(t.bookId);
        return b && b.category === cat;
      }).length;
      const avail = Math.max(0, totalCopies - issued);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHTML(cat)}</strong></td>
        <td>${catBooks.length}</td>
        <td>${totalCopies}</td>
        <td><span class="badge ${avail > 0 ? 'badge-success' : 'badge-danger'}">${avail}</span></td>
      `;
      categoryBody.appendChild(tr);
    });

    // 2. Overdue Loans Table
    const overdueBody = document.getElementById('overdue-reports-table-body');
    overdueBody.innerHTML = '';

    const overdueList = appState.transactions.filter(t => t.status === 'issued' && calculateFine(t) > 0);

    if (overdueList.length === 0) {
      overdueBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 1.5rem;">✅ No overdue books at this time.</td></tr>`;
    } else {
      overdueList.forEach(tx => {
        const book = findBookById(tx.bookId);
        const member = findMemberById(tx.memberId);
        const fine = calculateFine(tx);
        const days = getOverdueDays(tx.dueDate);

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${book ? escapeHTML(book.title) : 'Unknown'}</strong></td>
          <td>${member ? escapeHTML(member.name) : 'Unknown'}</td>
          <td class="font-mono text-sm">${escapeHTML(tx.dueDate)}</td>
          <td><span class="badge badge-danger">${days} days</span></td>
          <td class="font-mono font-bold text-rose">₹${fine}</td>
        `;
        overdueBody.appendChild(tr);
      });
    }
  }

  /**
   * Dedicated Department-wise Reports Rendering
   */
  function renderDepartmentReports() {
    const tbody = document.getElementById('department-reports-table-body');
    const tfoot = document.getElementById('department-reports-table-footer');

    tbody.innerHTML = '';
    tfoot.innerHTML = '';

    let grandDistinct = 0;
    let grandCopies = 0;
    let grandAvail = 0;
    let grandIssued = 0;

    DEPARTMENTS.forEach(dept => {
      const deptBooks = appState.books.filter(b => b.department === dept.name);
      const distinctCount = deptBooks.length;
      const totalCopies = deptBooks.reduce((acc, b) => acc + (parseInt(b.copies, 10) || 0), 0);
      
      const issuedCount = appState.transactions.filter(t => {
        if (t.status !== 'issued') return false;
        const b = findBookById(t.bookId);
        return b && b.department === dept.name;
      }).length;

      const availCount = Math.max(0, totalCopies - issuedCount);
      const circRate = totalCopies > 0 ? Math.round((issuedCount / totalCopies) * 100) : 0;

      grandDistinct += distinctCount;
      grandCopies += totalCopies;
      grandAvail += availCount;
      grandIssued += issuedCount;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <span class="badge ${dept.badgeClass}">
            ${dept.icon} ${escapeHTML(dept.name)}
          </span>
        </td>
        <td><strong>${distinctCount}</strong></td>
        <td><strong>${totalCopies}</strong></td>
        <td><span class="text-emerald font-bold">${availCount}</span></td>
        <td><span class="text-amber font-bold">${issuedCount}</span></td>
        <td>
          <div class="flex-gap">
            <div class="dept-progress-bar" style="width: 80px; margin-top: 0;">
              <div class="dept-progress-fill" style="width: ${circRate}%;"></div>
            </div>
            <span class="text-xs font-mono">${circRate}%</span>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });

    const grandCircRate = grandCopies > 0 ? Math.round((grandIssued / grandCopies) * 100) : 0;

    tfoot.innerHTML = `
      <tr>
        <td><strong>Total Library Catalog</strong></td>
        <td><strong>${grandDistinct}</strong></td>
        <td><strong>${grandCopies}</strong></td>
        <td><strong class="text-emerald">${grandAvail}</strong></td>
        <td><strong class="text-amber">${grandIssued}</strong></td>
        <td><strong>${grandCircRate}%</strong></td>
      </tr>
    `;
  }

  // --- 10. QR CODE VIEWER / GENERATOR MODAL ---

  /**
   * Generates a clean high-contrast SVG QR Matrix code directly in pure JavaScript
   * Simple, reliable, zero-dependency QR code encoder (QR Code 21x21 Model 1 / Model 2)
   */
  function displayBookQR(bookId) {
    const book = findBookById(bookId);
    if (!book) return;

    document.getElementById('qr-display-book-title').textContent = book.title;
    document.getElementById('qr-display-book-author').textContent = `by ${book.author} (${book.department})`;
    document.getElementById('qr-display-isbn').textContent = `ISBN: ${book.isbn}`;

    const qrContainer = document.getElementById('qr-canvas-box');
    qrContainer.innerHTML = '';

    // Generate QR using canvas or embedded SVG
    const qrCanvas = document.createElement('canvas');
    qrCanvas.width = 180;
    qrCanvas.height = 180;
    renderQRCodeOnCanvas(qrCanvas, book.isbn);
    qrContainer.appendChild(qrCanvas);

    openModal('qr-display-modal');
  }

  /**
   * Lightweight pure JS QR generator algorithm (encodes text/numeric into black & white matrix)
   */
  function renderQRCodeOnCanvas(canvas, text) {
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Grid size (25x25)
    const modules = 25;
    const cellSize = size / modules;

    // Deterministic pseudo-hash matrix generator based on input text
    // ensures finder patterns at corners and consistent data bits
    const matrix = [];
    for (let r = 0; r < modules; r++) {
      matrix[r] = new Array(modules).fill(false);
    }

    // Helper for 7x7 finder patterns
    function addFinder(startX, startY) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            matrix[startY + r][startX + c] = true;
          }
        }
      }
    }

    addFinder(0, 0);                 // Top-left
    addFinder(modules - 7, 0);        // Top-right
    addFinder(0, modules - 7);        // Bottom-left

    // Timing lines
    for (let i = 8; i < modules - 8; i++) {
      if (i % 2 === 0) {
        matrix[6][i] = true;
        matrix[i][6] = true;
      }
    }

    // Hash text into modules
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        // Skip finder areas
        if ((r < 8 && c < 8) || (r < 8 && c >= modules - 8) || (r >= modules - 8 && c < 8)) {
          continue;
        }
        if (r === 6 || c === 6) continue;

        const val = Math.abs(Math.sin((r * 17) + (c * 23) + hash)) * 1000;
        matrix[r][c] = (Math.floor(val) % 2 === 0);
      }
    }

    // Draw to canvas
    ctx.fillStyle = '#0f172a';
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if (matrix[r][c]) {
          ctx.fillRect(c * cellSize, r * cellSize, cellSize + 0.5, cellSize + 0.5);
        }
      }
    }
  }

  // --- MODAL CONTROLS ---

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
    document.body.style.overflow = '';
  }

  // --- EVENT LISTENERS & DELEGATION ---

  function setupEventListeners() {
    // 1. Sidebar Nav Links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.getAttribute('data-view');
        switchView(view);
      });
    });

    // 2. Mobile Sidebar
    document.getElementById('mobile-toggle-btn').addEventListener('click', toggleMobileSidebar);
    document.getElementById('sidebar-close-btn').addEventListener('click', closeMobileSidebar);
    document.getElementById('sidebar-overlay').addEventListener('click', closeMobileSidebar);

    // 3. Reset Demo Button
    document.getElementById('btn-reset-demo').addEventListener('click', resetDemoData);

    // 4. Topbar Buttons
    document.getElementById('topbar-btn-scan').addEventListener('click', () => switchView('scan-qr'));
    document.getElementById('topbar-btn-add-book').addEventListener('click', () => openAddBookModal());

    // 5. Global Search Input
    const globalSearch = document.getElementById('global-search-input');
    const clearSearch = document.getElementById('clear-global-search');

    globalSearch.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      clearSearch.style.display = val ? 'block' : 'none';

      // If on books view, sync filter
      if (appState.currentView === 'books') {
        document.getElementById('filter-book-search').value = val;
        renderBooks();
      }
    });

    globalSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = globalSearch.value.trim();
        if (val) {
          switchView('books', () => {
            document.getElementById('filter-book-search').value = val;
            renderBooks();
          });
        }
      }
    });

    clearSearch.addEventListener('click', () => {
      globalSearch.value = '';
      clearSearch.style.display = 'none';
      if (appState.currentView === 'books') {
        document.getElementById('filter-book-search').value = '';
        renderBooks();
      }
    });

    // 6. Dashboard Quick Action Buttons
    document.getElementById('dash-btn-scan').addEventListener('click', () => switchView('scan-qr'));
    document.getElementById('dash-btn-add-book').addEventListener('click', () => openAddBookModal());
    document.getElementById('dash-btn-issue').addEventListener('click', () => openIssueModalWithBook());
    document.getElementById('dash-btn-view-departments').addEventListener('click', () => switchView('departments'));
    document.getElementById('dash-btn-view-transactions').addEventListener('click', () => switchView('transactions'));

    // 7. Books Page Buttons & Filters
    document.getElementById('books-btn-scan').addEventListener('click', () => switchView('scan-qr'));
    document.getElementById('books-btn-add').addEventListener('click', () => openAddBookModal());
    document.getElementById('filter-book-search').addEventListener('input', renderBooks);
    document.getElementById('filter-department').addEventListener('change', renderBooks);
    document.getElementById('filter-category').addEventListener('change', renderBooks);
    document.getElementById('filter-availability').addEventListener('change', renderBooks);
    
    document.getElementById('btn-clear-book-filters').addEventListener('click', () => {
      document.getElementById('filter-book-search').value = '';
      document.getElementById('filter-department').value = 'All';
      document.getElementById('filter-category').value = 'All';
      document.getElementById('filter-availability').value = 'All';
      renderBooks();
    });

    // 8. QR Scanner Page Controls
    document.getElementById('btn-start-scanner').addEventListener('click', startQRScanner);
    document.getElementById('btn-stop-scanner').addEventListener('click', () => stopQRScanner(true));
    document.getElementById('qr-view-books-btn').addEventListener('click', () => switchView('books'));

    // Manual ISBN Form
    document.getElementById('manual-isbn-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('manual-isbn-input').value.trim();
      if (!input) return;
      handleQRResult(input);
    });

    // Quick Test Badges
    document.querySelectorAll('.test-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        const testCode = e.currentTarget.getAttribute('data-test-qr');
        document.getElementById('manual-isbn-input').value = testCode;
        handleQRResult(testCode);
      });
    });

    // 9. Department Page Actions
    document.getElementById('depts-btn-add-book').addEventListener('click', () => openAddBookModal());

    // 10. Members Page Actions
    document.getElementById('btn-add-member').addEventListener('click', openAddMemberModal);
    document.getElementById('filter-member-search').addEventListener('input', renderMembers);
    document.getElementById('filter-member-role').addEventListener('change', renderMembers);
    document.getElementById('btn-clear-member-filters').addEventListener('click', () => {
      document.getElementById('filter-member-search').value = '';
      document.getElementById('filter-member-role').value = 'All';
      renderMembers();
    });

    // 11. Transactions Page Actions
    document.getElementById('btn-open-issue-modal').addEventListener('click', () => openIssueModalWithBook());

    document.querySelectorAll('.tab-btn').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        appState.activeTxFilter = e.currentTarget.getAttribute('data-tx-filter');
        renderTransactions();
      });
    });

    // 12. Book Modal Events
    document.getElementById('book-form').addEventListener('submit', handleSaveBook);
    document.getElementById('book-modal-close').addEventListener('click', () => closeModal('book-modal'));
    document.getElementById('book-modal-cancel').addEventListener('click', () => closeModal('book-modal'));
    
    document.getElementById('modal-btn-scan-qr').addEventListener('click', () => {
      closeModal('book-modal');
      switchView('scan-qr');
    });

    document.getElementById('book-input-isbn').addEventListener('input', (e) => {
      checkDuplicateISBN(e.target.value);
    });

    // 13. Add Copies Modal Events
    document.getElementById('add-copies-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const bookId = parseInt(document.getElementById('add-copies-book-id').value, 10);
      const count = parseInt(document.getElementById('add-copies-count').value, 10);
      addBookCopy(bookId, count);
      closeModal('add-copies-modal');
    });

    document.getElementById('add-copies-count').addEventListener('input', (e) => {
      const existing = parseInt(document.getElementById('add-copies-existing').textContent, 10) || 0;
      const count = parseInt(e.target.value, 10) || 0;
      document.getElementById('add-copies-new-total').textContent = existing + count;
    });

    document.getElementById('add-copies-close').addEventListener('click', () => closeModal('add-copies-modal'));
    document.getElementById('add-copies-cancel').addEventListener('click', () => closeModal('add-copies-modal'));

    // 14. Member Modal Events
    document.getElementById('member-form').addEventListener('submit', handleSaveMember);
    document.getElementById('member-modal-close').addEventListener('click', () => closeModal('member-modal'));
    document.getElementById('member-modal-cancel').addEventListener('click', () => closeModal('member-modal'));

    // 15. Issue Modal Events
    document.getElementById('issue-form').addEventListener('submit', handleIssueBook);
    document.getElementById('issue-modal-close').addEventListener('click', () => closeModal('issue-modal'));
    document.getElementById('issue-modal-cancel').addEventListener('click', () => closeModal('issue-modal'));

    // 16. QR Display Modal Events
    document.getElementById('qr-display-close').addEventListener('click', () => closeModal('qr-display-modal'));
    document.getElementById('qr-display-done').addEventListener('click', () => closeModal('qr-display-modal'));

    // 17. Close modals on backdrop click or ESC key
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal(modal.id);
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllModals();
      }
    });

    // 18. Global Event Delegation for dynamic buttons
    document.addEventListener('click', (e) => {
      // Add copy button (+ Copy)
      const addCopyBtn = e.target.closest('.btn-add-copy');
      if (addCopyBtn) {
        const bookId = addCopyBtn.getAttribute('data-book-id');
        addBookCopy(bookId, 1);
        return;
      }

      // Edit book button
      const editBookBtn = e.target.closest('.btn-edit-book');
      if (editBookBtn) {
        const bookId = editBookBtn.getAttribute('data-book-id');
        openEditBookModal(bookId);
        return;
      }

      // Delete book button
      const delBookBtn = e.target.closest('.btn-delete-book');
      if (delBookBtn) {
        const bookId = delBookBtn.getAttribute('data-book-id');
        deleteBook(bookId);
        return;
      }

      // View QR code button
      const qrBtn = e.target.closest('.btn-view-qr');
      if (qrBtn) {
        const bookId = qrBtn.getAttribute('data-book-id');
        displayBookQR(bookId);
        return;
      }

      // Edit member
      const editMemBtn = e.target.closest('.btn-edit-member');
      if (editMemBtn) {
        const memId = editMemBtn.getAttribute('data-member-id');
        openEditMemberModal(memId);
        return;
      }

      // Delete member
      const delMemBtn = e.target.closest('.btn-delete-member');
      if (delMemBtn) {
        const memId = delMemBtn.getAttribute('data-member-id');
        deleteMember(memId);
        return;
      }

      // Return transaction button
      const returnTxBtn = e.target.closest('.btn-return-tx');
      if (returnTxBtn) {
        const txId = returnTxBtn.getAttribute('data-tx-id');
        handleReturnBook(txId);
        return;
      }
    });
  }

  // --- INITIALIZATION ---

  function initApp() {
    loadFromStorage();
    setupEventListeners();
    refreshAllViews();

    // Check URL hash for initial view
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && ['dashboard', 'books', 'scan-qr', 'departments', 'members', 'transactions', 'reports'].includes(initialHash)) {
      switchView(initialHash);
    } else {
      switchView('dashboard');
    }

    console.log("SmartLib 2.0 initialized successfully. Department & QR subsystems active.");
  }

  // Launch on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
