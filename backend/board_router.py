from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Board, User
from schemas import Board as BoardSchema, BoardCreate
from auth_router import get_current_user
from crud import (
    create_board as crud_create_board,
    get_boards_by_user as crud_get_boards_by_user,
    delete_board as crud_delete_board,
    get_board_by_id_and_user # ✅ Usamos esta para validar propiedad
)

router = APIRouter(tags=["boards"])

@router.get("/", response_model=List[BoardSchema])
async def list_boards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Listar todos los tableros del usuario autenticado"""
    boards = crud_get_boards_by_user(db, current_user.id)
    return boards

@router.post("/", response_model=BoardSchema, status_code=status.HTTP_201_CREATED)
async def create_board(
    board_in: BoardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crear un nuevo tablero para el usuario autenticado"""
    new_board = crud_create_board(db, current_user.id, board_in)
    return new_board

# ✅ RUTA DE EDICIÓN PARA TABLEROS
@router.put("/{board_id}", response_model=BoardSchema)
async def update_board(
    board_id: int,
    board_in: BoardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Actualizar el título de un tablero si pertenece al usuario"""
    # 1. Verificar que el tablero existe y es del usuario
    db_board = get_board_by_id_and_user(db, board_id, current_user.id)
    
    if not db_board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Tablero no encontrado o no tienes permiso"
        )

    # 2. Actualizar el título
    db_board.title = board_in.title
    db.commit()
    db.refresh(db_board)
    return db_board

@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Eliminar un tablero del usuario autenticado"""
    success = crud_delete_board(db, board_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found or not owned by user",
        )
    return None