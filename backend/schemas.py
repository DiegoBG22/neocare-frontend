from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date

# User Schemas
class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Card Schemas
class CardBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    list_id: int
    user_id: int
    order: int = 0
    completed: Optional[bool] = False
    overdue: Optional[bool] = False

class CardCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    list_id: int
    user_id: int

class CardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    list_id: Optional[int] = None
    user_id: Optional[int] = None
    order: Optional[int] = None
    completed: Optional[bool] = None
    overdue: Optional[bool] = None

class CardMove(BaseModel):
    list_id: int
    new_order: int

class Card(CardBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# List Schemas
class ListBase(BaseModel):
    title: str

class ListCreate(ListBase):
    board_id: int

class ListModel(ListBase):
    id: int
    board_id: int
    cards: List[Card] = []

    class Config:
        from_attributes = True

# Board Schemas
class BoardBase(BaseModel):
    title: str

class BoardCreate(BoardBase):
    pass

class Board(BoardBase):
    id: int
    user_id: int
    lists: List[ListModel] = []

    class Config:
        from_attributes = True

# Timesheet Schemas
class TimesheetBase(BaseModel):
    description: str
    hours: float
    date: date
    card_id: Optional[int] = None

class TimesheetCreate(TimesheetBase):
    pass

class Timesheet(TimesheetBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Semana 6: Schemas para etiquetas (labels) y subtareas (checklists)

class LabelBase(BaseModel):
    name: str
    color: str

class LabelCreate(LabelBase):
    pass

class Label(LabelBase):
    id: int
    card_id: int

    class Config:
        from_attributes = True

class SubtaskBase(BaseModel):
    title: str
    completed: bool = False

class SubtaskCreate(BaseModel):
    title: str

class SubtaskUpdate(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None

class Subtask(SubtaskBase):
    id: int
    card_id: int

    class Config:
        from_attributes = True