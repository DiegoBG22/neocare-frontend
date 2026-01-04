from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from database import get_db
from auth_handler import verify_token
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(prefix="/report", tags=["Report"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user_id(token: str = Depends(oauth2_scheme)):
    user_id = verify_token(token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id


def week_to_dates(week: str):
    try:
        if not week or "-W" not in week:
            raise ValueError("Formato de semana inválido")

        year, week_num = week.split("-W")

        first_day = datetime.strptime(
            f"{year}-W{week_num}-1",
            "%Y-W%W-%w"
        ).date()

        last_day = first_day + timedelta(days=6)
        return first_day, last_day

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid week format. Expected YYYY-Www"
        )
        
@router.get("/{board_id}/summary")
def report_summary(
    board_id: int,
    week: str = Query(...),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    start_date, end_date = week_to_dates(week)

    board = db.execute(
        "SELECT id FROM boards WHERE id = :board_id AND user_id = :user_id",
        {"board_id": board_id, "user_id": user_id}
    ).fetchone()

    if not board:
        raise HTTPException(status_code=403, detail="Board not accessible")

    created = db.execute(
        """
        SELECT COUNT(*) FROM cards
        WHERE board_id = :board_id
        AND created_at BETWEEN :start AND :end
        """,
        {"board_id": board_id, "start": start_date, "end": end_date}
    ).scalar()

    completed = db.execute(
        """
        SELECT COUNT(*) FROM cards
        WHERE board_id = :board_id
        AND status = 'completed'
        AND updated_at BETWEEN :start AND :end
        """,
        {"board_id": board_id, "start": start_date, "end": end_date}
    ).scalar()

    overdue = db.execute(
        """
        SELECT COUNT(*) FROM cards
        WHERE board_id = :board_id
        AND due_date < :today
        AND status != 'completed'
        """,
        {"board_id": board_id, "today": date.today()}
    ).scalar()

    return {
        "created": created,
        "completed": completed,
        "overdue": overdue
    }

@router.get("/{board_id}/hours-by-user")
def report_hours_by_user(
    board_id: int,
    week: str = Query(...),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    start_date, end_date = week_to_dates(week)

    rows = db.execute(
        """
        SELECT 
            t.user_id,
            u.email AS user_email,
            SUM(t.hours) AS total_hours,
            COUNT(DISTINCT t.card_id) AS tasks_count
        FROM timesheets t
        JOIN users u ON u.id = t.user_id
        JOIN cards c ON c.id = t.card_id
        WHERE c.board_id = :board_id
          AND t.date BETWEEN :start AND :end
        GROUP BY t.user_id, u.email
        """,
        {
            "board_id": board_id,
            "start": start_date,
            "end": end_date
        }
    ).fetchall()

    return [
        {
            "user_id": r.user_id,
            "user_email": r.user_email,
            "total_hours": r.total_hours,
            "tasks_count": r.tasks_count
        }
        for r in rows
    ]

@router.get("/{board_id}/hours-by-card")
def report_hours_by_card(
    board_id: int,
    week: str = Query(...),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    start_date, end_date = week_to_dates(week)

    # Verificar que el tablero pertenece al usuario
    board = db.execute(
        "SELECT id FROM boards WHERE id = :board_id AND user_id = :user_id",
        {"board_id": board_id, "user_id": user_id}
    ).fetchone()

    if not board:
        raise HTTPException(status_code=403, detail="Board not accessible")

    rows = db.execute(
        """
        SELECT 
            cards.id AS card_id,
            cards.title AS title,
            cards.status AS status,
            users.email AS responsible,
            SUM(worklogs.hours) AS total_hours
        FROM worklogs
        JOIN cards ON worklogs.card_id = cards.id
        JOIN users ON worklogs.user_id = users.id
        WHERE cards.board_id = :board_id
        AND worklogs.date BETWEEN :start AND :end
        GROUP BY cards.id, cards.title, cards.status, users.email
        ORDER BY total_hours DESC
        """,
        {
            "board_id": board_id,
            "start": start_date,
            "end": end_date
        }
    ).fetchall()

    return [
        {
            "card_id": row.card_id,
            "title": row.title,
            "status": row.status,
            "responsible": row.responsible,
            "total_hours": row.total_hours or 0
        }
        for row in rows
    ]