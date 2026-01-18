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
    # Relación para horas
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
        order_by="Card.order",
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
    # Relación para horas
    timesheets = relationship(
        "Timesheet", back_populates="card", cascade="all, delete-orphan"
    )

    # Estado de la tarjeta
    completed = Column(Boolean, default=False)
    overdue = Column(Boolean, default=False)

    # Semana 6: etiquetas y subtareas
    labels = relationship(
        "Label", back_populates="card", cascade="all, delete-orphan"
    )
    subtasks = relationship(
        "Subtask", back_populates="card", cascade="all, delete-orphan"
    )


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


class Label(Base):
    __tablename__ = "labels"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False, index=True)
    name = Column(String(30), nullable=False)
    color = Column(String(20), nullable=False)

    card = relationship("Card", back_populates="labels")


class Subtask(Base):
    __tablename__ = "subtasks"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False, index=True)
    title = Column(String(100), nullable=False)
    completed = Column(Boolean, default=False)

    card = relationship("Card", back_populates="subtasks")