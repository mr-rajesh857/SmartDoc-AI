# Developer Guide

Comprehensive documentation for developers working on the RAG Project.

## Table of Contents

1. [Architecture](#architecture)
2. [Development Environment](#development-environment)
3. [Backend Development](#backend-development)
4. [Frontend Development](#frontend-development)
5. [Database](#database)
6. [API Implementation](#api-implementation)
7. [Code Structure](#code-structure)
8. [Testing & Debugging](#testing--debugging)
9. [Performance Optimization](#performance-optimization)
10. [Contributing Guidelines](#contributing-guidelines)

---

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Pages: Login, Register, Upload, Analytics, Search       ││
│  └─────────────────────────────────────────────────────────┘│
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP/REST API
┌────────────────────────────▼────────────────────────────────┐
│                   Backend (FastAPI)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  Auth Layer  │ │ RAG Pipeline │ │  Analytics   │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         SQLAlchemy ORM + SQL                           │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Chroma Vector Database                         │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           File Storage (./storage/uploads)             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

- **Frontend**: User interface, authentication flow, document upload, search UI
- **Authentication**: User management, role-based access control (RBAC)
- **RAG Pipeline**: Document ingestion, text extraction, embedding generation, semantic search
- **OCR Models**: Text extraction from PDFs
- **Analytics**: Usage tracking and document metrics
- **Storage**: Persistent file and vector storage

---

## Development Environment

### Backend Setup

1. **Virtual Environment**

   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   venv\Scripts\activate  # Windows
   ```

2. **Install Dev Dependencies**

   ```bash
   pip install -r requirements.txt
   # Additional dev tools (optional)
   pip install pytest pytest-asyncio black flake8
   ```

3. **Environment Variables** (create `.env` if needed)

   ```
   DATABASE_URL=sqlite:///./test.db
   SECRET_KEY=your-secret-key-here
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

4. **Database Initialization**
   ```bash
   alembic upgrade head
   ```

### Frontend Setup

1. **Install Dependencies**

   ```bash
   cd frontend
   npm install
   ```

2. **Development Server**
   ```bash
   npm run dev
   ```
   Server runs on `http://localhost:3000`

### IDE Configuration

For VS Code, create `.vscode/settings.json`:

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/backend/venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "editor.formatOnSave": true,
  "[python]": {
    "editor.defaultFormatter": "ms-python.python",
    "editor.formatOnSave": true
  }
}
```

---

## Backend Development

### Project Structure

```
backend/
├── auth/
│   ├── __init__.py
│   ├── models.py          # User, Role SQLAlchemy models
│   ├── schemas.py         # Pydantic request/response schemas
│   ├── crud.py            # Database operations
│   ├── routes.py          # Auth endpoints
│   ├── utils.py           # Password hashing, JWT
│   └── deps.py            # Dependency injection
├── main.py                # FastAPI app initialization
├── db.py                  # Database setup
├── rag_pipeline.py        # RAG implementation
├── rag_routes.py          # RAG endpoints
├── ocr_models.py          # OCR implementations
├── analytics_routes.py    # Analytics endpoints
├── seed.py                # Database seeding
├── alembic/               # Database migrations
│   ├── env.py
│   ├── script.py.mako
│   └── versions/          # Migration scripts
└── storage/               # File storage
    ├── uploads/           # User uploaded files
    ├── chroma/            # Vector database
    └── logs/              # Application logs
```

### Key Files

#### `main.py`

- FastAPI app initialization
- CORS configuration
- Route registration
- Middleware setup

#### `db.py`

- SQLAlchemy engine/session configuration
- Database connection pooling
- Session factory

#### `auth/models.py`

- User model
- Role model
- User-Role association

#### `rag_pipeline.py`

- Document preprocessing
- Text embedding generation
- Chroma vector store integration
- Semantic search implementation

#### `ocr_models.py`

- OCR engine initialization
- Text extraction logic
- Image preprocessing

### Working with Dependencies

Key Python packages:

- **fastapi**: Web framework
- **sqlalchemy**: ORM
- **pydantic**: Data validation
- **python-jose**: JWT handling
- **passlib**: Password hashing
- **chromadb**: Vector database
- **Gemini Multimodal**: OCR support
- **alembic**: Migrations

Add new dependencies:

```bash
pip install package-name
pip freeze > requirements.txt
```

---

## Frontend Development

### Project Structure

```
frontend/app/
├── layout.js              # Root layout
├── page.js                # Home page
├── globals.css            # Global styles
├── login/
│   └── page.js           # Login page
├── register/
│   └── page.js           # Registration page
├── upload/
│   ├── page.js           # Upload page
│   └── upload-client.js  # Upload client component
└── analytics/
    ├── page.js           # Analytics page
    └── analytics.module.css
```

### Key Components

#### Authentication Flow

- Login/Register pages handle credential submission
- JWT tokens stored in HTTP-only cookies
- Protected routes check token validity

#### Document Upload

- File selection and validation
- Progress tracking
- Error handling and retry logic

#### Search Interface

- Semantic search query input
- Results display with relevance scores
- Pagination support

### API Integration

Example API call:

```javascript
const response = await fetch("/api/rag/search", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: "search term" }),
});
const results = await response.json();
```

### CSS Modules

Uses CSS Modules for scoped styling:

```javascript
import styles from "./page.module.css";

export default function Page() {
  return <div className={styles.container}>Content</div>;
}
```

---

## Database

### Schema Overview

**Users Table**

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username VARCHAR UNIQUE NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  hashed_password VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Roles Table**

```sql
CREATE TABLE roles (
  id INTEGER PRIMARY KEY,
  name VARCHAR UNIQUE NOT NULL
);
```

**User_Roles Association Table**

```sql
CREATE TABLE user_roles (
  user_id INTEGER FOREIGN KEY,
  role_id INTEGER FOREIGN KEY
);
```

**OCR Data Table**

```sql
CREATE TABLE ocr_data (
  id INTEGER PRIMARY KEY,
  user_id INTEGER FOREIGN KEY,
  file_name VARCHAR NOT NULL,
  extracted_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Migrations

View existing migrations:

```bash
alembic history
```

Create new migration:

```bash
alembic revision --autogenerate -m "description"
```

Apply migrations:

```bash
alembic upgrade head
```

Rollback:

```bash
alembic downgrade -1
```

### Database Access

Using SQLAlchemy sessions in routes:

```python
from sqlalchemy.orm import Session
from fastapi import Depends
from .db import get_db

@app.get("/items")
def get_items(db: Session = Depends(get_db)):
    return db.query(Item).all()
```

---

## API Implementation

### Authentication Endpoints

**POST /auth/register**

- Request: `{username, email, password}`
- Response: User object with ID

**POST /auth/login**

- Request: `{username, password}`
- Response: `{access_token, token_type}`

**POST /auth/logout**

- Response: Success message

### RAG Endpoints

**POST /rag/upload**

- Upload document for processing
- Triggers OCR and embedding generation
- Request: multipart form with file

**POST /rag/search**

- Semantic search across documents
- Request: `{query, limit}`
- Response: Array of results with scores

**GET /rag/documents**

- List user's documents
- Response: Array of document metadata

### Analytics Endpoints

**GET /analytics/stats**

- Overall usage statistics
- Response: Stats object

**GET /analytics/documents**

- Per-document metrics
- Response: Array of document analytics

### Error Handling

Standard error responses:

```json
{
  "detail": "Error message",
  "status_code": 400
}
```

Common status codes:

- 200: Success
- 400: Bad request
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error

---

## Code Structure

### Best Practices

1. **Separation of Concerns**
   - Models: Data structures
   - Schemas: API contracts
   - CRUD: Database operations
   - Routes: Endpoints

2. **Error Handling**

   ```python
   from fastapi import HTTPException

   try:
       result = process_data()
   except ValueError as e:
       raise HTTPException(status_code=400, detail=str(e))
   ```

3. **Logging**

   ```python
   import logging
   logger = logging.getLogger(__name__)
   logger.info("Processing document...")
   ```

4. **Type Hints**

   ```python
   from typing import Optional, List

   def search(query: str, limit: int = 10) -> List[dict]:
       pass
   ```

### Code Style

- **Python**: Follow PEP 8 (use black, flake8)
- **JavaScript**: Follow ESLint config in project
- **Naming**: snake_case for Python, camelCase for JS

---

## Testing & Debugging

### Backend Testing

Create test file `test_auth.py`:

```python
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_register():
    response = client.post("/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123"
    })
    assert response.status_code == 200

def test_login():
    response = client.post("/auth/login", json={
        "username": "testuser",
        "password": "testpass123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
```

Run tests:

```bash
pytest test_auth.py -v
```

### Debugging

**FastAPI Debug Mode**

```python
app = FastAPI(debug=True)
```

**Logging**

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

**Interactive Debugger**

```python
import pdb; pdb.set_trace()  # Breakpoint
```

**API Documentation**

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## Performance Optimization

### Backend

1. **Database Indexing**

   ```python
   class User(Base):
       __tablename__ = "users"
       id = Column(Integer, primary_key=True, index=True)
       username = Column(String, unique=True, index=True)
   ```

2. **Query Optimization**
   - Use `select()` statements efficiently
   - Avoid N+1 queries
   - Implement pagination

3. **Caching**

   ```python
   from functools import lru_cache

   @lru_cache(maxsize=128)
   def expensive_operation(x: int):
       return x ** 2
   ```

4. **Async/Await**
   ```python
   async def process_document(file_path: str):
       # Async I/O operations
       pass
   ```

### Frontend

1. **Code Splitting** (Next.js automatic)
2. **Image Optimization** (Next.js Image component)
3. **Lazy Loading**
4. **Caching** (Browser cache headers)

---

## Contributing Guidelines

### Workflow

1. Create feature branch:

   ```bash
   git checkout -b feature/feature-name
   ```

2. Make changes with meaningful commits:

   ```bash
   git commit -m "feat: add feature description"
   ```

3. Push and create pull request:
   ```bash
   git push origin feature/feature-name
   ```

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] No breaking changes
- [ ] Documentation updated
- [ ] Comments explain complex logic

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: feat, fix, docs, style, refactor, test, chore

Example:

```
feat(auth): add password reset functionality

Implement password reset flow with email verification.
Closes #123
```

---

## Common Development Tasks

### Add New API Endpoint

1. Create schema in `schemas.py`
2. Add database model if needed
3. Implement CRUD in `crud.py`
4. Create route in `routes.py`
5. Add tests
6. Update API documentation

### Add Database Migration

```bash
# Make model changes
# Then:
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Add Frontend Page

1. Create directory in `app/`
2. Add `page.js`
3. Add styling if needed
4. Update navigation
5. Test routing

### Debug Vector Search

Check Chroma database:

```python
from chromadb.client import HttpClient
client = HttpClient()
collection = client.get_collection("documents")
results = collection.query(query_texts=["search term"], n_results=5)
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check Python version
python --version  # Should be 3.8+

# Reinstall dependencies
pip install -r requirements.txt --upgrade

# Check database
alembic upgrade head

# Run with verbose logging
python main.py --log-level DEBUG
```

### Frontend Build Issues

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Next.js version
npm list next
```

### Vector Search Not Working

```bash
# Check Chroma connectivity
python -c "import chromadb; print(chromadb.__version__)"

# Clear local Chroma database
rm -rf storage/chroma/
```

---

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/)
- [Chroma Documentation](https://docs.trychroma.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Pydantic Documentation](https://docs.pydantic.dev/)

---

For questions or issues, please check existing documentation or open an issue in the repository.
