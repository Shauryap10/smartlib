import re
from flask import Blueprint, render_template, request, redirect, url_for, session, flash, jsonify
from models.user import (
    get_user_by_identifier, verify_user_password, create_user,
    check_email_exists, check_student_id_exists
)
from models.department import get_all_departments
from models.db import log_activity

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    # If already logged in, redirect to respective dashboard
    if 'user_id' in session:
        if session.get('role') == 'librarian':
            return redirect(url_for('admin.dashboard'))
        return redirect(url_for('user.dashboard'))

    if request.method == 'POST':
        identifier = request.form.get('identifier', '').strip()
        password = request.form.get('password', '')

        if not identifier or not password:
            flash("Please enter both email/username and password.", "danger")
            return render_template('login.html', identifier=identifier)

        user = get_user_by_identifier(identifier)
        if not user or not verify_user_password(user, password):
            flash("Invalid email/username or password. Please verify your credentials.", "danger")
            return render_template('login.html', identifier=identifier)

        if user['status'] != 'active':
            flash("Your account is currently blocked by library administration. Please contact the librarian.", "danger")
            return render_template('login.html', identifier=identifier)

        # Authentication successful
        session.clear()
        session['user_id'] = user['id']
        session['user_name'] = user['full_name']
        session['email'] = user['email']
        session['student_id'] = user['student_id']
        session['role'] = user['role']

        log_activity(user['id'], 'LOGIN', f"User {user['email']} logged in successfully as {user['role']}.")

        flash(f"Welcome back, {user['full_name']}!", "success")

        # Next redirection or role-based dashboard
        next_url = request.args.get('next')
        if next_url and next_url.startswith('/'):
            return redirect(next_url)

        if user['role'] == 'librarian':
            return redirect(url_for('admin.dashboard'))
        else:
            return redirect(url_for('user.dashboard'))

    return render_template('login.html')

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    # Only prospective students/users can register here
    departments = get_all_departments()

    if request.method == 'POST':
        full_name = request.form.get('full_name', '').strip()
        student_id = request.form.get('student_id', '').strip()
        email = request.form.get('email', '').strip()
        mobile = request.form.get('mobile', '').strip()
        department_id = request.form.get('department_id')
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')

        # Validations
        if not full_name or not student_id or not email or not department_id or not password:
            flash("All fields marked with an asterisk (*) are required.", "danger")
            return render_template('register.html', departments=departments, form=request.form)

        # Email format validation
        email_regex = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(email_regex, email):
            flash("Please enter a valid email address.", "danger")
            return render_template('register.html', departments=departments, form=request.form)

        if len(password) < 6:
            flash("Password must be at least 6 characters long.", "danger")
            return render_template('register.html', departments=departments, form=request.form)

        if password != confirm_password:
            flash("Password confirmation does not match.", "danger")
            return render_template('register.html', departments=departments, form=request.form)

        if check_email_exists(email):
            flash("An account with this email address already exists. Please log in instead.", "warning")
            return render_template('register.html', departments=departments, form=request.form)

        if check_student_id_exists(student_id):
            flash("This Student ID / Roll Number is already registered. Please check your ID.", "warning")
            return render_template('register.html', departments=departments, form=request.form)

        # Create student user with hashed password
        try:
            new_id = create_user(
                full_name=full_name,
                student_id=student_id,
                email=email,
                mobile=mobile,
                department_id=int(department_id),
                password=password,
                role='user',
                status='active'
            )
            log_activity(new_id, 'REGISTER', f"New student account created: {email} ({student_id})")
            flash("Registration successful! You may now log in with your credentials.", "success")
            return redirect(url_for('auth.login'))
        except Exception as e:
            flash("An error occurred during registration. Please try again.", "danger")
            return render_template('register.html', departments=departments, form=request.form)

    return render_template('register.html', departments=departments)

@auth_bp.route('/logout')
def logout():
    uid = session.get('user_id')
    if uid:
        log_activity(uid, 'LOGOUT', "User logged out.")
    session.clear()
    flash("You have been successfully logged out.", "info")
    return redirect(url_for('auth.login'))
