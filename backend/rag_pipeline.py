import os
import re
import time
import uuid
import logging
from datetime import datetime
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import google.generativeai as genai
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import SessionLocal
from ocr_models import OcrData

try:
    import chromadb
    from chromadb.config import Settings
except ImportError as exc:
    chromadb = None
    Settings = None
    _chromadb_import_error = exc
else:
    _chromadb_import_error = None


LOGGER = logging.getLogger("rag_pipeline")
LOGGER.setLevel(logging.INFO)


@dataclass
class ChunkRecord:
    chunk_id: str
    text: str
    metadata: Dict[str, Any]


class RAGPipeline:
    """
    End-to-end RAG pipeline for OCR documents.

    Phase 1 (indexing):
    - fetch OCR JSON from DB
    - clean text and keep page mapping
    - chunk text (question-aware + overlap)
    - create metadata
    - generate document embeddings
    - upsert into Chroma collection

    Phase 2 (query):
    - validate query
    - generate query embedding
    - retrieve top-k chunks from Chroma
    - filter/rerank
    - build grounded prompt
    - call Gemini 1.5 Flash
    - return answer + sources + retrieval metadata
    """

    def __init__(
        self,
        chroma_path: str = "storage/chroma",
        collection_name: str = "pdf_rag_docs",
        embedding_model: str = "models/text-embedding-004",
        llm_model: str = "gemini-1.5-flash",
        chunk_size: int = 500,
        chunk_overlap: int = 80,
        similarity_threshold: float = 0.7,
    ) -> None:
        if chromadb is None:
            raise ImportError(
                "chromadb is required for RAG. Install it with: pip install chromadb"
            ) from _chromadb_import_error

        self.embedding_model = embedding_model
        self.llm_model_name = llm_model
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.similarity_threshold = similarity_threshold

        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY is required to use Gemini services")
        genai.configure(api_key=api_key)
        self.llm_model = genai.GenerativeModel(self.llm_model_name)

        os.makedirs(chroma_path, exist_ok=True)
        self.chroma_client = chromadb.PersistentClient(
            path=chroma_path,
            settings=Settings(anonymized_telemetry=False),
        )
        self.collection = self.chroma_client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    # -----------------------------
    # Phase 1: Indexing pipeline
    # -----------------------------

    def index_document(self, document_uuid: str, force_reindex: bool = False) -> Dict[str, Any]:
        """
        Index one OCR document from DB into ChromaDB.
        Runs once per document unless force_reindex=True.
        """
        with SessionLocal() as db:
            record = (
                db.query(OcrData)
                .filter(OcrData.document_uuid == document_uuid)
                .order_by(OcrData.id.desc())
                .first()
            )
            if not record:
                raise ValueError(f"No OCR record found for document_uuid={document_uuid}")

            existing_chunk_count = self._count_document_chunks(document_uuid)
            if existing_chunk_count > 0 and not force_reindex:
                return {
                    "status": "skipped",
                    "reason": "already_indexed",
                    "document_uuid": document_uuid,
                    "existing_chunks": existing_chunk_count,
                }

            cleaned_text, page_spans = self._preprocess_ocr_text(record.ocr_json)
            chunks = self._chunk_document(
                doc_id=record.document_uuid,
                cleaned_text=cleaned_text,
                page_spans=page_spans,
            )

            if not chunks:
                raise ValueError("No chunks generated from OCR content")

            vectors = self._embed_documents([chunk.text for chunk in chunks])
            self._upsert_chunks(chunks, vectors)
            collection_count = self.collection.count()

            self._mark_document_indexed(db, record.id)

            return {
                "status": "indexed",
                "document_uuid": document_uuid,
                "ocr_record_id": record.id,
                "num_chunks": len(chunks),
                "collection_count": collection_count,
            }

    def _preprocess_ocr_text(self, ocr_json: Dict[str, str]) -> Tuple[str, List[Dict[str, int]]]:
        """
        Fetch + clean OCR text page-by-page and produce a continuous document string.
        Also returns page span mapping for metadata attribution.
        """
        if not ocr_json:
            return "", []

        page_items: List[Tuple[int, str]] = []
        for key, value in ocr_json.items():
            try:
                page_num = int(key)
            except (TypeError, ValueError):
                continue
            page_items.append((page_num, value or ""))
        page_items.sort(key=lambda x: x[0])

        # Detect repeating short lines across many pages (likely headers/footers).
        line_freq: Dict[str, int] = {}
        for _, raw_page in page_items:
            lines = [ln.strip() for ln in raw_page.splitlines() if ln.strip()]
            for ln in set(lines[:3] + lines[-3:]):
                if 1 <= len(ln) <= 80:
                    line_freq[ln] = line_freq.get(ln, 0) + 1

        repeat_cutoff = max(2, int(len(page_items) * 0.6))
        repeated_lines = {ln for ln, cnt in line_freq.items() if cnt >= repeat_cutoff}

        doc_parts: List[str] = []
        page_spans: List[Dict[str, int]] = []
        cursor = 0

        for page_num, raw_page in page_items:
            cleaned_page = self._clean_page_text(raw_page, repeated_lines)
            if not cleaned_page:
                continue

            start = cursor
            doc_parts.append(cleaned_page)
            cursor += len(cleaned_page)
            end = cursor

            doc_parts.append("\n\n")
            cursor += 2

            page_spans.append({"page_number": page_num, "start": start, "end": end})

        full_text = "".join(doc_parts).strip()
        return full_text, page_spans

    def _clean_page_text(self, text_value: str, repeated_lines: set[str]) -> str:
        text_value = text_value.replace("\r\n", "\n").replace("\r", "\n")
        text_value = re.sub(r"\u00ad", "", text_value)  # soft hyphen
        text_value = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text_value)

        lines = [ln.strip() for ln in text_value.split("\n")]
        cleaned_lines: List[str] = []

        for ln in lines:
            if not ln:
                continue
            if ln in repeated_lines:
                continue

            # Remove isolated page-number-like noise.
            if re.fullmatch(r"(?:page\s*)?\d{1,4}", ln, flags=re.IGNORECASE):
                continue

            # Preserve important structural markers and section headings.
            structural = bool(
                re.match(r"^(Q\d+\.|Q\d+\)|Question\s*\d+)", ln, re.IGNORECASE)
                or re.match(r"^(EASY|MEDIUM|HARD).*(QUESTION|LEVEL)", ln, re.IGNORECASE)
            )

            # Remove noisy symbol runs unless line looks structural.
            if not structural:
                ln = re.sub(r"^[^A-Za-z0-9]+", "", ln)
                ln = re.sub(r"[^A-Za-z0-9\]\)\.:,;!?%\-\s]+$", "", ln)

            ln = re.sub(r"\s{2,}", " ", ln).strip()
            if ln:
                cleaned_lines.append(ln)

        return "\n".join(cleaned_lines)

    def _chunk_document(
        self,
        doc_id: str,
        cleaned_text: str,
        page_spans: List[Dict[str, int]],
    ) -> List[ChunkRecord]:
        if not cleaned_text.strip():
            return []

        sections = self._detect_sections(cleaned_text)
        question_anchors = [m.start() for m in re.finditer(r"\bQ\d+\.|\bQ\d+\)", cleaned_text)]

        chunks: List[ChunkRecord] = []
        idx = 0
        chunk_index = 1
        n = len(cleaned_text)

        while idx < n:
            target_end = min(idx + self.chunk_size, n)
            split_end = self._choose_split_end(cleaned_text, idx, target_end, question_anchors)
            if split_end <= idx:
                split_end = min(idx + self.chunk_size, n)

            chunk_text = cleaned_text[idx:split_end].strip()
            if chunk_text:
                mid_pos = idx + max(1, (split_end - idx) // 2)
                page_number = self._page_for_char(mid_pos, page_spans)
                section = self._section_for_char(mid_pos, sections)
                qn = self._question_number(chunk_text)
                difficulty = self._difficulty_from_section(section)

                chunk_id = f"{doc_id}_p{page_number}_c{chunk_index}"
                metadata = {
                    "chunk_id": chunk_id,
                    "doc_id": doc_id,
                    "page_number": page_number,
                    "section": section,
                    "question_number": qn,
                    "difficulty_level": difficulty,
                    "char_count": len(chunk_text),
                }
                chunks.append(ChunkRecord(chunk_id=chunk_id, text=chunk_text, metadata=metadata))
                chunk_index += 1

            if split_end >= n:
                break

            idx = max(split_end - self.chunk_overlap, idx + 1)

        return chunks

    def _detect_sections(self, cleaned_text: str) -> List[Dict[str, Any]]:
        patterns = [
            r"EASY\s+LEVEL\s+QUESTIONS?",
            r"MEDIUM\s+LEVEL\s+QUESTIONS?",
            r"HARD\s+LEVEL\s+QUESTIONS?",
        ]
        hits: List[Tuple[int, str]] = []
        for p in patterns:
            for match in re.finditer(p, cleaned_text, re.IGNORECASE):
                hits.append((match.start(), match.group(0).upper()))

        hits.sort(key=lambda x: x[0])
        if not hits:
            return [{"start": 0, "end": len(cleaned_text), "name": "UNSPECIFIED"}]

        sections: List[Dict[str, Any]] = []
        for i, (start, name) in enumerate(hits):
            end = hits[i + 1][0] if i + 1 < len(hits) else len(cleaned_text)
            sections.append({"start": start, "end": end, "name": name})
        return sections

    def _choose_split_end(
        self,
        text_value: str,
        start: int,
        target_end: int,
        question_anchors: List[int],
    ) -> int:
        window_start = min(len(text_value), start + 350)
        window_end = min(len(text_value), start + 650)
        if target_end < window_start:
            window_start = target_end
        if target_end > window_end:
            window_end = target_end

        # Prefer question boundary after current chunk start.
        for anchor in question_anchors:
            if window_start <= anchor <= window_end and anchor > start + 80:
                return anchor

        # Paragraph boundary
        para = text_value.rfind("\n\n", start, target_end + 1)
        if para > start + 200:
            return para

        # Sentence boundary
        sentence_matches = list(re.finditer(r"[.!?]\s", text_value[start:target_end]))
        if sentence_matches:
            return start + sentence_matches[-1].end()

        # Space boundary fallback
        space_pos = text_value.rfind(" ", start, target_end + 1)
        if space_pos > start + 120:
            return space_pos

        return target_end

    def _page_for_char(self, char_pos: int, page_spans: List[Dict[str, int]]) -> int:
        for span in page_spans:
            if span["start"] <= char_pos <= span["end"]:
                return span["page_number"]
        if not page_spans:
            return 1
        return page_spans[-1]["page_number"]

    def _section_for_char(self, char_pos: int, sections: List[Dict[str, Any]]) -> str:
        for section in sections:
            if section["start"] <= char_pos < section["end"]:
                return section["name"]
        return "UNSPECIFIED"

    def _question_number(self, chunk_text: str) -> Optional[str]:
        match = re.search(r"\bQ(\d+)\.|\bQ(\d+)\)", chunk_text, flags=re.IGNORECASE)
        if not match:
            return None
        return match.group(1) or match.group(2)

    def _difficulty_from_section(self, section_name: str) -> str:
        s = (section_name or "").lower()
        if "easy" in s:
            return "easy"
        if "medium" in s:
            return "medium"
        if "hard" in s:
            return "hard"
        return "unknown"

    def _embed_documents(self, chunk_texts: List[str], batch_size: int = 64) -> List[List[float]]:
        vectors: List[List[float]] = []

        for i in range(0, len(chunk_texts), batch_size):
            batch = chunk_texts[i : i + batch_size]
            retries = 0
            while True:
                try:
                    batch_vectors = self._embed_content_batch(batch, task_type="retrieval_document")
                    vectors.extend(batch_vectors)
                    break
                except Exception as exc:
                    retries += 1
                    if retries > 3:
                        raise RuntimeError(f"Embedding batch failed: {exc}") from exc
                    time.sleep(2 * retries)

        return vectors

    def _embed_query(self, query: str) -> List[float]:
        retries = 0
        while True:
            try:
                response = genai.embed_content(
                    model=self.embedding_model,
                    content=query,
                    task_type="retrieval_query",
                )
                vector = response.get("embedding") if isinstance(response, dict) else None
                if not vector:
                    raise ValueError("Missing query embedding in response")
                return vector
            except Exception as exc:
                retries += 1
                if retries > 3:
                    raise RuntimeError(f"Query embedding failed: {exc}") from exc
                time.sleep(2 * retries)

    def _embed_content_batch(self, batch: List[str], task_type: str) -> List[List[float]]:
        # Try batch API first if available, fallback to single calls.
        if hasattr(genai, "batch_embed_contents"):
            response = genai.batch_embed_contents(
                model=self.embedding_model,
                requests=[{"content": item, "task_type": task_type} for item in batch],
            )
            embeddings = response.get("embeddings") if isinstance(response, dict) else None
            if embeddings and len(embeddings) == len(batch):
                return [e.get("values") or e.get("embedding") for e in embeddings]

        vectors: List[List[float]] = []
        for item in batch:
            response = genai.embed_content(
                model=self.embedding_model,
                content=item,
                task_type=task_type,
            )
            vector = response.get("embedding") if isinstance(response, dict) else None
            if not vector:
                raise ValueError("Missing embedding vector for batch item")
            vectors.append(vector)
        return vectors

    def _upsert_chunks(self, chunks: List[ChunkRecord], vectors: List[List[float]], batch_size: int = 100) -> None:
        if len(chunks) != len(vectors):
            raise ValueError("Chunks and vectors length mismatch")

        for i in range(0, len(chunks), batch_size):
            sub_chunks = chunks[i : i + batch_size]
            sub_vecs = vectors[i : i + batch_size]

            self.collection.upsert(
                ids=[c.chunk_id for c in sub_chunks],
                documents=[c.text for c in sub_chunks],
                metadatas=[c.metadata for c in sub_chunks],
                embeddings=sub_vecs,
            )

    def _count_document_chunks(self, document_uuid: str) -> int:
        result = self.collection.get(
            where={"doc_id": document_uuid},
            include=[],
        )
        ids = result.get("ids") or []
        return len(ids)

    def _mark_document_indexed(self, db: Session, ocr_record_id: int) -> None:
        # Best-effort DB flagging using a side table so existing schema remains compatible.
        db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS indexed_documents (
                    ocr_record_id INT PRIMARY KEY,
                    indexed_at DATETIME NOT NULL
                )
                """
            )
        )
        db.execute(
            text(
                """
                INSERT INTO indexed_documents (ocr_record_id, indexed_at)
                VALUES (:ocr_record_id, :indexed_at)
                ON DUPLICATE KEY UPDATE indexed_at = :indexed_at
                """
            ),
            {"ocr_record_id": ocr_record_id, "indexed_at": datetime.utcnow()},
        )
        db.commit()

    # -----------------------------
    # Phase 2: Query pipeline
    # -----------------------------

    def answer_query(
        self,
        query: str,
        doc_id: Optional[str] = None,
        top_k: int = 10,
    ) -> Dict[str, Any]:
        request_id = uuid.uuid4().hex
        start_time = time.perf_counter()

        validated_query = self._validate_query(query)
        LOGGER.info("RAG query request_id=%s query=%s", request_id, validated_query)

        query_vector = self._embed_query(validated_query)
        results = self._search_chunks(validated_query, query_vector, doc_id=doc_id, top_k=top_k)

        filtered = self._filter_and_rerank(results)
        if not filtered:
            response = {
                "request_id": request_id,
                "answer": "I could not find information about this in the uploaded document. Please try rephrasing your question.",
                "sources": [],
                "retrieval": {
                    "top_k_requested": top_k,
                    "top_k_returned": len(results),
                    "chunks_used": 0,
                },
            }
            self._log_query_cycle(
                request_id=request_id,
                query_text=validated_query,
                retrieved_ids=[],
                similarity_scores=[],
                final_answer=response["answer"],
                latency_ms=int((time.perf_counter() - start_time) * 1000),
                error=None,
            )
            return response

        selected = filtered[:5]
        prompt = self._build_prompt(validated_query, selected)
        answer_text = self._generate_answer(prompt)

        sources = []
        for hit in selected:
            md = hit["metadata"]
            chunk_preview = (hit["text"] or "")[:100]
            sources.append(
                {
                    "chunk_id": md.get("chunk_id"),
                    "doc_id": md.get("doc_id"),
                    "page_number": md.get("page_number"),
                    "section": md.get("section"),
                    "question_number": md.get("question_number"),
                    "difficulty_level": md.get("difficulty_level"),
                    "distance": hit["distance"],
                    "preview": chunk_preview,
                }
            )

        latency_ms = int((time.perf_counter() - start_time) * 1000)
        response = {
            "request_id": request_id,
            "answer": answer_text,
            "sources": sources,
            "retrieval": {
                "top_k_requested": top_k,
                "top_k_returned": len(results),
                "chunks_used": len(selected),
                "min_distance": min(h["distance"] for h in selected),
                "max_distance": max(h["distance"] for h in selected),
                "latency_ms": latency_ms,
            },
        }

        self._log_query_cycle(
            request_id=request_id,
            query_text=validated_query,
            retrieved_ids=[h["metadata"].get("chunk_id") for h in selected],
            similarity_scores=[h["distance"] for h in selected],
            final_answer=answer_text,
            latency_ms=latency_ms,
            error=None,
        )

        return response

    def _validate_query(self, query: str) -> str:
        if query is None:
            raise ValueError("Query is required")

        q = query.strip()
        if len(q) < 3:
            raise ValueError("Query must be at least 3 characters")
        if len(q) > 1000:
            raise ValueError("Query must be at most 1000 characters")
        return q

    def _search_chunks(
        self,
        query_text: str,
        query_vector: List[float],
        doc_id: Optional[str],
        top_k: int,
    ) -> List[Dict[str, Any]]:
        where_filter: Dict[str, Any] = {}
        if doc_id:
            where_filter["doc_id"] = doc_id

        inferred_difficulty = self._infer_difficulty_from_query(query_text)
        if inferred_difficulty:
            where_filter["difficulty_level"] = inferred_difficulty

        query_kwargs: Dict[str, Any] = {
            "query_embeddings": [query_vector],
            "n_results": top_k,
            "include": ["documents", "metadatas", "distances"],
        }
        if where_filter:
            query_kwargs["where"] = where_filter

        res = self.collection.query(**query_kwargs)

        ids = (res.get("ids") or [[]])[0]
        docs = (res.get("documents") or [[]])[0]
        metas = (res.get("metadatas") or [[]])[0]
        distances = (res.get("distances") or [[]])[0]

        hits: List[Dict[str, Any]] = []
        for idx, cid in enumerate(ids):
            hits.append(
                {
                    "chunk_id": cid,
                    "text": docs[idx] if idx < len(docs) else "",
                    "metadata": metas[idx] if idx < len(metas) and metas[idx] else {},
                    "distance": float(distances[idx]) if idx < len(distances) else 1.0,
                }
            )

        if hits and hits[0]["distance"] > self.similarity_threshold:
            return []

        return hits

    def _infer_difficulty_from_query(self, query_text: str) -> Optional[str]:
        q = query_text.lower()
        if "easy" in q:
            return "easy"
        if "medium" in q:
            return "medium"
        if "hard" in q:
            return "hard"
        return None

    def _filter_and_rerank(self, hits: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not hits:
            return []

        ranked = sorted(hits, key=lambda h: h["distance"])

        filtered = [h for h in ranked if h["distance"] <= self.similarity_threshold]
        if not filtered:
            return []

        deduped: List[Dict[str, Any]] = []
        seen_fingerprints = set()
        for hit in filtered:
            normalized = re.sub(r"\s+", " ", (hit.get("text") or "").strip().lower())
            fingerprint = normalized[:220]
            if not fingerprint or fingerprint in seen_fingerprints:
                continue
            seen_fingerprints.add(fingerprint)
            deduped.append(hit)

        return deduped[:5]

    def _build_prompt(self, user_query: str, selected_hits: List[Dict[str, Any]]) -> str:
        context_blocks = []
        for hit in selected_hits:
            md = hit["metadata"]
            label = (
                f"[Page {md.get('page_number', '?')} - "
                f"{md.get('section', 'UNSPECIFIED')} - "
                f"difficulty={md.get('difficulty_level', 'unknown')} - "
                f"chunk={md.get('chunk_id', '')}]"
            )
            context_blocks.append(f"{label}\n{hit.get('text', '')}")

        context_text = "\n\n-----\n\n".join(context_blocks)

        return (
            "You are a helpful assistant that answers questions only from the provided context.\n"
            "If the answer is not in the context, say: I do not know based on the provided document.\n"
            "Do not use outside knowledge. Do not hallucinate.\n\n"
            f"Context:\n{context_text}\n\n"
            f"User question:\n{user_query}\n\n"
            "Return:\n"
            "1) A concise factual answer\n"
            "2) Sources used as page/section references\n"
        )

    def _generate_answer(self, prompt: str) -> str:
        retries = 0
        while True:
            try:
                response = self.llm_model.generate_content(
                    prompt,
                    generation_config={
                        "temperature": 0.1,
                        "max_output_tokens": 700,
                    },
                )
                answer = (response.text or "").strip()
                if not answer:
                    raise ValueError("Empty LLM response")
                return answer
            except Exception as exc:
                retries += 1
                if retries > 3:
                    raise RuntimeError(f"Gemini generation failed: {exc}") from exc
                time.sleep(2)

    def _log_query_cycle(
        self,
        request_id: str,
        query_text: str,
        retrieved_ids: List[str],
        similarity_scores: List[float],
        final_answer: str,
        latency_ms: int,
        error: Optional[str],
    ) -> None:
        try:
            with SessionLocal() as db:
                db.execute(
                    text(
                        """
                        CREATE TABLE IF NOT EXISTS rag_query_logs (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            request_id VARCHAR(64) NOT NULL,
                            query_text TEXT NOT NULL,
                            retrieved_chunk_ids JSON NOT NULL,
                            similarity_scores JSON NOT NULL,
                            final_answer LONGTEXT NOT NULL,
                            latency_ms INT NOT NULL,
                            error TEXT NULL,
                            created_at DATETIME NOT NULL,
                            UNIQUE KEY uq_rag_request_id (request_id)
                        )
                        """
                    )
                )
                db.execute(
                    text(
                        """
                        INSERT INTO rag_query_logs (
                            request_id,
                            query_text,
                            retrieved_chunk_ids,
                            similarity_scores,
                            final_answer,
                            latency_ms,
                            error,
                            created_at
                        ) VALUES (
                            :request_id,
                            :query_text,
                            :retrieved_chunk_ids,
                            :similarity_scores,
                            :final_answer,
                            :latency_ms,
                            :error,
                            :created_at
                        )
                        ON DUPLICATE KEY UPDATE
                            query_text = VALUES(query_text),
                            retrieved_chunk_ids = VALUES(retrieved_chunk_ids),
                            similarity_scores = VALUES(similarity_scores),
                            final_answer = VALUES(final_answer),
                            latency_ms = VALUES(latency_ms),
                            error = VALUES(error)
                        """
                    ),
                    {
                        "request_id": request_id,
                        "query_text": query_text,
                        "retrieved_chunk_ids": self._to_json_array(retrieved_ids),
                        "similarity_scores": self._to_json_array(similarity_scores),
                        "final_answer": final_answer,
                        "latency_ms": latency_ms,
                        "error": error,
                        "created_at": datetime.utcnow(),
                    },
                )
                db.commit()
        except Exception as exc:
            LOGGER.exception("Failed to persist rag_query_logs: %s", exc)

    def _to_json_array(self, values: List[Any]) -> str:
        import json

        return json.dumps(values, ensure_ascii=True)


def build_rag_pipeline() -> RAGPipeline:
    """Factory helper with environment overrides."""
    return RAGPipeline(
        chroma_path=os.getenv("CHROMA_PATH", "storage/chroma"),
        collection_name=os.getenv("CHROMA_COLLECTION", "pdf_rag_docs"),
        embedding_model=os.getenv("GEMINI_EMBED_MODEL", "models/text-embedding-004"),
        llm_model=os.getenv("GEMINI_LLM_MODEL", "gemini-1.5-flash"),
        chunk_size=int(os.getenv("RAG_CHUNK_SIZE", "500")),
        chunk_overlap=int(os.getenv("RAG_CHUNK_OVERLAP", "80")),
        similarity_threshold=float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.7")),
    )
