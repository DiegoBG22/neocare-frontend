from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    boards = relationship("Board", back_populates="owner")

class Board(Base):
    __tablename__ = "boards"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="boards")
    lists = relationship("List", back_populates="board")

class List(Base):
    __tablename__ = "lists"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    board_id = Column(Integer, ForeignKey("boards.id"))
    board = relationship("Board", back_populates="lists")
    
    # CORRECCIÓN AQUÍ: Añadido order_by para que las tarjetas salgan en orden
    cards = relationship(
        "Card", 
        back_populates="list_ref", 
        cascade="all, delete-orphan",
        order_by="Card.order" 
    )

class Card(Base):
    __tablename__ = "cards"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    due_date = Column(DateTime, nullable=True)
    order = Column(Integer, default=0)  # Campo para la posición
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    list_id = Column(Integer, ForeignKey("lists.id"))
    list_ref = relationship("List", back_populates="cards")
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User")