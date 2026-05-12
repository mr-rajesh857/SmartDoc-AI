from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.deps import get_current_user
from rag_pipeline import build_rag_pipeline

router = APIRouter(prefix="/rag", tags=["rag"])


class AskRequest(BaseModel):
    query: str
    document_uuid: str | None = None
    top_k: int = 10


_pipeline = None


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = build_rag_pipeline()
    return _pipeline


@router.post("/index/{document_uuid}")
def index_document(document_uuid: str, _=Depends(get_current_user)):
    try:
        pipeline = get_pipeline()
        return pipeline.index_document(document_uuid=document_uuid, force_reindex=False)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Indexing failed: {exc}")


@router.post("/ask")
def ask_question(payload: AskRequest, _=Depends(get_current_user)):
    try:
        pipeline = get_pipeline()

        # Ensure document is indexed before retrieval when a specific document is provided.
        if payload.document_uuid:
            pipeline.index_document(document_uuid=payload.document_uuid, force_reindex=False)

        return pipeline.answer_query(
            query=payload.query,
            doc_id=payload.document_uuid,
            top_k=payload.top_k,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"RAG query failed: {exc}")
