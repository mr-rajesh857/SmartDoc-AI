import os
import json
import fitz  # PyMuPDF
import google.generativeai as genai
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from dotenv import load_dotenv
import tempfile
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


def extract_pages_from_pdf(pdf_bytes: bytes) -> List[bytes]:
    """Split PDF into individual pages, return each page as bytes."""
    pages = []
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for page_num in range(len(doc)):
            single_page = fitz.open()
            single_page.insert_pdf(doc, from_page=page_num, to_page=page_num)
            page_bytes = single_page.tobytes()
            pages.append(page_bytes)
    return pages


def ocr_page_with_gemini(page_bytes: bytes, page_num: int) -> dict:
    """Send a single PDF page to Gemini for OCR."""
    try:
        pdf_part = {
            "mime_type": "application/pdf",
            "data": page_bytes
        }
        response = model.generate_content([OCR_PROMPT, pdf_part])
        return {
            "page": page_num + 1,
            "text": response.text.strip(),
            "status": "success"
        }
    except Exception as e:
        return {
            "page": page_num + 1,
            "text": "",
            "status": "error",
            "error": str(e)
        }


@app.get("/")
def root():
    return {"message": "RAG OCR API is running"}


@app.post("/ocr")
async def ocr_pdfs(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    results = []

    for file in files:
        if not file.filename.endswith(".pdf"):
            results.append({
                "filename": file.filename,
                "status": "error",
                "error": "Only PDF files are supported",
                "pages": []
            })
            continue

        pdf_bytes = await file.read()
        pages = extract_pages_from_pdf(pdf_bytes)

        page_results = []
        for page_num, page_bytes in enumerate(pages):
            page_data = ocr_page_with_gemini(page_bytes, page_num)
            page_results.append(page_data)

        results.append({
            "filename": file.filename,
            "total_pages": len(pages),
            "status": "success",
            "pages": page_results
        })

    return {"results": results}


# include auth router
app.include_router(auth_router, prefix="/auth", tags=["auth"])