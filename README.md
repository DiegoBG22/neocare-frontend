# NeoCare - Proyecto de Practicas

Este proyecto consiste en una aplicacion web tipo tablero Kanban para la gestion de tareas, desarrollada como parte de las practicas en Nexeus.

La aplicacion permite organizar el trabajo mediante tableros, listas y tarjetas, similar a herramientas como Trello.

---

## Tecnologias utilizadas

- Backend: Python + FastAPI
- Frontend: React
- Base de datos: SQLite
- Autenticacion: JWT

---

## Ejecucion del proyecto en local

Backend:

1. Instalar dependencias:
pip install -r requirements.txt

2. Levantar el servidor:
uvicorn main:app --reload

El backend estara disponible en:
http://127.0.0.1:8000

La documentacion interactiva de la API se puede consultar en:
http://127.0.0.1:8000/docs

---

## Estructura del proyecto

- auth_router.py: autenticacion y login
- board_router.py: gestion de tableros
- list_router.py: gestion de listas
- card_router.py: gestion de tarjetas

---

## Documentacion de la API

La documentacion tecnica detallada de los endpoints se encuentra en el siguiente archivo:

- CRUD de Tarjetas: cards-endpoints.md

Este documento describe las rutas disponibles, los metodos HTTP, los cuerpos de las peticiones y las respuestas esperadas para la gestion de tarjetas.

---

## Estado actual del proyecto

Actualmente el proyecto se encuentra en fase de integracion Frontend y Backend.

Se esta trabajando en la funcionalidad de Drag & Drop de tarjetas entre columnas, asegurando que el orden se persista correctamente en base de datos y que la experiencia de usuario sea fluida y estable.
