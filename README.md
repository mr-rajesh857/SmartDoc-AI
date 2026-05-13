# RAG Project

A comprehensive Retrieval-Augmented Generation (RAG) system with OCR capabilities, user authentication, and analytics.

## Overview

This project combines a Next.js frontend with a FastAPI backend to provide a document processing and retrieval system. It features:

- **Document Upload & Processing**: Upload documents and automatically extract text using OCR
- **Semantic Search**: Query your document collection using embeddings-based retrieval
- **User Authentication**: Secure role-based access control
- **Analytics**: Track usage and document processing metrics
- **Chroma Vector DB**: Persistent vector storage for embeddings

## Tech Stack

### Frontend

- **Next.js 13+** - React framework with server-side rendering
- **JavaScript** - Frontend logic and API integration
- **CSS Modules** - Scoped styling

### Backend

- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **Alembic** - Database migrations
- **Chroma** - Vector database for embeddings
- **OCR Support** - Document text extraction
- **SQL** - Data storage

## Project Structure

```
rag_project/
├── backend/              # FastAPI application
│   ├── auth/            # Authentication logic
│   ├── storage/         # File and vector storage
│   ├── alembic/         # Database migrations
│   ├── main.py          # App entry point
│   ├── rag_pipeline.py  # RAG logic
│   ├── ocr_models.py    # OCR implementation
│   └── requirements.txt # Python dependencies
├── frontend/            # Next.js application
│   ├── app/            # Pages and components
│   ├── public/         # Static assets
│   └── package.json    # Node dependencies
└── README.md           # This file
```

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Create a Python virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Set up the database:

   ```bash
   alembic upgrade head
   ```

5. (Optional) Seed initial data:

   ```bash
   python seed.py
   ```

6. Start the backend server:
   ```bash
   python main.py
   ```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user

### RAG Pipeline

- `POST /rag/upload` - Upload and process documents
- `POST /rag/search` - Search documents semantically
- `GET /rag/documents` - List user documents

### Analytics

- `GET /analytics/stats` - Get usage statistics
- `GET /analytics/documents` - Get document analytics

## Usage

1. **Register/Login**: Create an account and authenticate
2. **Upload Documents**: Upload PDF or text documents
3. **Search**: Use semantic search to query your documents
4. **View Analytics**: Check processing metrics and usage

## Features

- ✅ Multi-user support with role-based access
- ✅ Semantic search using embeddings
- ✅ OCR for document text extraction
- ✅ Persistent vector storage
- ✅ Usage analytics and monitoring
- ✅ Secure API with authentication

## Contributing

For developer-level information, setup instructions, and contribution guidelines, see [DEVELOPER.md](DEVELOPER.md).

## Support

For issues and feature requests, please open an issue in the project repository.
