"""
Flask application factory.
Creating the app inside a function keeps configuration flexible
(useful for testing, and for switching between dev/production later).
"""
from flask import Flask, jsonify
from flask_cors import CORS

from app.config import Config
from app.models import db


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Allow the frontend (running on a different port) to call our API
    CORS(app)

    # Bind SQLAlchemy to this Flask app
    db.init_app(app)

    # Register API routes (Blueprint from app/routes.py)
    from app.routes import api
    app.register_blueprint(api)

    # ---- Root route (outside the /api prefix) ----
    @app.route("/")
    def index():
        return jsonify({
            "name": "Learning Journey Assistant API",
            "version": "0.1.0",
            "team": "Smart Stack",
            "docs": "See /api/health, /api/info, /api/students, /api/subjects",
        })

    # ---- Global error handlers — return JSON, not HTML ----
    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(_):
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

    @app.errorhandler(400)
    def bad_request(err):
        return jsonify({"error": str(err.description) if hasattr(err, "description") else "Bad request"}), 400

    # ---- Create tables if they don't exist ----
    with app.app_context():
        db.create_all()

    return app