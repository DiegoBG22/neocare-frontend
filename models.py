from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from .database import Base

# =====================================================================
# Modelo 'User' (Tabla 'users')
# =====================================================================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

    # Relación: Un usuario puede tener varios tableros (boards)
    boards = relationship("Board", back_populates="owner")

# =====================================================================
# Modelo 'Board' (Tabla 'boards')
# =====================================================================
class Board(Base):
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    
    # Clave Foránea: Relaciona el tablero con el usuario que lo creó
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Relación con el usuario (el dueño) y las listas dentro del tablero
    owner = relationship("User", back_populates="boards")
    lists = relationship("List", back_populates="board")

# =====================================================================
# Modelo 'List' (Tabla 'lists')
# =====================================================================
class List(Base):
    __tablename__ = "lists"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    
    # Clave Foránea: Relaciona la lista con su tablero
    board_id = Column(Integer, ForeignKey("boards.id"))

    # Relación con el tablero al que pertenece
    board = relationship("Board", back_populates="lists")
