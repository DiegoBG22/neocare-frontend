from pydantic import BaseModel
from typing import List, Optional, ForwardRef
from datetime import datetime
 
# Forward references
Card = ForwardRef('Card')
ListSchema = ForwardRef('ListSchema')
 
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
 
class CardCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    list_id: int
 
class CardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    list_id: Optional[int] = None
    user_id: Optional[int] = None
 
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
        orm_mode = True
 
# Board Schemas
class BoardBase(BaseModel):
    title: str
 
class BoardCreate(BoardBase):
    pass
 
class Board(BoardBase):
    id: int
    user_id: int
    lists: List[ListModel] = []  # Asegúrate de usar comillas simples aquí
 
    class Config:
        from_attributes = True
 
# Update forward references at the end of the file
Card.update_forward_refs()
ListModel.update_forward_refs()
Board.update_forward_refs()