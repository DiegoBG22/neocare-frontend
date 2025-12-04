# NeoCare Health - Gestión Interna de Innovación Digital

## Descripción del Proyecto

Este proyecto consiste en el desarrollo de una aplicación web interna para la gestión de proyectos de innovación en NeoCare Health, una empresa líder en soluciones de tecnología sanitaria. La plataforma permitirá organizar tareas mediante un tablero Kanban, registrar horas trabajadas y generar informes semanales, todo con el objetivo de mejorar la visibilidad y eficiencia del departamento de Innovación.

## Objetivos del Proyecto

- Crear un sistema único y unificado para la gestión de proyectos.
- Facilitar el seguimiento del progreso de cada iniciativa.
- Implementar un registro de horas (timesheets) integrado.
- Generar informes semanales automáticos.
- Reducir la dependencia de herramientas dispersas (Excel, Trello, emails).

## Stack Tecnológico

El proyecto está construido con un stack moderno y eficiente:

- **Frontend:** React + Vite + TypeScript
- **Backend:** Python + FastAPI
- **Base de datos:** PostgreSQL
- **Hosting Frontend:** Vercel
- **Hosting Backend:** Render
- **Autenticación:** JWT
- **Drag & Drop:** dnd-kit

## Requerimientos Funcionales Clave

La plataforma debe implementar las siguientes funcionalidades:

1. **Tablero Kanban:** Con columnas "Por hacer" → "En curso" → "Hecho".
2. **Gestión de Tareas:** Creación, edición y movimiento (drag & drop) de tarjetas con título, descripción, fecha límite y responsable.
3. **Registro de Horas (Timesheets):** Introducir fecha, horas y notas trabajadas por tarjeta.
4. **Informe Semanal:** Generación de métricas (tareas completadas/vencidas, horas totales por personal/tarjeta) y exportación a CSV.
5. **Seguridad:** Acceso mediante login interno y API backend segura.

---

## Equipo y Roles (Semana 1)

| Rol            | Miembro                    | Email                       |
|----------------|----------------------------|-----------------------------|
| Coordinación   | Diego Benitez              | diegobenitezg@gmail.com     |
| Backend        | Rubén                      | rubenwork1009@gmail.com     |
| Frontend       | Arianna                    | aridigeorg@libero.it        |
| Testing        | Esthíbaliz                 | gaciaesthibaliz@gmail.com   |
| Documentación  | José Luis                  | jlmarquez1986@gmail.com     |

## Cronograma General (7 semanas)

1. Semana 1: Setup general y estructura base
2. Semana 2: Gestión de tarjetas (CRUD)
3. Semana 3: Drag & drop entre columnas
4. Semana 4: Sistema de registro de horas (Timesheets)
5. Semana 5: Generación de informe semanal
6. Semana 6: Funcionalidades avanzadas y extras
7. Semana 7: Pulido final y demo para dirección

---

## Primer Día – Setup General (Día 1)

### Coordinador (Diego)
- Crear tablero de gestión de tareas (Kanban en GitHub Projects o similar)
- Definir horarios de reunión y canal de comunicación (Slack/Teams)
- Supervisar configuración de entornos locales
- Documentar bloqueos y avances
- Mantener comunicación activa entre todos los roles

### Frontend (Arianna)
- Crear proyecto React + Vite + TypeScript
- Configurar estructura inicial (pages/, components/, lib/)
- Verificar que la aplicación arranca localmente

### Backend (Rubén)
- Crear proyecto FastAPI
- Configurar entorno virtual e instalar dependencias (requirements.txt)
- Implementar endpoint básico `/health` (GET)
- Configurar conexión inicial a PostgreSQL

### Base de Datos
- Crear instancia de PostgreSQL (local o en la nube)
- Proveer datos de conexión (host, puerto, usuario, contraseña, nombre BD) al backend
- Revisar acceso y permisos

### Testing (Esthíbaliz)
- Instalar Postman o Thunder Client
- Probar endpoint `/health` desde el backend
- Reportar incidencias o errores encontrados

### Documentación (José Luis)
- Crear README inicial (este documento)
- Empezar acta semanal con roles y objetivos
- Mantener registro de decisiones y avances del equipo

---

## Día 2 - Desarrollo de Autenticación

### Backend (Rubén)

**Tareas Completadas Día 1**
- Crear proyecto FastAPI
- Configurar entorno virtual e instalar dependencias (requirements.txt)
- Implementar endpoint básico `/health` (GET)
- Configurar conexión inicial a PostgreSQL

**Tareas Día 2**
- Integrar el archivo **.env** con la cadena de conexión real de PostgreSQL
- Probar persistencia de usuarios en BD (crear y leer registros)
- Implementar autenticación básica:
  - Endpoint `/register` → registro de usuarios con validación
  - Endpoint `/login` → autenticación con verificación de credenciales
  - Añadir hash de contraseñas (bcrypt)
- Subir cambios a la rama `feature/backend-auth`

### Frontend (Arianna)

✅ **Tareas Completadas Día 1**
- Crear proyecto React + Vite + TypeScript
- Configurar estructura inicial
- Verificar que arranca localmente

✅ **Tareas Día 2**
- Cambiar de PyCharm a Visual Studio Code (más adecuado para React/Node)
- Verificar/Instalar Node.js si no está disponible
- Crear pantallas de login y registro con formularios
- Preparar conexión al backend (fetch o axios)
- Validar inputs en frontend (email válido, contraseña mínima)

### Testing (Estíbaliz)

✅ **Tareas Completadas Día 1**
- Instalar Postman o Thunder Client
- Probar endpoint `/health`
- Reportar incidencias

✅ **Tareas Día 2**
- Revisar que puede clonar el repositorio y ejecutar el backend localmente
- Diseñar casos de prueba para autenticación:
  - Registro con datos válidos
  - Registro con email duplicado
  - Login correcto vs incorrecto
- Probar endpoint `/health` y documentar resultados
- Reportar errores en GitHub Issues

### Documentación (JL)

✅ **Tareas Completadas Día 1**
- Crear README inicial
- Empezar acta semanal con roles y objetivos

✅ **Tareas Día 2**
- Revisar y actualizar el README
- Añadir sección de configuración del backend
- Documentar endpoints disponibles
- Incluir ejemplos de requests/responses
- Documentar dependencias resueltas

---

## Configuración del Proyecto (Local Setup)

### 1. Preparación General
- Clonar repositorio: `git clone [url-del-repositorio]`
- Acceder al directorio: `cd neocare-project`
- Coordinación: Verificar que el tablero Kanban esté actualizado

### 2. Configuración del Backend

```bash
# 1. Crear y activar entorno virtual
python -m venv venv
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# 2. Instalar dependencias
pip install -r backend/requirements.txt

# 3. Configurar variables de entorno
# Crear archivo .env en backend/ con:
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/neocare_db
SECRET_KEY=trueclave_secreta_aqui

# 4. Arrancar servidor
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
