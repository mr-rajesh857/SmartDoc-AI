from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from auth import schemas, crud
from auth.deps import get_db, require_role
from auth.utils import verify_password, create_access_token

router = APIRouter()


@router.post("/register", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = crud.get_user_by_email(db, user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    created = crud.create_user(db, user)
    return created


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    roles = [user.role]
    token = create_access_token(subject=str(user.id), roles=roles)
    return {"access_token": token, "token_type": "bearer", "role": user.role, "user_id": user.id}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user=Depends(__import__("auth.deps", fromlist=["get_current_user"]).get_current_user)):
    return current_user


@router.get("/users", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    return crud.list_users(db)
