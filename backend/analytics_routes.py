from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from auth.deps import get_current_user, require_role, get_db
from auth.models import User
from ocr_models import OcrData

router = APIRouter()


@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    """
    Admin-only endpoint returning analytics:
    - Total users
    - Total documents uploaded
    - Per-user document and page counts
    - Overall page count
    """
    # Total users
    total_users = db.query(func.count(User.id)).scalar() or 0

    # Total documents
    total_documents = db.query(func.count(OcrData.id)).scalar() or 0

    # Total pages across all documents
    total_pages = db.query(func.sum(OcrData.num_pages)).scalar() or 0

    # Per-user stats
    user_stats = db.query(
        User.id,
        User.username,
        User.email,
        User.role,
        func.count(OcrData.id).label("document_count"),
        func.sum(OcrData.num_pages).label("total_pages"),
    ).outerjoin(OcrData, OcrData.user_id == User.id).group_by(User.id).all()

    user_analytics = [
        {
            "user_id": stat[0],
            "username": stat[1],
            "email": stat[2],
            "role": stat[3],
            "document_count": stat[4] or 0,
            "total_pages": stat[5] or 0,
        }
        for stat in user_stats
    ]

    return {
        "total_users": total_users,
        "total_documents": total_documents,
        "total_pages": total_pages,
        "user_analytics": user_analytics,
    }
