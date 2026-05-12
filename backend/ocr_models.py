from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON
from db import Base


class OcrData(Base):
    __tablename__ = "ocr_data"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    original_filename = Column(String(1024), nullable=False)
    document_uuid = Column(String(64), nullable=False, index=True)
    num_pages = Column(Integer, nullable=False)
    ocr_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
