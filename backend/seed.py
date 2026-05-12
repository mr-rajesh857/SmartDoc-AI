"""Seed and DB management helper for the backend.

Features:
- Ensure database exists
- Initialize tables with `init_db()`
- Optionally run Alembic migrations
- Seed an admin user or reset its password
- Drop all tables (dangerous)

Usage examples:
    python backend/seed.py --ensure-db --init-db --seed-admin
    python backend/seed.py --migrate
    python backend/seed.py --drop-all --yes-drop
"""

import os
import sys
import subprocess
import argparse
from dotenv import load_dotenv
import pymysql

load_dotenv()

# Ensure backend directory is on path when running from project root
sys.path.append(os.path.dirname(__file__))

from db import init_db, SessionLocal, engine, Base
from auth import crud
from auth.utils import hash_password


def ensure_database_exists():
    db_user = os.getenv("DB_USER", "root")
    db_password = os.getenv("DB_PASSWORD", "password")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = int(os.getenv("DB_PORT", "3306"))
    db_name = os.getenv("DB_NAME", "rag_db")

    connection = pymysql.connect(
        host=db_host,
        user=db_user,
        password=db_password,
        port=db_port,
        autocommit=True,
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
    finally:
        connection.close()


def run_alembic_upgrade():
    print("Running Alembic migrations...")
    # Run alembic using the project alembic.ini
    subprocess.run([sys.executable, "-m", "alembic", "-c", "alembic.ini", "upgrade", "head"], check=True)


def drop_all_tables():
    print("Dropping all tables (this is destructive)...")
    Base.metadata.drop_all(bind=engine)
    print("Dropped all tables.")


def seed_admin(admin_username: str, admin_email: str, admin_pass: str, reset_password: bool = False):
    db = SessionLocal()
    try:
        existing = crud.get_user_by_email(db, admin_email)
        if existing:
            if reset_password:
                print("Resetting admin password...")
                existing.hashed_password = hash_password(admin_pass)
                db.add(existing)
                db.commit()
                print("Admin password updated.")
            else:
                print("Admin user already exists:", existing.email)
        else:
            from auth.schemas import UserCreate

            admin = UserCreate(username=admin_username, email=admin_email, password=admin_pass, role="admin")
            user = crud.create_user(db, admin)
            print(f"Created admin user: {user.email}")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="DB helper for backend")
    parser.add_argument("--ensure-db", action="store_true", help="Create the database if it does not exist")
    parser.add_argument("--init-db", action="store_true", help="Call Base.metadata.create_all to ensure tables exist")
    parser.add_argument("--migrate", action="store_true", help="Run Alembic migrations (alembic must be installed)")
    parser.add_argument("--seed-admin", action="store_true", help="Create admin user if missing")
    parser.add_argument("--reset-admin-password", action="store_true", help="Reset admin password if user exists")
    parser.add_argument("--drop-all", action="store_true", help="Drop all tables (destructive)")
    parser.add_argument("--yes-drop", action="store_true", help="Confirm destructive drop")
    parser.add_argument("--admin-email", default=os.getenv("ADMIN_EMAIL", "admin@example.com"))
    parser.add_argument("--admin-pass", default=os.getenv("ADMIN_PASSWORD", "adminpass"))
    parser.add_argument("--admin-username", default=os.getenv("ADMIN_USERNAME", "admin"))

    args = parser.parse_args()

    try:
        if args.ensure_db:
            ensure_database_exists()

        if args.migrate:
            run_alembic_upgrade()

        if args.init_db:
            print("Initializing database tables...")
            init_db()

        if args.drop_all:
            if not args.yes_drop:
                print("Refusing to drop tables without --yes-drop")
            else:
                drop_all_tables()

        if args.seed_admin or args.reset_admin_password:
            seed_admin(args.admin_username, args.admin_email, args.admin_pass, reset_password=args.reset_admin_password)

        if not any([args.ensure_db, args.migrate, args.init_db, args.drop_all, args.seed_admin, args.reset_admin_password]):
            # default behavior: ensure db, init tables, seed admin
            ensure_database_exists()
            print("Initializing database tables...")
            init_db()
            seed_admin(args.admin_username, args.admin_email, args.admin_pass)

    except subprocess.CalledProcessError as e:
        print("Command failed:", e)
    except Exception as e:
        print("Error:", e)


if __name__ == "__main__":
    main()
