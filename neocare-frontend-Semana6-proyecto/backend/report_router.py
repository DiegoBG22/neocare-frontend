# report_router.py - VERSIÓN MEJORADA Y DEPURABLE
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Board, Card, List as ListModel, Timesheet, User
from auth_router import get_current_user
from crud import get_board_by_id_and_user

router = APIRouter(prefix="/report", tags=["Report"])

def week_to_dates(week: str) -> tuple[date, date]:
    """Convierte una semana en formato YYYY-Www en rango de fechas (lunes-domingo)."""
    try:
        if "W" not in week:
            raise ValueError("Formato inválido. Debe contener 'W'.")
        
        year_str, week_part = week.split("-W")
        year = int(year_str)
        week_number = int(week_part)
        
        # Enero 4 siempre está en la semana 1 según ISO 8601
        jan4 = date(year, 1, 4)
        jan4_monday = jan4 - timedelta(days=jan4.isoweekday() - 1)
        first_day = jan4_monday + timedelta(weeks=week_number - 1)
        last_day = first_day + timedelta(days=6)
        
        return first_day, last_day
        
    except (ValueError, AttributeError) as e:
        raise HTTPException(
            status_code=400,
            detail=f"Formato de semana inválido. Use 'YYYY-Www', ej: '2025-W01'. Error: {str(e)}",
        )

@router.get("/debug/{board_id}")
def debug_board_data(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Endpoint para depurar y ver qué datos tienes realmente."""
    
    # 1. Verificar acceso al tablero
    board = get_board_by_id_and_user(db, board_id, current_user.id)
    if not board:
        return {"error": f"No tienes acceso al tablero {board_id}", "user_id": current_user.id}
    
    # 2. Obtener todas las listas del tablero con sus nombres
    lists = db.query(ListModel).filter(ListModel.board_id == board_id).all()
    
    # 3. Obtener todas las tarjetas del tablero
    cards = (
        db.query(Card)
        .join(ListModel, Card.list_id == ListModel.id)
        .filter(ListModel.board_id == board_id)
        .options(joinedload(Card.user))
        .all()
    )
    
    # 4. Obtener timesheets del tablero
    timesheets = (
        db.query(Timesheet)
        .join(Card, Timesheet.card_id == Card.id)
        .join(ListModel, Card.list_id == ListModel.id)
        .filter(ListModel.board_id == board_id)
        .all()
    )
    
    # 5. Formatear respuesta para diagnóstico
    return {
        "board": {
            "id": board.id,
            "title": board.title,
            "user_id": board.user_id,
            "description": board.description
        },
        "lists": [
            {
                "id": l.id,
                "title": l.title,
                "position": l.position,
                "card_count": len([c for c in cards if c.list_id == l.id])
            }
            for l in lists
        ],
        "cards_sample": [
            {
                "id": c.id,
                "title": c.title,
                "list_id": c.list_id,
                "list_name": next((l.title for l in lists if l.id == c.list_id), "Unknown"),
                "user_id": c.user_id,
                "user_email": c.user.email if c.user else None,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
                "due_date": c.due_date.isoformat() if c.due_date else None,
                "completed": c.completed,
                "overdue": c.overdue,
                "has_due_date": c.due_date is not None
            }
            for c in cards[:20]  # Mostrar solo las primeras 20 para no saturar
        ],
        "total_cards": len(cards),
        "timesheets_sample": [
            {
                "id": t.id,
                "card_id": t.card_id,
                "user_id": t.user_id,
                "hours": t.hours,
                "date": t.date.isoformat() if t.date else None,
                "description": t.description
            }
            for t in timesheets[:20]
        ],
        "total_timesheets": len(timesheets),
        "statistics": {
            "cards_with_due_date": len([c for c in cards if c.due_date]),
            "cards_completed": len([c for c in cards if c.completed]),
            "cards_overdue": len([c for c in cards if c.overdue]),
            "cards_in_done_list": len([c for c in cards if any(
                l.title.lower() in ["hecho", "done", "completado", "finalizado"] 
                for l in lists if l.id == c.list_id
            )]),
            "cards_updated_last_week": len([c for c in cards if c.updated_at and 
                c.updated_at >= datetime.now() - timedelta(days=7)]),
            "cards_created_last_week": len([c for c in cards if c.created_at and 
                c.created_at >= datetime.now() - timedelta(days=7)])
        }
    }

@router.get("/{board_id}/summary")
def report_summary(
    board_id: int,
    week: str = Query(..., description="Semana en formato YYYY-Www, por ejemplo 2025-W01"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resumen semanal del tablero - VERSIÓN MEJORADA que incluye tarjetas marcadas como completadas/vencidas."""
    
    # 1. Verificar acceso al tablero
    board = get_board_by_id_and_user(db, board_id, current_user.id)
    if board is None:
        raise HTTPException(status_code=403, detail="No tienes acceso a este tablero")
    
    # 2. Obtener rango de fechas
    try:
        start_date, end_date = week_to_dates(week)
        start_dt = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(end_date, datetime.max.time())
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error en formato de fecha: {str(e)}")
    
    print(f"📊 [REPORT] Procesando tablero {board_id}, semana {week}")
    print(f"📅 [REPORT] Rango: {start_date} a {end_date}")
    
    # 3. Buscar nombres de listas (flexible para diferentes nombres)
    lists = db.query(ListModel).filter(ListModel.board_id == board_id).all()
    
    # Intentar detectar automáticamente la lista "Hecho/Done"
    done_list_names = ["hecho", "done", "completado", "finalizado", "terminado", "completo",
    "completadas", "completados", "realizado", "realizada", "finalizadas"]
    done_list = None
    for lista in lists:
        if any(done_name in lista.title.lower() for done_name in done_list_names):
            done_list = lista
            print(f"✅ [REPORT] Lista 'Hecho' detectada: '{lista.title}' (id={lista.id})")
            break
    
    # Intentar detectar lista "Vencidas"
    overdue_list_names = ["vencido", "vencida", "vencidas", "vencidos", "overdue", "atrasado", "atrasada"]
    overdue_list = None
    for lista in lists:
        if any(overdue_name in lista.title.lower() for overdue_name in overdue_list_names):
            overdue_list = lista
            print(f"⚠️ [REPORT] Lista 'Vencidas' detectada: '{lista.title}' (id={lista.id})")
            break
    
    # 4. Función auxiliar para serializar - VERSIÓN MEJORADA
    def serialize_task_row(row) -> dict:
        return {
            "id": row.card_id,
            "title": row.title,
            "responsible": row.responsible or "Sin responsable",
            "status": row.status or "",
            "due_date": getattr(row, 'due_date', None).isoformat() if getattr(row, 'due_date', None) else None,
            "updated_at": getattr(row, 'updated_at', None).isoformat() if getattr(row, 'updated_at', None) else None,
            "created_at": getattr(row, 'created_at', None).isoformat() if getattr(row, 'created_at', None) else None,
            "completed": getattr(row, 'is_completed', False),
            "overdue": getattr(row, 'is_overdue', False),
        }
    
    # 5. TAREAS NUEVAS: created_at en la semana
    created_query = (
        db.query(
            Card.id.label("card_id"),
            Card.title.label("title"),
            User.email.label("responsible"),
            ListModel.title.label("status"),
            Card.created_at.label("created_at"),
            Card.due_date.label("due_date"),
            Card.completed.label("is_completed"),
            Card.overdue.label("is_overdue")
        )
        .outerjoin(User, User.id == Card.user_id)
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
            Card.created_at.between(start_dt, end_dt)
        )
        .order_by(Card.created_at.desc())
    )
    
    created_rows = created_query.all()
    print(f"📊 [REPORT] Tarjetas NUEVAS encontradas: {len(created_rows)}")
    
    # 6. TAREAS COMPLETADAS - VERSIÓN MEJORADA (múltiples formas de detectar)
    completed_rows = []
    
    # OPCIÓN 1: Por campo completed=True (lo más importante)
    completed_by_field_query = (
        db.query(
            Card.id.label("card_id"),
            Card.title.label("title"),
            User.email.label("responsible"),
            ListModel.title.label("status"),
            Card.updated_at.label("updated_at"),
            Card.due_date.label("due_date"),
            Card.created_at.label("created_at"),
            Card.completed.label("is_completed"),
            Card.overdue.label("is_overdue")
        )
        .outerjoin(User, User.id == Card.user_id)
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
            Card.completed == True,  # ¡Esta es la clave!
        )
        .order_by(Card.updated_at.desc())
    )
    
    completed_by_field = completed_by_field_query.all()
    print(f"📊 [REPORT] Tarjetas COMPLETADAS (por campo completed=True): {len(completed_by_field)}")
    
    # OPCIÓN 2: Por lista "Hecho" (compatibilidad hacia atrás)
    completed_by_list = []
    if done_list:
        completed_list_query = (
            db.query(
                Card.id.label("card_id"),
                Card.title.label("title"),
                User.email.label("responsible"),
                ListModel.title.label("status"),
                Card.updated_at.label("updated_at"),
                Card.due_date.label("due_date"),
                Card.created_at.label("created_at"),
                Card.completed.label("is_completed"),
                Card.overdue.label("is_overdue")
            )
            .outerjoin(User, User.id == Card.user_id)
            .join(ListModel, ListModel.id == Card.list_id)
            .join(Board, Board.id == ListModel.board_id)
            .filter(
                Board.id == board_id,
                Board.user_id == current_user.id,
                ListModel.id == done_list.id,
            )
            .order_by(Card.updated_at.desc())
        )
        completed_by_list = completed_list_query.all()
        print(f"📊 [REPORT] Tarjetas en lista 'Hecho': {len(completed_by_list)}")
    
    # Combinar ambas opciones, evitando duplicados
    completed_ids = set()
    all_completed_rows = []
    
    # Primero las completadas por campo
    for row in completed_by_field:
        if row.card_id not in completed_ids:
            completed_ids.add(row.card_id)
            all_completed_rows.append(row)
    
    # Luego las de la lista (si no están ya)
    for row in completed_by_list:
        if row.card_id not in completed_ids:
            completed_ids.add(row.card_id)
            all_completed_rows.append(row)
    
    completed_rows = all_completed_rows
    print(f"📊 [REPORT] Tarjetas COMPLETADAS totales: {len(completed_rows)}")
    
    # 7. TAREAS VENCIDAS - VERSIÓN MEJORADA (múltiples formas de detectar)
    overdue_rows = []
    
    # OPCIÓN 1: Por campo overdue=True (lo más importante)
    overdue_by_field_query = (
        db.query(
            Card.id.label("card_id"),
            Card.title.label("title"),
            User.email.label("responsible"),
            ListModel.title.label("status"),
            Card.due_date.label("due_date"),
            Card.updated_at.label("updated_at"),
            Card.created_at.label("created_at"),
            Card.completed.label("is_completed"),
            Card.overdue.label("is_overdue")
        )
        .outerjoin(User, User.id == Card.user_id)
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
            Card.overdue == True,  # ¡Esta es la clave!
        )
        .order_by(Card.due_date.desc())
    )
    
    overdue_by_field = overdue_by_field_query.all()
    print(f"📊 [REPORT] Tarjetas VENCIDAS (por campo overdue=True): {len(overdue_by_field)}")
    
    # OPCIÓN 2: Por lista "Vencidas"
    overdue_by_list = []
    if overdue_list:
        overdue_list_query = (
            db.query(
                Card.id.label("card_id"),
                Card.title.label("title"),
                User.email.label("responsible"),
                ListModel.title.label("status"),
                Card.due_date.label("due_date"),
                Card.updated_at.label("updated_at"),
                Card.created_at.label("created_at"),
                Card.completed.label("is_completed"),
                Card.overdue.label("is_overdue")
            )
            .outerjoin(User, User.id == Card.user_id)
            .join(ListModel, ListModel.id == Card.list_id)
            .join(Board, Board.id == ListModel.board_id)
            .filter(
                Board.id == board_id,
                Board.user_id == current_user.id,
                ListModel.id == overdue_list.id,
            )
            .order_by(Card.due_date.desc())
        )
        overdue_by_list = overdue_list_query.all()
        print(f"📊 [REPORT] Tarjetas en lista 'Vencidas': {len(overdue_by_list)}")
    
    # OPCIÓN 3: Por due_date pasado (compatibilidad)
    overdue_by_date_query = (
        db.query(
            Card.id.label("card_id"),
            Card.title.label("title"),
            User.email.label("responsible"),
            ListModel.title.label("status"),
            Card.due_date.label("due_date"),
            Card.updated_at.label("updated_at"),
            Card.created_at.label("created_at"),
            Card.completed.label("is_completed"),
            Card.overdue.label("is_overdue")
        )
        .outerjoin(User, User.id == Card.user_id)
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
            Card.due_date.isnot(None),
            Card.due_date < datetime.now(),
        )
    )
    
    # Excluir tarjetas ya consideradas
    if done_list:
        overdue_by_date_query = overdue_by_date_query.filter(ListModel.id != done_list.id)
    if overdue_list:
        overdue_by_date_query = overdue_by_date_query.filter(ListModel.id != overdue_list.id)
    
    overdue_by_date = overdue_by_date_query.order_by(Card.due_date.desc()).all()
    print(f"📊 [REPORT] Tarjetas VENCIDAS (por fecha): {len(overdue_by_date)}")
    
    # Combinar todas las opciones, evitando duplicados
    overdue_ids = set()
    all_overdue_rows = []
    
    for row in overdue_by_field:
        if row.card_id not in overdue_ids:
            overdue_ids.add(row.card_id)
            all_overdue_rows.append(row)
    
    for row in overdue_by_list:
        if row.card_id not in overdue_ids:
            overdue_ids.add(row.card_id)
            all_overdue_rows.append(row)
    
    for row in overdue_by_date:
        if row.card_id not in overdue_ids:
            overdue_ids.add(row.card_id)
            all_overdue_rows.append(row)
    
    overdue_rows = all_overdue_rows
    print(f"📊 [REPORT] Tarjetas VENCIDAS totales: {len(overdue_rows)}")
    
    # 8. Cálculos de la semana anterior para comparativas
    previous_start_date = start_date - timedelta(days=7)
    previous_end_date = end_date - timedelta(days=7)
    prev_start_dt = datetime.combine(previous_start_date, datetime.min.time())
    prev_end_dt = datetime.combine(previous_end_date, datetime.max.time())
    
    # Conteo de nuevas semana anterior
    created_prev_count = (
        db.query(func.count(Card.id))
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
            Card.created_at.between(prev_start_dt, prev_end_dt)
        )
        .scalar() or 0
    )
    
    # Conteo de completadas semana anterior (por campo completed)
    completed_prev_count = (
        db.query(func.count(Card.id))
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
            Card.completed == True,
            Card.updated_at.between(prev_start_dt, prev_end_dt)
        )
        .scalar() or 0
    )
    
    # Conteo de vencidas semana anterior (por campo overdue)
    overdue_prev_count = (
        db.query(func.count(Card.id))
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
            Card.overdue == True,
            Card.updated_at.between(prev_start_dt, prev_end_dt)
        )
        .scalar() or 0
    )
    
    # 9. Preparar respuesta con metadatos adicionales
    response = {
        "created": [serialize_task_row(row) for row in created_rows],
        "completed": [serialize_task_row(row) for row in completed_rows],
        "overdue": [serialize_task_row(row) for row in overdue_rows],
        "meta": {
            "week_start": start_date.isoformat(),
            "week_end": end_date.isoformat(),
            "previous_week_start": previous_start_date.isoformat(),
            "previous_week_end": previous_end_date.isoformat(),
            "created_prev_count": int(created_prev_count),
            "completed_prev_count": int(completed_prev_count),
            "overdue_prev_count": int(overdue_prev_count),
            "done_list_name": done_list.title if done_list else "No encontrada",
            "done_list_id": done_list.id if done_list else None,
            "overdue_list_name": overdue_list.title if overdue_list else "No encontrada",
            "overdue_list_id": overdue_list.id if overdue_list else None,
            "total_lists": len(lists),
            "list_names": [l.title for l in lists]
        }
    }
    
    print(f"✅ [REPORT] Resumen generado: {len(created_rows)} nuevas, {len(completed_rows)} completadas, {len(overdue_rows)} vencidas")
    print(f"📋 [REPORT] Listas encontradas: {[l.title for l in lists]}")
    return response

@router.get("/{board_id}/hours-by-user")
def report_hours_by_user(
    board_id: int,
    week: str = Query(..., description="Semana en formato YYYY-Www"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reporte de horas trabajadas por usuario."""
    
    board = get_board_by_id_and_user(db, board_id, current_user.id)
    if board is None:
        raise HTTPException(status_code=403, detail="No tienes acceso a este tablero")
    
    try:
        start_date, end_date = week_to_dates(week)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error en formato de semana: {str(e)}")
    
    print(f"⏱️ [HOURS-BY-USER] Procesando tablero {board_id}, semana {week}")
    
    # Consulta principal de horas - CORREGIDA
    rows = (
        db.query(
            Timesheet.user_id.label("user_id"),
            User.email.label("user_email"),  # CORREGIDO: username -> email
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
        .group_by(Timesheet.user_id, User.email)  # CORREGIDO: username -> email
        .order_by(func.coalesce(func.sum(Timesheet.hours), 0).desc())
        .all()
    )
    
    print(f"⏱️ [HOURS-BY-USER] {len(rows)} usuarios con horas registradas")
    
    # Si no hay resultados, mostrar usuarios del tablero aunque no tengan horas
    if not rows:
        users_in_board = (
            db.query(User)
            .join(Card, Card.user_id == User.id, isouter=True)
            .join(ListModel, ListModel.id == Card.list_id, isouter=True)
            .filter(
                ListModel.board_id == board_id,
                Board.user_id == current_user.id
            )
            .distinct()
            .all()
        )
        
        rows = [
            {
                "user_id": user.id,
                "user_email": user.email,
                "total_hours": 0,
                "tasks_count": 0
            }
            for user in users_in_board
        ]
        print(f"⏱️ [HOURS-BY-USER] Mostrando {len(rows)} usuarios del tablero (sin horas)")
    
    return [
        {
            "user_id": row.user_id if hasattr(row, 'user_id') else row.get('user_id'),
            "user_email": row.user_email if hasattr(row, 'user_email') else row.get('user_email'),
            "user_name": row.user_email.split('@')[0] if row.user_email else "Usuario",  # CORREGIDO
            "total_hours": float(getattr(row, 'total_hours', 0) or row.get('total_hours', 0)),
            "tasks_count": int(getattr(row, 'tasks_count', 0) or row.get('tasks_count', 0)),
        }
        for row in rows
    ]

@router.get("/{board_id}/hours-by-card")
def report_hours_by_card(
    board_id: int,
    week: str = Query(..., description="Semana en formato YYYY-Www"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reporte de horas trabajadas por tarjeta."""
    
    board = get_board_by_id_and_user(db, board_id, current_user.id)
    if board is None:
        raise HTTPException(status_code=403, detail="No tienes acceso a este tablero")
    
    try:
        start_date, end_date = week_to_dates(week)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error en formato de semana: {str(e)}")
    
    print(f"📋 [HOURS-BY-CARD] Procesando tablero {board_id}, semana {week}")
    
    # Consulta optimizada con left join para incluir tarjetas sin timesheets - CORREGIDA
    rows = (
        db.query(
            Card.id.label("card_id"),
            Card.title.label("title"),
            Card.description.label("description"),
            ListModel.title.label("status"),
            User.email.label("responsible_email"),  # CORREGIDO: username -> email
            func.coalesce(func.sum(Timesheet.hours), 0).label("total_hours"),
            func.count(Timesheet.id).label("timesheet_entries"),
            Card.completed.label("completed"),
            Card.overdue.label("overdue")
        )
        .join(ListModel, ListModel.id == Card.list_id)
        .join(Board, Board.id == ListModel.board_id)
        .outerjoin(Timesheet, and_(
            Timesheet.card_id == Card.id,
            Timesheet.date >= start_date,
            Timesheet.date <= end_date
        ))
        .outerjoin(User, User.id == Card.user_id)
        .filter(
            Board.id == board_id,
            Board.user_id == current_user.id,
        )
        .group_by(Card.id, Card.title, Card.description, ListModel.title, User.email, Card.completed, Card.overdue)  # Agregados
        .order_by(func.coalesce(func.sum(Timesheet.hours), 0).desc())
        .all()
    )
    
    print(f"📋 [HOURS-BY-CARD] {len(rows)} tarjetas procesadas")
    
    return [
        {
            "card_id": row.card_id,
            "title": row.title,
            "description": row.description or "",
            "status": row.status or "Sin estado",
            "responsible": row.responsible_email or "Sin responsable",  # CORREGIDO
            "responsible_name": (row.responsible_email.split('@')[0] 
                               if row.responsible_email else "Sin responsable"),  # CORREGIDO
            "total_hours": float(row.total_hours or 0),
            "timesheet_entries": row.timesheet_entries or 0,
            "avg_hours_per_entry": float(row.total_hours or 0) / (row.timesheet_entries or 1),
            "completed": bool(row.completed),
            "overdue": bool(row.overdue)
        }
        for row in rows
    ]

@router.get("/{board_id}/weeks-available")
def get_available_weeks(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtiene las semanas que tienen datos disponibles para reportes."""
    
    board = get_board_by_id_and_user(db, board_id, current_user.id)
    if board is None:
        raise HTTPException(status_code=403, detail="No tienes acceso a este tablero")
    
    # Obtener todas las fechas con actividad en el tablero
    dates = []
    
    # Fechas de creación de tarjetas
    card_dates = db.query(func.date(Card.created_at)).join(
        ListModel, ListModel.id == Card.list_id
    ).filter(
        ListModel.board_id == board_id
    ).distinct().all()
    
    # Fechas de actualización de tarjetas
    update_dates = db.query(func.date(Card.updated_at)).join(
        ListModel, ListModel.id == Card.list_id
    ).filter(
        ListModel.board_id == board_id,
        Card.updated_at.isnot(None)
    ).distinct().all()
    
    # Fechas de timesheets
    timesheet_dates = db.query(func.date(Timesheet.date)).join(
        Card, Card.id == Timesheet.card_id
    ).join(
        ListModel, ListModel.id == Card.list_id
    ).filter(
        ListModel.board_id == board_id,
        Timesheet.date.isnot(None)
    ).distinct().all()
    
    # Combinar todas las fechas
    all_dates = set()
    for date_set in [card_dates, update_dates, timesheet_dates]:
        for d in date_set:
            if d[0]:  # Si no es None
                all_dates.add(d[0])
    
    # Convertir a semanas ISO
    weeks = set()
    for d in all_dates:
        if isinstance(d, date):
            iso_year, iso_week, _ = d.isocalendar()
            weeks.add(f"{iso_year}-W{iso_week:02d}")
    
    return {
        "board_id": board_id,
        "board_title": board.title,
        "available_weeks": sorted(list(weeks), reverse=True),
        "total_weeks": len(weeks)
    }