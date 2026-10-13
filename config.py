import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'smartlib-super-secret-key-2026-secure-session')
    DATABASE = os.path.join(BASE_DIR, 'database.db')
    
    # Library business parameters
    DEFAULT_FINE_RATE = 5.0  # ₹5 per day overdue
    DEFAULT_LOAN_DAYS = 14   # 14 days standard borrowing duration
    
    # Session security
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 86400  # 24 hours in seconds
