# backend/card_router.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Card, List as ListModel, Board, User
from schemas import Card as CardSchema, CardCreate, CardUpdate
from auth_router import get_current_user

router = APIRouter(tags=["cards"])

def ensure_list_belongs_to_user(db: Session, list_id: int, user_id: int) -> ListModel | None:
    return (
        db.query(ListModel)
        .join(Board, Board.id == ListModel.board_id)
        .filter(ListModel.id == list_id, Board.user_id == user_id)
        .first()
    )

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

    db_card = Card(
        title=card_in.title,
        description=card_in.description,
        due_date=card_in.due_date,
        list_id=card_in.list_id,
        user_id=current_user.id,
    )
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card

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
    if updates.list_id is not None:
        # Validar cambio de lista dentro de tableros del usuario
        list_obj = ensure_list_belongs_to_user(db, updates.list_id, current_user.id)
        if list_obj is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target list not found or not owned by user")
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
    db.delete(card)
    db.commit()
    return None
