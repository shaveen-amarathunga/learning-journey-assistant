from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required


# this is REQ-SEC-02 - being logged in isn't enough, you also need to
# be the actual student whose data you're asking for. stick this
# decorator on any route like /students/<student_id>/... and it'll
# block anyone trying to look at someone else's stuff
def require_self(student_id_param: str = "student_id"):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            requested_id = kwargs.get(student_id_param)
            current_id = get_jwt_identity()

            # token says who you are, URL says whose data you want -
            # if those don't match, no data for you
            if requested_id != current_id:
                return jsonify({
                    "error": "You do not have permission to access this student's data"
                }), 403

            return fn(*args, **kwargs)

        return wrapper

    return decorator