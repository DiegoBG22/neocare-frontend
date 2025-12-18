# backend/card_router.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Card, List as ListModel, Board, User
from schemas import Card as CardSchema, CardCreate, CardUpdate, CardMove
from auth_router import get_current_user

router = APIRouter(tags=["cards"])

def ensure_list_belongs_to_user(db: Session, list_id: int, user_id: int) -> ListModel | None:
    """Verifica si una lista pertenece al usuario actual a través del tablero"""
    return (
        db.query(ListModel)
        .join(Board, Board.id == ListModel.board_id)
        .filter(ListModel.id == list_id, Board.user_id == user_id)
        .first()
    )

# ✅ NUEVA RUTA: Esta es la que soluciona el error 404 al recargar
@router.get("/by-list/{list_id}", response_model=List[CardSchema])
async def get_cards_by_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtener todas las tarjetas de una lista específica para el usuario autenticado"""
    # Validamos que la lista existe y es del usuario
    list_obj = ensure_list_belongs_to_user(db, list_id, current_user.id)
    if list_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lista no encontrada")

    # Retornamos las tarjetas ordenadas
    return db.query(Card).filter(Card.list_id == list_id).order_by(Card.order).all()

@router.post("/", response_model=CardSchema, status_code=status.HTTP_201_CREATED)
async def create_card(
    card_in: CardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validar que la lista pertenece al usuario
    list_obj = ensure_list_belongs_to_user(db, card_in.list_id, current_user.id)
    if list_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found or not owned by user")

    # Calcular el siguiente número de orden (el máximo actual + 1)
    max_order = db.query(func.max(Card.order)).filter(Card.list_id == card_in.list_id).scalar() or 0
    
    db_card = Card(
        title=card_in.title,
        description=card_in.description,
        due_date=card_in.due_date,
        list_id=card_in.list_id,
        user_id=current_user.id,
        order=max_order + 1
    )
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card

@router.patch("/{card_id}/move", response_model=CardSchema)
async def move_card(
    card_id: int,
    move_data: CardMove,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    card = (
        db.query(Card)
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(Card.id == card_id, Board.user_id == current_user.id)
        .first()
    )
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    target_list = ensure_list_belongs_to_user(db, move_data.list_id, current_user.id)
    if not target_list:
        raise HTTPException(status_code=404, detail="Target list not found")

    old_list_id = card.list_id
    old_order = card.order
    new_list_id = move_data.list_id
    new_order = move_data.new_order

    if old_list_id == new_list_id:
        if new_order > old_order:
            db.query(Card).filter(
                Card.list_id == old_list_id,
                Card.order > old_order,
                Card.order <= new_order
            ).update({Card.order: Card.order - 1}, synchronize_session=False)
        elif new_order < old_order:
            db.query(Card).filter(
                Card.list_id == old_list_id,
                Card.order >= new_order,
                Card.order < old_order
            ).update({Card.order: Card.order + 1}, synchronize_session=False)
    else:
        db.query(Card).filter(
            Card.list_id == old_list_id,
            Card.order > old_order
        ).update({Card.order: Card.order - 1}, synchronize_session=False)
        db.query(Card).filter(
            Card.list_id == new_list_id,
            Card.order >= new_order
        ).update({Card.order: Card.order + 1}, synchronize_session=False)

    card.list_id = new_list_id
    card.order = new_order
    
    db.commit()
    db.refresh(card)
    return card

@router.get("/{card_id}", response_model=CardSchema)
async def get_card_by_id(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = (
        db.query(Card)
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(Card.id == card_id, Board.user_id == current_user.id)
        .first()
    )
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    return card

@router.put("/{card_id}", response_model=CardSchema)
async def update_card(
    card_id: int,
    updates: CardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = (
        db.query(Card)
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(Card.id == card_id, Board.user_id == current_user.id)
        .first()
    )
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

    if updates.title is not None:
        card.title = updates.title
    if updates.description is not None:
        card.description = updates.description
    if updates.due_date is not None:
        card.due_date = updates.due_date
    if updates.order is not None:
        card.order = updates.order
    if updates.list_id is not None:
        list_obj = ensure_list_belongs_to_user(db, updates.list_id, current_user.id)
        if list_obj is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target list not found")
        card.list_id = updates.list_id

    db.commit()
    db.refresh(card)
    return card

@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = (
        db.query(Card)
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(Card.id == card_id, Board.user_id == current_user.id)
        .first()
    )
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    
    db.query(Card).filter(
        Card.list_id == card.list_id,
        Card.order > card.order
    ).update({Card.order: Card.order - 1}, synchronize_session=False)

    db.delete(card)
    db.commit()
    return None