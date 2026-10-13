import os
from flask import Flask, render_template, redirect, url_for, session
from config import Config
from models.db import init_db
from models.user import get_user_by_id
from models.department import get_all_departments

# Import blueprints
from routes.auth import auth_bp
from routes.user import user_bp
from routes.admin import admin_bp
from routes.books import books_bp
from routes.transactions import trans_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize SQLite database schema and seed default data
    init_db()

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(books_bp)
    app.register_blueprint(trans_bp)

    @app.context_processor
    def inject_globals():
        user = None
        if 'user_id' in session:
            user = get_user_by_id(session['user_id'])
        return {
            'current_user': user,
            'departments_list': get_all_departments()
        }

    @app.route('/')
    def index():
        if 'user_id' not in session:
            return redirect(url_for('auth.login'))
        if session.get('role') == 'librarian':
            return redirect(url_for('admin.dashboard'))
        return redirect(url_for('user.dashboard'))

    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('errors/404.html'), 404

    @app.errorhandler(403)
    def access_denied(e):
        return render_template('errors/403.html'), 403

    @app.errorhandler(500)
    def internal_error(e):
        return render_template('errors/500.html'), 500

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    print(f"==================================================")
    print(f"SmartLib Server starting on http://127.0.0.1:{port}")
    print(f"Librarian demo: username=librarian, password=librarian123")
    print(f"Student demo:   username=student@smartlib.edu, password=student123")
    print(f"==================================================")
    app.run(host='0.0.0.0', port=port, debug=True)
