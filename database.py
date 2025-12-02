from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Importa el placeholder de la URL.
# El archivo config.py debe estar en la misma carpeta.
from .config import DATABASE_URL

# Crea el motor de conexión a la base de datos
engine = create_engine(DATABASE_URL)

# Crea una clase SessionLocal. Se usará para crear sesiones de BD.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base es la clase base que se usará para definir todos los modelos (tablas)
Base = declarative_base()

# Función de utilidad para obtener una sesión de BD (usado por FastAPI como dependencia)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
