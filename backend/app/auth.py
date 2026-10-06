from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token

from app.models import db, Student

auth = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth.route("/login", methods=["POST"])
def login():
    body = request.get_json(silent=True)

    # Students can sign in with either their student ID or their email.
    identifier = (body or {}).get("student_id") or (body or {}).get("email")

    if not identifier or "password" not in body:
        return jsonify({
            "error": "student_id (or email) and password are required"
        }), 400

    student = db.session.get(Student, identifier) or Student.query.filter(
        db.func.lower(Student.email) == str(identifier).strip().lower()
    ).first()

    if not student or not student.check_password(body["password"]):
        return jsonify({
            "error": "Invalid credentials"
        }), 401

    access_token = create_access_token(identity=student.id)

    return jsonify({
        "access_token": access_token,
        "student_id": student.id,
        "name": student.name,
    }), 200