from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models

# Importaciones desde tus otros archivos
from auth_router import router as auth_router, create_access_token, verify_password
from crud import get_user_by_email
from board_router import router as board_router
from list_router import router as list_router
from card_router import router as card_router
from timesheet_router import router as timesheet_router

# Crear las tablas de la base de datos
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Configuración de CORS (Permite que el frontend de tu compañera conecte)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# --- ENDPOINT PARA SWAGGER (Solución al error 422) ---
@app.post("/api/auth/login", tags=["Autenticación"])
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    # 1. Buscamos al usuario por email (que Swagger envía como 'username')
    user = get_user_by_email(db, form_data.username)
    
    # 2. Validamos si el usuario existe y la contraseña es correcta
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Generamos el token usando tu función existente
    access_token = create_access_token(user_id=user.id)
    
    return {"access_token": access_token, "token_type": "bearer"}

# --- Inclusión de Routers ---
app.include_router(auth_router, prefix="/api/auth")
app.include_router(board_router, prefix="/api/boards", tags=["Tableros"])
app.include_router(list_router, prefix="/api/lists", tags=["Listas"])
app.include_router(card_router, prefix="/api/cards", tags=["Tarjetas"])
app.include_router(timesheet_router, prefix="/api/timesheets", tags=["Timesheets"])

@app.get("/api/health")
async def health_check():
    return {
        "status": "OK",
        "service": "FastAPI Backend",
        "version": "1.0.0"
    }