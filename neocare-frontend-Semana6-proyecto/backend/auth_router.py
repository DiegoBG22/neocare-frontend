from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserCreate, UserLogin, Token  # ✅ UserLogin ya existe
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

# ✅ ✅ ✅ ¡ESTA ES LA LÍNEA CLAVE QUE DEBES CAMBIAR! ✅ ✅ ✅
@router.post("/login", response_model=Token)
async def login(
    user_data: UserLogin,  # ✅ CAMBIADO: UserLogin en lugar de OAuth2PasswordRequestForm
    db: Session = Depends(get_db)
):
    """Endpoint para login que acepta JSON"""
    
    # Buscar usuario por email
    user = get_user_by_email(db, user_data.email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
   
    # Verificar contraseña
    if not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
   
    # Crear token de acceso
    access_token = create_access_token(user_id=user.id)
   
    return Token(access_token=access_token, token_type="bearer")

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