"""
Authentication routes.
======================
Implements REQ-SEC-01 students must log in and receive a token
(JWT) before they can call any endpoint that touches student data.

POST /api/auth/login
  body:    {"student_id": "S001", "password": "..."}
  success: 200 {"access_token": "...", "student_id": "S001", "name": "..."}
  failure: 401 {"error": "Invalid credentials"}
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token

from app.models import db, Student

auth = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth.route("/login", methods=["POST"])
def login():
    body = request.get_json(silent=True)
    if not body or "student_id" not in body or "password" not in body:
        return jsonify({"error": "student_id and password are required"}), 400

    student = db.session.get(Student, body["student_id"])

    # Important: give the SAME error whether the student doesn't exist
    # or the password is wrong. Returning different errors for each
    # case lets an attacker discover which student IDs are real.
    if not student or not student.check_password(body["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    access_token = create_access_token(identity=student.id)

    return jsonify({
        "access_token": access_token,
        "student_id": student.id,
        "name": student.name,
    }), 200