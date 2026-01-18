# backend/card_router.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from database import get_db
from models import Card, List as ListModel, Board, User, Label, Subtask
from schemas import (
    Card as CardSchema,
    CardCreate,
    CardUpdate,
    CardMove,
    Label as LabelSchema,
    LabelCreate,
    Subtask as SubtaskSchema,
    SubtaskCreate,
    SubtaskUpdate,
)
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


def ensure_card_belongs_to_user(db: Session, card_id: int, user_id: int) -> Card | None:
    return (
        db.query(Card)
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(Card.id == card_id, Board.user_id == user_id)
        .first()
    )

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

@router.get("/", response_model=List[CardSchema])
async def list_cards(
    board_id: int,
    responsible_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Card)
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(Board.id == board_id, Board.user_id == current_user.id)
    )

    if responsible_id is not None:
        query = query.filter(Card.user_id == responsible_id)

    return query.order_by(Card.created_at.asc()).all()


@router.get("/search", response_model=List[CardSchema])
async def search_cards(
    board_id: int,
    query_text: str = Query(..., alias="query", min_length=1),
    responsible_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base_query = (
        db.query(Card)
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(Board.id == board_id, Board.user_id == current_user.id)
    )

    pattern = f"%{query_text}%"
    base_query = base_query.filter(
        or_(Card.title.ilike(pattern), Card.description.ilike(pattern))
    )

    if responsible_id is not None:
        base_query = base_query.filter(Card.user_id == responsible_id)

    return base_query.order_by(Card.created_at.desc()).all()


@router.get("/{card_id}", response_model=CardSchema)
async def get_card_by_id(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = ensure_card_belongs_to_user(db, card_id, current_user.id)
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
    card = ensure_card_belongs_to_user(db, card_id, current_user.id)
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

    if getattr(updates, 'completed', None) is not None:
        card.completed = updates.completed
    if getattr(updates, 'overdue', None) is not None:
        card.overdue = updates.overdue

    db.commit()
    db.refresh(card)
    return card


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = ensure_card_belongs_to_user(db, card_id, current_user.id)
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

    db.query(Card).filter(
        Card.list_id == card.list_id,
        Card.order > card.order,
    ).update({Card.order: Card.order - 1}, synchronize_session=False)

    db.delete(card)
    db.commit()
    return None


@router.get("/{card_id}/labels", response_model=List[LabelSchema])
async def get_labels_for_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = ensure_card_belongs_to_user(db, card_id, current_user.id)
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

    return db.query(Label).filter(Label.card_id == card_id).all()


@router.post(
    "/{card_id}/labels",
    response_model=LabelSchema,
    status_code=status.HTTP_201_CREATED,
)
async def create_label_for_card(
    card_id: int,
    label_in: LabelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = ensure_card_belongs_to_user(db, card_id, current_user.id)
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

    db_label = Label(card_id=card_id, name=label_in.name, color=label_in.color)
    db.add(db_label)
    db.commit()
    db.refresh(db_label)
    return db_label


@router.delete("/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_label(
    label_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    label = (
        db.query(Label)
        .join(Card, Card.id == Label.card_id)
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(Label.id == label_id, Board.user_id == current_user.id)
        .first()
    )

    if label is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label not found")

    db.delete(label)
    db.commit()
    return None


@router.get("/{card_id}/subtasks", response_model=List[SubtaskSchema])
async def get_subtasks_for_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = ensure_card_belongs_to_user(db, card_id, current_user.id)
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

    return (
        db.query(Subtask)
        .filter(Subtask.card_id == card_id)
        .order_by(Subtask.id.asc())
        .all()
    )


@router.post(
    "/{card_id}/subtasks",
    response_model=SubtaskSchema,
    status_code=status.HTTP_201_CREATED,
)
async def create_subtask_for_card(
    card_id: int,
    subtask_in: SubtaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = ensure_card_belongs_to_user(db, card_id, current_user.id)
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

    db_subtask = Subtask(card_id=card_id, title=subtask_in.title)
    db.add(db_subtask)
    db.commit()
    db.refresh(db_subtask)
    return db_subtask


@router.patch("/subtasks/{subtask_id}", response_model=SubtaskSchema)
async def update_subtask(
    subtask_id: int,
    updates: SubtaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subtask = (
        db.query(Subtask)
        .join(Card, Card.id == Subtask.card_id)
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(Subtask.id == subtask_id, Board.user_id == current_user.id)
        .first()
    )

    if subtask is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")

    if updates.title is not None:
        subtask.title = updates.title
    if updates.completed is not None:
        subtask.completed = updates.completed

    db.commit()
    db.refresh(subtask)
    return subtask


@router.delete("/subtasks/{subtask_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subtask(
    subtask_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subtask = (
        db.query(Subtask)
        .join(Card, Card.id == Subtask.card_id)
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(Subtask.id == subtask_id, Board.user_id == current_user.id)
        .first()
    )

    if subtask is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")

    db.delete(subtask)
    db.commit()
    return None


@router.patch("/{card_id}/move", response_model=CardSchema)
async def move_card(
    card_id: int,
    move_data: CardMove,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = ensure_card_belongs_to_user(db, card_id, current_user.id)
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

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
                Card.order <= new_order,
            ).update({Card.order: Card.order - 1}, synchronize_session=False)
        elif new_order < old_order:
            db.query(Card).filter(
                Card.list_id == old_list_id,
                Card.order >= new_order,
                Card.order < old_order,
            ).update({Card.order: Card.order + 1}, synchronize_session=False)
    else:
        db.query(Card).filter(
            Card.list_id == old_list_id,
            Card.order > old_order,
        ).update({Card.order: Card.order - 1}, synchronize_session=False)
        db.query(Card).filter(
            Card.list_id == new_list_id,
            Card.order >= new_order,
        ).update({Card.order: Card.order + 1}, synchronize_session=False)

    card.list_id = new_list_id
    card.order = new_order

    db.commit()
    db.refresh(card)
    return card