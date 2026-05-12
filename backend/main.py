import os
import logging
import uuid
import asyncio
from contextlib import contextmanager
from pathlib import Path

import fitz  # PyMuPDF
import google.generativeai as genai
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from dotenv import load_dotenv
from auth.deps import get_current_user
from auth.routes import router as auth_router

load_dotenv()

# Ensure API key is set and provide a helpful error if not.
_gemini_key = os.getenv("GEMINI_API_KEY")
if not _gemini_key:
    raise RuntimeError(
        "GEMINI_API_KEY not set. Create a .env file or set the environment variable with a valid Google Generative Language API key."
    )

genai.configure(api_key=_gemini_key)
model = genai.GenerativeModel("gemini-2.5-flash")

app = FastAPI(title="RAG OCR API")

UPLOAD_ROOT = Path(__file__).resolve().parent / "storage" / "uploads"
LOG_ROOT = Path(__file__).resolve().parent / "storage" / "logs"
CHUNK_SIZE = 5

LOG_ROOT.mkdir(parents=True, exist_ok=True)

app_logger = logging.getLogger("rag_ocr")
if not app_logger.handlers:
    app_logger.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")

    file_handler = logging.FileHandler(LOG_ROOT / "app.log", encoding="utf-8")
    file_handler.setFormatter(formatter)
    app_logger.addHandler(file_handler)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    app_logger.addHandler(console_handler)


@contextmanager
def document_logger(document_dir: Path):
    """Attach a per-document file logger for the current upload."""
    logger = logging.getLogger(f"rag_ocr.{document_dir.name}")
    logger.setLevel(logging.INFO)
    logger.propagate = True

    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    handler = logging.FileHandler(document_dir / "process.log", encoding="utf-8")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    try:
        yield logger
    finally:
        logger.removeHandler(handler)
        handler.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OCR_PROMPT = """Extract all the text from this document page exactly as it appears.
Preserve structure, headings, tables, and formatting as much as possible.
Return only the extracted text, nothing else."""


def extract_pages_from_pdf(pdf_bytes: bytes, logger: logging.Logger | None = None) -> List[bytes]:
    """Split PDF into individual pages, return each page as bytes."""
    if logger:
        logger.info("Extracting individual pages from source PDF")
    pages = []
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for page_num in range(len(doc)):
            single_page = fitz.open()
            single_page.insert_pdf(doc, from_page=page_num, to_page=page_num)
            page_bytes = single_page.tobytes()
            pages.append(page_bytes)
            if logger:
                logger.info("Extracted page %s of %s", page_num + 1, len(doc))
    return pages


def extract_chunk_from_pdf(pdf_bytes: bytes, start_page: int, end_page: int) -> bytes:
    """Build a PDF chunk containing pages in the inclusive range."""
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        chunk_doc = fitz.open()
        chunk_doc.insert_pdf(doc, from_page=start_page, to_page=end_page)
        return chunk_doc.tobytes()


def save_pdf_chunks(user_id: int, document_id: str, pdf_bytes: bytes, logger: logging.Logger | None = None) -> dict:
    """Persist the original PDF and 5-page chunks under a user/document folder."""
    document_dir = UPLOAD_ROOT / str(user_id) / document_id
    document_dir.mkdir(parents=True, exist_ok=True)

    if logger:
        logger.info("Created document folder at %s", document_dir)

    original_path = document_dir / f"{document_id}.pdf"
    original_path.write_bytes(pdf_bytes)

    if logger:
        logger.info("Saved original PDF to %s", original_path)

    chunk_files = []
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        total_pages = len(doc)
        for chunk_index, start_page in enumerate(range(0, total_pages, CHUNK_SIZE), start=1):
            end_page = min(start_page + CHUNK_SIZE - 1, total_pages - 1)
            chunk_bytes = extract_chunk_from_pdf(pdf_bytes, start_page, end_page)
            chunk_name = f"chunk_{chunk_index:03d}_pages_{start_page + 1}-{end_page + 1}.pdf"
            chunk_path = document_dir / chunk_name
            chunk_path.write_bytes(chunk_bytes)
            if logger:
                logger.info(
                    "Saved chunk %s covering pages %s-%s to %s",
                    chunk_index,
                    start_page + 1,
                    end_page + 1,
                    chunk_path,
                )
            chunk_files.append({
                "chunk_index": chunk_index,
                "start_page": start_page + 1,
                "end_page": end_page + 1,
                "path": str(chunk_path),
            })

    return {
        "document_dir": str(document_dir),
        "original_path": str(original_path),
        "chunk_files": chunk_files,
    }


def ocr_page_with_gemini(page_bytes: bytes, page_num: int, logger: logging.Logger | None = None) -> dict:
    """Send a single PDF page to Gemini for OCR."""
    try:
        if logger:
            logger.info("Starting OCR for page %s", page_num + 1)
        pdf_part = {
            "mime_type": "application/pdf",
            "data": page_bytes
        }
        response = model.generate_content([OCR_PROMPT, pdf_part])
        if logger:
            logger.info("Completed OCR for page %s", page_num + 1)
        return {
            "page": page_num + 1,
            "text": response.text.strip(),
            "status": "success"
        }
    except Exception as e:
        if logger:
            logger.exception("OCR failed for page %s", page_num + 1)
        return {
            "page": page_num + 1,
            "text": "",
            "status": "error",
            "error": str(e)
        }


async def ocr_page_with_gemini_async(page_bytes: bytes, page_num: int, logger: logging.Logger | None = None) -> dict:
    """Run the blocking Gemini OCR call in a worker thread."""
    return await asyncio.to_thread(ocr_page_with_gemini, page_bytes, page_num, logger)


@app.get("/")
def root():
    return {"message": "RAG OCR API is running"}


@app.post("/ocr")
async def ocr_pdfs(files: List[UploadFile] = File(...), current_user=Depends(get_current_user)):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    results = []

    for file in files:
        app_logger.info("Received upload from user_id=%s filename=%s", current_user.id, file.filename)
        if not file.filename.endswith(".pdf"):
            app_logger.info("Rejected non-PDF upload filename=%s", file.filename)
            results.append({
                "filename": file.filename,
                "status": "error",
                "error": "Only PDF files are supported",
                "pages": []
            })
            continue

        pdf_bytes = await file.read()
        document_id = uuid.uuid4().hex
        document_dir = UPLOAD_ROOT / str(current_user.id) / document_id
        document_dir.mkdir(parents=True, exist_ok=True)
        with document_logger(document_dir) as logger:
            logger.info("Starting processing for filename=%s user_id=%s document_id=%s", file.filename, current_user.id, document_id)
            stored_files = save_pdf_chunks(current_user.id, document_id, pdf_bytes, logger)
            pages = extract_pages_from_pdf(pdf_bytes, logger)

            page_tasks = [ocr_page_with_gemini_async(page_bytes, page_num, logger) for page_num, page_bytes in enumerate(pages)]
            page_results = await asyncio.gather(*page_tasks)
            logger.info("Finished processing document_id=%s total_pages=%s", document_id, len(pages))

        results.append({
            "filename": file.filename,
            "document_id": document_id,
            "user_id": current_user.id,
            "total_pages": len(pages),
            "chunk_size": CHUNK_SIZE,
            "stored_files": stored_files,
            "status": "success",
            "pages": page_results
        })

    return {"results": results}


# include auth router
app.include_router(auth_router, prefix="/auth", tags=["auth"])