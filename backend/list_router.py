from typing import List as ListType, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, List as ListModel  # ✅ Importamos el modelo de la base de datos
from schemas import ListModel as ListSchema, ListCreate
from auth_router import get_current_user
from crud import (
    create_list as crud_create_list,
    get_lists_by_board as crud_get_lists_by_board,
    delete_list as crud_delete_list,
    get_board_by_id_and_user # ✅ Importamos la validación de dueño
)

router = APIRouter(tags=["lists"])

# ✅ Listar todas las listas de un tablero (Tu código original)
@router.get("/by-board/{board_id}", response_model=ListType[ListSchema])
async def list_lists_for_board(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lists = crud_get_lists_by_board(db, board_id, current_user.id)
    return lists

# ✅ Crear una nueva lista (Tu código original)
@router.post("/", response_model=ListSchema, status_code=status.HTTP_201_CREATED)
async def create_list(
    list_in: ListCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_list = crud_create_list(db, current_user.id, list_in)
    if new_list is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )
    return new_list

# ✅ RUTA DE EDICIÓN CORREGIDA (Soporta que no envíes el board_id)
@router.put("/{list_id}", response_model=ListSchema)
async def update_list(
    list_id: int,
    list_data: dict, # ✅ Usamos dict para que no de error si falta el board_id
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Actualizar el título de una lista"""
    # 1. Buscar la lista
    db_list = db.query(ListModel).filter(ListModel.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="Lista no encontrada")

    # 2. Verificar que el tablero pertenece al usuario
    board = get_board_by_id_and_user(db, db_list.board_id, current_user.id)
    if not board:
        raise HTTPException(status_code=403, detail="No tienes permiso")

    # 3. Actualizar solo el título si viene en la petición
    if "title" in list_data:
        db_list.title = list_data["title"]
    
    db.commit()
    db.refresh(db_list)
    return db_list

# ✅ Eliminar una lista (Tu código original)
@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    success = crud_delete_list(db, list_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="List not found",
        )
    return None