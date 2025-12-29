from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Date
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    boards = relationship("Board", back_populates="owner")
    # Nueva relación para horas
    timesheets = relationship("Timesheet", back_populates="user")

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
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    list_id = Column(Integer, ForeignKey("lists.id"))
    list_ref = relationship("List", back_populates="cards")
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User")
    # Nueva relación para horas
    timesheets = relationship("Timesheet", back_populates="card", cascade="all, delete-orphan")

# NUEVA CLASE TIMESHEET
class Timesheet(Base):
    __tablename__ = "timesheets"
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    hours = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user_id = Column(Integer, ForeignKey("users.id"))
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=True)

    user = relationship("User", back_populates="timesheets")
    card = relationship("Card", back_populates="timesheets")