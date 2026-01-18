"""Utility to create all tables from models (development only).

WARNING: This does NOT migrate data or alter existing tables safely. If you already
have a production DB, prefer to use Alembic migrations. This script is intended
for local development: delete `neocare.db` and run this script to create a fresh DB.
"""
from database import engine, Base

print("Creating database tables (development only). If you have an existing 'neocare.db', BACK IT UP or delete it first.")
Base.metadata.create_all(bind=engine)
print("Done.")
