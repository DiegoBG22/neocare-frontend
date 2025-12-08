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

### 🔒 Flujo de Autenticación con JWT
La aplicación utiliza **JSON Web Tokens (JWT)** para gestionar la sesión del usuario. Este proceso asegura que, tras el inicio de sesión, el Frontend pueda realizar peticiones seguras al Backend.

**Pasos del Flujo de Autenticación**

1. **Inicio de Sesión (Login):**

   - El Frontend envía una petición POST al endpoint /api/auth/login con las credenciales (email y password).

2. **Generación del Token (Backend):**

   - El Backend valida las credenciales. Si son correctas, genera un **JWT** que contiene la información del usuario (payload) y lo firma con la SECRET_KEY.

   - El Backend devuelve este access_token en la respuesta al Frontend.

3. **Almacenamiento del Token (Frontend):**

   - El Frontend recibe el access_token y lo **almacena** localmente (típicamente en localStorage o sessionStorage).

4. **Peticiones Protegidas (Acceso a Recursos):**

   - Para acceder a cualquier endpoint protegido (como /api/boards/), el Frontend debe incluir el access_token en el header de la petición, con el formato:
     
     <img width="711" height="49" alt="image" src="https://github.com/user-attachments/assets/81695ab1-82a8-47d1-811e-676f8c16406f" />

5. **Validación del Token (Backend):**

   - El Backend intercepta la petición, **descodifica y valida** la firma del JWT usando la SECRET_KEY. Si el token es válido y no ha expirado, procesa la petición y devuelve la respuesta. Si es inválido, devuelve un error **401 Unauthorized**.

Este flujo garantiza que el estado de la sesión no se guarde en el servidor (Backend stateless), mejorando la escalabilidad de la API.

📍 Dónde Introducirlo
Debes colocar esta nueva sección (Flujo de Autenticación con JWT) justo después de la tabla de funcionalidades operativas del Backend, antes de la sección de Pasos para Ejecutar el Backend.

### ⚙️ Pasos para Ejecutar el Backend (Desarrollo Local)
El backend está configurado para ejecutarse localmente usando **Python** y **SQLite**.

**Requisitos**
Necesitas tener **Python 3.9+** y pip instalados.

**1. Clonar el Repositorio**
Clona el repositorio y accede a la rama de trabajo:

<img width="798" height="102" alt="image" src="https://github.com/user-attachments/assets/39b66027-430d-43a7-b1cc-d5ef7eb0dbcc" />

#### 2. Configurar el Entorno Virtual
Crea y activa el entorno virtual (.venv):

<img width="640" height="111" alt="image" src="https://github.com/user-attachments/assets/ea456fca-1e39-4f70-8ca7-3ca90624dabb" />

#### 3. Instalar Dependencias
Instala los requerimientos de Python:

<img width="787" height="51" alt="image" src="https://github.com/user-attachments/assets/f7d993f0-5711-4ffd-860d-0555e2891d63" />

#### 4. Crear Archivo .env
Crea el archivo .env en la carpeta backend/ con las siguientes variables de entorno:

<img width="777" height="72" alt="image" src="https://github.com/user-attachments/assets/3f833920-e708-46f4-928e-c1eb348dd247" />

#### 5. Levantar el Servidor
Accede a la carpeta backend/ y ejecuta el servidor con uvicorn:

<img width="770" height="63" alt="image" src="https://github.com/user-attachments/assets/5da60386-0468-49a4-a5a0-9768f3a6cece" />

El backend estará disponible en http://localhost:8000 (o http://127.0.0.1:8000).

### 🖥️ Frontend: Arquitectura y Ejecución
El frontend está desarrollado con **React + Vite + TypeScript** y utiliza **npm**.

#### 1. 🏗️ Arquitectura del Código
La estructura sigue un patrón modular:

<img width="771" height="333" alt="image" src="https://github.com/user-attachments/assets/9146aa5e-8268-4a71-84e5-278c9422b318" />

#### 2. 🚀 Pasos para la Instalación (Creación Inicial)
Estos pasos se realizaron para inicializar el proyecto:

  1. **Creación del proyecto Vite (React/TS):**
     
     <img width="731" height="47" alt="image" src="https://github.com/user-attachments/assets/80c953f8-8bdc-417c-8a96-dae686c5281b" />

  2. **Instalación de Librerías Clave:**
     
     <img width="734" height="44" alt="image" src="https://github.com/user-attachments/assets/c0b314bb-f04a-4ae9-be42-f758452f05cd" />

#### 3. ▶️ Pasos para Ejecutar el Proyecto
Para iniciar el servidor de desarrollo del Frontend:

  1. **Acceder a la Carpeta:**
     
     <img width="725" height="46" alt="image" src="https://github.com/user-attachments/assets/6c0ab494-ad8e-4417-a311-3bc2ca989db7" />

  2. **Instalar Dependencias:**

     <img width="737" height="46" alt="image" src="https://github.com/user-attachments/assets/aab11b59-c353-4268-a1a5-3a62fa106a3b" />

  3. **Ejecutar el Servidor:**

     <img width="733" height="41" alt="image" src="https://github.com/user-attachments/assets/0b10fda7-48c5-4460-b273-3ebb2acbfbc0" />

El Frontend estará disponible en http://localhost:5173.

     

     








