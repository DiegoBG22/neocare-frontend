from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class BoardBase(BaseModel):
    title: str


class BoardCreate(BoardBase):
    pass


class Board(BoardBase):
    id: int
    user_id: int

    class Config:
        orm_mode = True


class ListBase(BaseModel):
    title: str


class ListCreate(ListBase):
    board_id: int


class List(ListBase):
    id: int
    board_id: int

    class Config:
        orm_mode = True
