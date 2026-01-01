from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Board, Card, List as ListModel, Timesheet, User
from auth_router import get_current_user
from crud import get_board_by_id_and_user


router = APIRouter(prefix="/report", tags=["Report"])


def week_to_dates(week: str) -> tuple[date, date]:
    """Convierte una semana en formato YYYY-Www en rango de fechas (lunes-domingo)."""
    try:
        year_str, week_part = week.split("-W")
        year = int(year_str)
        week_number = int(week_part)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid week format. Expected 'YYYY-Www', e.g. '2025-W01'.",
        )

    first_day = datetime.strptime(f"{year}-W{week_number}-1", "%Y-W%W-%w").date()
    last_day = first_day + timedelta(days=6)
    return first_day, last_day


@router.get("/{board_id}/summary")
def report_summary(
    board_id: int,
    week: str = Query(..., description="Semana en formato YYYY-Www, por ejemplo 2025-W01"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    board = get_board_by_id_and_user(db, board_id, current_user.id)
    if board is None:
        raise HTTPException(status_code=403, detail="Board not accessible")

    start_date, end_date = week_to_dates(week)
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())

    created_count = (
        db.query(func.count(Card.id))
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
            Card.created_at >= start_dt,
            Card.created_at <= end_dt,
        )
        .scalar()
    ) or 0

    completed_count = (
        db.query(func.count(Card.id))
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
            Card.updated_at >= start_dt,
            Card.updated_at <= end_dt,
            Card.due_date != None,  # type: ignore[comparison-overlap]
            Card.due_date <= end_dt,
        )
        .scalar()
    ) or 0

    overdue_count = (
        db.query(func.count(Card.id))
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
            Card.due_date != None,  # type: ignore[comparison-overlap]
            Card.due_date < date.today(),
        )
        .scalar()
    ) or 0

    return {
        "created": int(created_count),
        "completed": int(completed_count),
        "overdue": int(overdue_count),
    }


@router.get("/{board_id}/hours-by-user")
def report_hours_by_user(
    board_id: int,
    week: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    board = get_board_by_id_and_user(db, board_id, current_user.id)
    if board is None:
        raise HTTPException(status_code=403, detail="Board not accessible")

    start_date, end_date = week_to_dates(week)

    rows = (
        db.query(
            Timesheet.user_id.label("user_id"),
            User.email.label("user_email"),
            func.coalesce(func.sum(Timesheet.hours), 0).label("total_hours"),
            func.count(func.distinct(Timesheet.card_id)).label("tasks_count"),
        )
        .join(User, User.id == Timesheet.user_id)
        .join(Card, Card.id == Timesheet.card_id)
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
            Timesheet.date >= start_date,
            Timesheet.date <= end_date,
        )
        .group_by(Timesheet.user_id, User.email)
        .all()
    )

    return [
        {
            "user_id": row.user_id,
            "user_email": row.user_email,
            "total_hours": float(row.total_hours or 0),
            "tasks_count": int(row.tasks_count or 0),
        }
        for row in rows
    ]


@router.get("/{board_id}/hours-by-card")
def report_hours_by_card(
    board_id: int,
    week: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    board = get_board_by_id_and_user(db, board_id, current_user.id)
    if board is None:
        raise HTTPException(status_code=403, detail="Board not accessible")

    start_date, end_date = week_to_dates(week)

    rows = (
        db.query(
            Card.id.label("card_id"),
            Card.title.label("title"),
            User.email.label("responsible"),
            func.coalesce(func.sum(Timesheet.hours), 0).label("total_hours"),
        )
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .outerjoin(Timesheet, Timesheet.card_id == Card.id)
        .outerjoin(User, User.id == Card.user_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
            Timesheet.date >= start_date,
            Timesheet.date <= end_date,
        )
        .group_by(Card.id, Card.title, User.email)
        .order_by(func.coalesce(func.sum(Timesheet.hours), 0).desc())
        .all()
    )

    return [
        {
            "card_id": row.card_id,
            "title": row.title,
            "status": "sin_estado",
            "responsible": row.responsible,
            "total_hours": float(row.total_hours or 0),
        }
        for row in rows
    ]
