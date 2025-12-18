from typing import List as ListType, Optional
 
from sqlalchemy.orm import Session
 
from models import User, Board, List as ListModel
from schemas import UserCreate, BoardCreate, ListCreate
 
 
def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()
 
 
def create_user(db: Session, user_in: UserCreate) -> User:
    db_user = User(
        email=user_in.email,
        hashed_password=user_in.password,
        is_active=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
 
 
def create_board(db: Session, user_id: int, board_in: BoardCreate) -> Board:
    db_board = Board(title=board_in.title, user_id=user_id)
    db.add(db_board)
    db.commit()
    db.refresh(db_board)
    return db_board
 
 
def get_boards_by_user(db: Session, user_id: int) -> ListType[Board]:
    return db.query(Board).filter(Board.user_id == user_id).all()
 
 
def get_board_by_id_and_user(
    db: Session, board_id: int, user_id: int
) -> Optional[Board]:
    return (
        db.query(Board)
        .filter(Board.id == board_id, Board.user_id == user_id)
        .first()
    )
 
 
def delete_board(db: Session, board_id: int, user_id: int) -> bool:
    board = get_board_by_id_and_user(db, board_id, user_id)
    if board is None:
        return False
 
    db.delete(board)
    db.commit()
    return True
 
 
def create_list(db: Session, user_id: int, list_in: ListCreate) -> Optional[ListModel]:
    board = get_board_by_id_and_user(db, list_in.board_id, user_id)
    if board is None:
        return None
 
    db_list = ListModel(title=list_in.title, board_id=board.id)
    db.add(db_list)
    db.commit()
    db.refresh(db_list)
    return db_list
 
 
def get_lists_by_board(
    db: Session, board_id: int, user_id: int
) -> ListType[ListModel]:
    board = get_board_by_id_and_user(db, board_id, user_id)
    if board is None:
        return []
 
    return db.query(ListModel).filter(ListModel.board_id == board.id).all()
 
 
def get_list_by_id_and_user(
    db: Session, list_id: int, user_id: int
) -> Optional[ListModel]:
    return (
        db.query(ListModel)
        .join(Board, Board.id == ListModel.board_id)
        .filter(ListModel.id == list_id, Board.user_id == user_id)
        .first()
    )
 
 
def delete_list(db: Session, list_id: int, user_id: int) -> bool:
    list_obj = get_list_by_id_and_user(db, list_id, user_id)
    if list_obj is None:
        return False
 
    db.delete(list_obj)
    db.commit()
    return True
