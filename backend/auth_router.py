from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm # <--- Cambiado/Añadido
from sqlalchemy.orm import Session
 
from database import get_db
from models import User
from schemas import UserCreate, UserLogin, Token
from auth_handler import hash_password, verify_password, create_access_token, verify_token
from crud import get_user_by_email, create_user
 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
 
router = APIRouter(tags=["auth"])
 
@router.post("/register")
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Endpoint para registrar un nuevo usuario"""
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
 
    hashed_password = hash_password(user_data.password)
    user_in = UserCreate(email=user_data.email, password=hashed_password)
    create_user(db, user_in)
 
    return {"message": "User created successfully"}
 
# --- ESTA ES LA FUNCIÓN QUE CORRIGE EL ERROR 422 ---
@router.post("/login", response_model=Token)
async def login(
    user_data: OAuth2PasswordRequestForm = Depends(), # <--- Esto hace que el candado funcione
    db: Session = Depends(get_db)
):
    """Endpoint compatible con Swagger Authorize y Login normal"""
    
    # Swagger envía el email en el campo '.username' por estándar de OAuth2
    user = get_user_by_email(db, user_data.username) 
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
   
    # Verificar contraseña usando el campo '.password' del formulario
    if not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
   
    # Crear token de acceso
    access_token = create_access_token(user_id=user.id)
   
    return Token(access_token=access_token, token_type="bearer") # Añadido token_type
 
 
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """Dependencia para obtener el usuario actual a partir del token JWT"""
    user_id = verify_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
 
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
 
    return user