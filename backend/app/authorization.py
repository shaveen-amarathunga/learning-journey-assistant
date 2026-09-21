from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required


def require_self(student_id_param="student_id"):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            requested_id = kwargs.get(student_id_param)
            current_id = get_jwt_identity()

            if requested_id != current_id:
                return jsonify({
                    "error": "You do not have permission to access this student's data"
                }), 403

            return fn(*args, **kwargs)

        return wrapper

    return decorator