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

    jan4 = date(year, 1, 4)
    jan4_monday = jan4 - timedelta(days=jan4.isoweekday() - 1)
    first_day = jan4_monday + timedelta(weeks=week_number - 1)
    last_day = first_day + timedelta(days=6)
    return first_day, last_day


@router.get("/{board_id}/summary")
def report_summary(
    board_id: int,
    week: str = Query(..., description="Semana en formato YYYY-Www, por ejemplo 2025-W01"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resumen semanal del tablero.

    Se alinea con la especificación de la semana 5:
    - Completadas: tarjetas en la lista "Hecho" cuyo ``updated_at`` cae en la semana.
    - Vencidas: tarjetas con ``due_date`` en la semana y que NO están en "Hecho".
    - Nuevas: tarjetas cuyo ``created_at`` cae en la semana.

    Devuelve listas de tareas por cada grupo para que el frontend pueda
    mostrar tanto el contador como ejemplos (título, responsable, estado).
    """

    board = get_board_by_id_and_user(db, board_id, current_user.id)
    if board is None:
        raise HTTPException(status_code=403, detail="Board not accessible")

    start_date, end_date = week_to_dates(week)
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())

    def _serialize_task_row(row) -> dict:
        return {
            "id": row.card_id,
            "title": row.title,
            "responsible": row.responsible or "Sin responsable",
            "status": row.status or "",
        }

    # Nuevas: created_at dentro del rango semanal
    created_rows = (
        db.query(
            Card.id.label("card_id"),
            Card.title.label("title"),
            User.email.label("responsible"),
            ListModel.title.label("status"),
        )
        .outerjoin(User, User.id == Card.user_id)
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
            Card.created_at >= start_dt,
            Card.created_at <= end_dt,
        )
        .order_by(Card.created_at.desc())
        .all()
    )

    # Completadas: en lista "Hecho" y actualizadas dentro de la semana
    completed_rows = (
        db.query(
            Card.id.label("card_id"),
            Card.title.label("title"),
            User.email.label("responsible"),
            ListModel.title.label("status"),
        )
        .outerjoin(User, User.id == Card.user_id)
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
            ListModel.title == "Hecho",
            Card.updated_at >= start_dt,
            Card.updated_at <= end_dt,
        )
        .order_by(Card.updated_at.desc())
        .all()
    )

    # Vencidas: due_date en la semana y NO están en "Hecho"
    overdue_rows = (
        db.query(
            Card.id.label("card_id"),
            Card.title.label("title"),
            User.email.label("responsible"),
            ListModel.title.label("status"),
        )
        .outerjoin(User, User.id == Card.user_id)
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
            Card.due_date != None,  # type: ignore[comparison-overlap]
            Card.due_date >= start_dt,
            Card.due_date <= end_dt,
            ListModel.title != "Hecho",
        )
        .order_by(Card.due_date.desc())
        .all()
    )

    # Cálculos de la semana anterior para comparativas
    previous_start_date = start_date - timedelta(days=7)
    previous_end_date = end_date - timedelta(days=7)
    prev_start_dt = datetime.combine(previous_start_date, datetime.min.time())
    prev_end_dt = datetime.combine(previous_end_date, datetime.max.time())

    created_prev_count = (
        db.query(func.count(Card.id))
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
            Card.created_at >= prev_start_dt,
            Card.created_at <= prev_end_dt,
        )
        .scalar()
    ) or 0

    completed_prev_count = (
        db.query(func.count(Card.id))
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
            ListModel.title == "Hecho",
            Card.updated_at >= prev_start_dt,
            Card.updated_at <= prev_end_dt,
        )
        .scalar()
    ) or 0

    overdue_prev_count = (
        db.query(func.count(Card.id))
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
            Card.due_date != None,  # type: ignore[comparison-overlap]
            Card.due_date >= prev_start_dt,
            Card.due_date <= prev_end_dt,
            ListModel.title != "Hecho",
        )
        .scalar()
    ) or 0

    return {
        "created": [_serialize_task_row(row) for row in created_rows],
        "completed": [_serialize_task_row(row) for row in completed_rows],
        "overdue": [_serialize_task_row(row) for row in overdue_rows],
        "meta": {
            "week_start": start_date.isoformat(),
            "week_end": end_date.isoformat(),
            "previous_week_start": previous_start_date.isoformat(),
            "previous_week_end": previous_end_date.isoformat(),
            "created_prev_count": int(created_prev_count),
            "completed_prev_count": int(completed_prev_count),
            "overdue_prev_count": int(overdue_prev_count),
        },
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
            ListModel.title.label("status"),
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
        .group_by(Card.id, Card.title, ListModel.title, User.email)
        .order_by(func.coalesce(func.sum(Timesheet.hours), 0).desc())
        .all()
    )

    return [
        {
            "card_id": row.card_id,
            "title": row.title,
            "status": row.status,
            "responsible": row.responsible,
            "total_hours": float(row.total_hours or 0),
        }
        for row in rows
    ]
