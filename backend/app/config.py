"""
Configuration for the Learning Journey Assistant backend.
Reads settings from environment variables where possible.
"""
import os
from pathlib import Path

# Base directory of the project (where run.py lives)
BASE_DIR = Path(__file__).resolve().parent.parent


class Config:
    # Flask settings
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-in-production")

    # Database — SQLite file stored in the project root
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{BASE_DIR / 'database.db'}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Path where mock Moodle data lives
    MOCK_MOODLE_DATA_DIR = BASE_DIR / "data"

    # Debug mode for development
    DEBUG = True