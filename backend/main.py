from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from auth_router import router as auth_router
from board_router import router as board_router
from list_router import router as list_router
from card_router import router as card_router
 
# Create database tables
Base.metadata.create_all(bind=engine)
 
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
   allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)
 
# Incluir routers
app.include_router(auth_router, prefix="/api/auth", tags=["Autenticación"])
app.include_router(board_router, prefix="/api/boards", tags=["Tableros"])
app.include_router(list_router, prefix="/api/lists", tags=["Listas"])
app.include_router(card_router, prefix="/api/cards", tags=["Tarjetas"])
 
@app.get("/api/health")
async def health_check():
    return {
        "status": "OK",
        "service": "FastAPI Backend",
        "version": "1.0.0"
    }