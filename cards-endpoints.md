# Predocumentacion — Endpoints de Tarjetas (Cards) — Semana 1

## 1. Introduccion
Las tarjetas (cards) representan tareas dentro de las columnas del tablero (Por hacer, En curso, Hecho).
Esta predocumentacion describe los endpoints CRUD previstos para gestionar las tarjetas segun la estructura de la API del proyecto NeoCare.

---

## 2. Base URL
*URL local del backend:*
http://127.0.0.1:8000

*Ruta base propuesta para tarjetas:*
/api/cards

---

## 3. Endpoints (CRUD)

### 3.1 Crear tarjeta
POST /api/cards

Body esperado (JSON):
{ "title": "string", "description": "string", "deadline": "YYYY-MM-DD", "assigned_to": 123, "list_id": 1 }

Respuesta (201 Created):
{ "id": 12, "title": "Tarea nueva", "description": "Descripcion de ejemplo", "deadline": "2025-12-04", "assigned_to": 3, "list_id": 1, "status": "Por hacer", "created_at": "2025-12-04T12:00:00Z" }

Errores comunes:
- 400 Bad Request → datos invalidos
- 401 Unauthorized → falta token
- 404 Not Found → list_id no existe
- 422 Validation Error → formato incorrecto

---

### 3.2 Listar tarjetas de una lista
GET /api/cards?list_id=1

Respuesta (200 OK):
[ { "id": 12, "title": "Tarea nueva", "description": "Descripcion...", "deadline": "2025-12-04", "assigned_to": 3, "list_id": 1, "status": "Por hacer", "created_at": "2025-12-04T12:00:00Z" } ]

---

### 3.3 Obtener una tarjeta por id
GET /api/cards/{card_id}

Respuesta (200 OK):
{ "id": 12, "title": "Tarea nueva", "description": "Descripcion...", "deadline": "2025-12-04", "assigned_to": 3, "list_id": 1, "status": "Por hacer", "created_at": "2025-12-04T12:00:00Z" }

Errores:
- 404 Not Found — tarjeta no existe
- 401 Unauthorized — token requerido

---

### 3.4 Actualizar tarjeta
PUT /api/cards/{card_id}

Body (JSON):
{ "title": "Nuevo titulo", "description": "Texto actualizado", "deadline": "2025-12-10", "assigned_to": 3, "list_id": 2, "status": "En curso" }

Respuesta (200 OK):
{ "message": "Card updated successfully", "card": { "id": 12, "title": "Nuevo titulo", "description": "Texto actualizado", "deadline": "2025-12-10", "assigned_to": 3, "list_id": 2, "status": "En curso" } }

---

### 3.5 Eliminar tarjeta
DELETE /api/cards/{card_id}

Respuesta (200 OK):
{ "message": "Card deleted successfully" }

Errores:
- 404 Not Found — tarjeta no encontrada
- 403 Forbidden — borrar tarjeta ajena
- 401 Unauthorized — token faltante

---

## 4. Reglas y validaciones previstas
- title: obligatorio (1–255 caracteres)
- description: opcional (max 2000 caracteres)
- deadline: formato valido YYYY-MM-DD
- assigned_to: debe existir en la tabla de usuarios
- list_id: obligatorio, debe existir en la tabla de listas

---

## 5. Notas para integracion Frontend–Backend
- Rutas protegidas con token JWT
- Header obligatorio:
Authorization: Bearer <token>
- El frontend debe manejar errores 401, 403 y 422

Documento creado por: Esthibaliz Garcia
Fecha: [11/12/2025]
