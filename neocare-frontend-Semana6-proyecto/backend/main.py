# main.py - VERSIÓN CORREGIDA
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models

# Importaciones desde tus otros archivos
from auth_router import router as auth_router
from crud import get_user_by_email
from board_router import router as board_router
from list_router import router as list_router
from card_router import router as card_router
from timesheet_router import router as timesheet_router
from report_router import router as report_router

# Crear las tablas de la base de datos
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# --- Inclusión de Routers ---
app.include_router(auth_router, prefix="/api/auth")
app.include_router(board_router, prefix="/api/boards", tags=["Tableros"])
app.include_router(list_router, prefix="/api/lists", tags=["Listas"])
app.include_router(card_router, prefix="/api/cards", tags=["Tarjetas"])
app.include_router(timesheet_router, prefix="/api/timesheets", tags=["Timesheets"])
app.include_router(report_router)

@app.get("/api/health")
async def health_check():
    return {
        "status": "OK",
        "service": "FastAPI Backend",
        "version": "1.0.0"
    }