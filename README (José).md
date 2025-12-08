### 🚀 Neocare Project Management System

#### 📄 Resumen del Proyecto

Es una **aplicación web interna** para gestionar proyectos de innovación dentro de NeoCare Health. Su objetivo es centralizar la organización de tareas (mediante un tablero Kanban), registrar las horas trabajadas y generar informes semanales automáticos. La meta es mejorar la visibilidad y eficiencia del departamento, reduciendo la dependencia de herramientas dispersas como Excel o Trello.

### 📅 Cronograma General

<img width="790" height="345" alt="Captura de pantalla 2025-12-07 115725" src="https://github.com/user-attachments/assets/0703c834-feeb-4907-97ca-bafdf4338698" />

### 👥 Equipo y Roles


<img width="838" height="279" alt="Captura de pantalla 2025-12-07 115921" src="https://github.com/user-attachments/assets/58e01b72-458c-4be7-9355-74afef1477da" />


### 🛠️ Stack Tecnológico
Estas son las tecnologías utilizadas en el proyecto:

**-   Frontend:** React + Vite + TypeScript

**-   Backend:** Python + FastAPI

**-   Base de Datos:** PostgreSQL (producción) / SQLite (desarrollo)

**-   Alojamiento (Frontend):** Vercel

**-   Alojamiento (Backend):** Render

**-   Autenticación:** JWT (JSON Web Tokens)

**-   Funcionalidad Drag & Drop:** dnd-kit

### 💻 Backend: Arquitectura y Funcionalidades

**Neocare Backend** es una **API REST** desarrollada con **FastAPI** y **SQLite** (para desarrollo local)
que expone endpoints para autenticación con JWT, y la gestión completa de **usuarios**, **tableros** 
y **listas** (elementos clave del tablero Kanban).

#### ✅ Funcionalidades ya Operativas (Diciembre 2024)

El Backend está **completado (Auth + CRUD)** y listo para la integración con el Frontend.

<img width="795" height="579" alt="image" src="https://github.com/user-attachments/assets/02f8fc90-9c64-4de2-89a9-1a9b9061e2f9" />

**IMPORTANTE:** Todos los endpoints (excepto /login y /register) están protegidos y requieren el **Token JWT** en el header Authorization: Bearer <token>.
