from database import Base, engine
import models

models.Base.metadata.create_all(bind=engine)

from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
async def health_check():
    return {"status": "OK", "service": "FastAPI Backend"}
