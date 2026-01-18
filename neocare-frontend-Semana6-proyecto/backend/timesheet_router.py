from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Timesheet, User, Card
from schemas import Timesheet as TimesheetSchema, TimesheetCreate
from auth_router import get_current_user

router = APIRouter(tags=["Timesheets"])

@router.post("/", response_model=TimesheetSchema, status_code=status.HTTP_201_CREATED)
async def create_timesheet(
    timesheet_in: TimesheetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verificar si la tarjeta existe y pertenece al usuario (si se envía card_id)
    if timesheet_in.card_id:
        card = db.query(Card).filter(Card.id == timesheet_in.card_id).first()
        if not card:
            raise HTTPException(status_code=404, detail="Tarjeta no encontrada")

    new_entry = Timesheet(
        **timesheet_in.dict(),
        user_id=current_user.id
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry

@router.get("/me", response_model=List[TimesheetSchema])
async def get_my_timesheets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna todos los registros de horas del usuario autenticado"""
    return db.query(Timesheet).filter(Timesheet.user_id == current_user.id).all()

@router.delete("/{timesheet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_timesheet(
    timesheet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_entry = db.query(Timesheet).filter(
        Timesheet.id == timesheet_id, 
        Timesheet.user_id == current_user.id
    ).first()
    
    if not db_entry:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    db.delete(db_entry)
    db.commit()
    return None