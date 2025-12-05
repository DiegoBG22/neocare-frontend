from typing import List as ListType

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Board, List as ListModel, User
from schemas import List as ListSchema, ListCreate
from auth_router import get_current_user
from crud import (
    create_list as crud_create_list,
    get_lists_by_board as crud_get_lists_by_board,
    delete_list as crud_delete_list,
)


router = APIRouter(tags=["lists"])


@router.get("/by-board/{board_id}", response_model=ListType[ListSchema])
async def list_lists_for_board(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Listar todas las listas de un tablero del usuario autenticado"""
    lists = crud_get_lists_by_board(db, board_id, current_user.id)
    return lists


@router.post("/", response_model=ListSchema, status_code=status.HTTP_201_CREATED)
async def create_list(
    list_in: ListCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crear una nueva lista dentro de un tablero del usuario autenticado"""
    new_list = crud_create_list(db, current_user.id, list_in)
    if new_list is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    return new_list


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Eliminar una lista de un tablero del usuario autenticado"""
    success = crud_delete_list(db, list_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="List not found",
        )

    return None

