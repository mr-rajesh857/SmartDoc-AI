#!/bin/sh

# RAG Project Start Script
# Handles database initialization and application startup

set -e

echo "================================"
echo "RAG Project Startup"
echo "================================"

# Wait for database to be ready
echo "Waiting for database to be ready..."
RETRY_COUNT=0
MAX_RETRIES=30
while ! python -c "
import pymysql
import sys
import os
try:
    conn = pymysql.connect(
        host=os.getenv('DB_HOST', 'db'),
        user=os.getenv('DB_USER', 'rag_user'),
        password=os.getenv('DB_PASSWORD', 'rag_password'),
        database=os.getenv('DB_NAME', 'rag_db'),
        port=int(os.getenv('DB_PORT', 3306))
    )
    conn.close()
    print('Database is ready')
except:
    sys.exit(1)
" 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "Database failed to start after $MAX_RETRIES attempts"
        exit 1
    fi
    echo "Database not ready yet... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 1
done

echo "✓ Database is ready"

# Run database migrations
echo "Running database migrations..."
alembic upgrade head
echo "✓ Migrations completed"

# Initialize database if needed
echo "Initializing database..."
python -c "from db import init_db; init_db(); print('✓ Database initialized')"

# Start the application
echo ""
echo "Starting FastAPI application..."
echo "================================"
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
