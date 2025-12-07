
### 📄 Resumen del Proyecto

Es una **aplicación web interna** para gestionar proyectos de innovación dentro de NeoCare Health. Su objetivo es centralizar la organización de tareas (mediante un tablero Kanban), registrar las horas trabajadas y generar informes semanales automáticos. La meta es mejorar la visibilidad y eficiencia del departamento, reduciendo la dependencia de herramientas dispersas como Excel o Trello


### 📅 Cronograma General (7 semanas) 

<img width="790" height="345" alt="image" src="https://github.com/user-attachments/assets/58d5322b-8189-44ea-83ad-fb02b96c815e" />


### 👥 Equipo y Roles (PRIMERA SEMANA)

<img width="838" height="279" alt="image" src="https://github.com/user-attachments/assets/afb61ff9-c9ae-4071-b006-02806166605b" />

### 🛠️ Stack Tecnológico

 Estas son las tecnologías utilizadas en el proyecto:
- **Frontend:** React + Vite + TypeScript 
- **Backend:** Python + FastAPI 
- **Base de Datos:** PostgreSQL (producción) / SQLite (desarrollo) 
- **Alojamiento (Frontend):** Vercel 
- **Alojamiento (Backend):** Render 
- **Autenticación:** JWT (JSON Web Tokens) 
- **Funcionalidad Drag & Drop:** dnd-kit

### 💻 Pasos para Ejecutar el Backend
El backend está configurado para ejecutarse localmente usando **Python y SQLite**.

1. #### Clonar y Acceder:

- Clona el repositorio git clone [url-del-repositorio].

- Accede a la carpeta del proyecto y luego a la del backend: cd neocare-project y luego cd backend.

2. #### Configurar Entorno Virtual:

- Crea un entorno virtual: python -m venv venv.

- Actívalo (Linux/Mac): source venv/bin/activate.

- Actívalo (Windows): venv\Scripts\activate.

3. #### Instalar Dependencias:

- Instala los requerimientos: pip install -r requirements.txt.

4. #### Crear Archivo .env:

- Crea el archivo .env en la carpeta backend/ con las siguientes variables:

   DATABASE_URL=sqlite:///./neocare.db
  
   SECRET_KEY=tu_clave_secreta_jwt_aqui

 5. #### Levantar el Servidor:

- Ejecuta el servidor con uvicorn main:app --reload --host 0.0.0.0 --port 8000.

Una vez levantado, el backend estará accesible en http://127.0.0.1:8000.

### 🖥️ Pasos para Ejecutar el Frontend
El frontend está desarrollado con **React + Vite + TypeScript** y utiliza **npm**.


1. #### Acceder a la Carpeta:

- Asegúrate de estar en el directorio principal del proyecto y luego accede a la carpeta del frontend: cd frontend.

2. #### Instalar Dependencias:

- Instala las dependencias de Node.js: npm install.

3. #### Ejecutar el Proyecto:

- Inicia el servidor de desarrollo: npm run dev.

El frontend estará disponible en http://localhost:5173.

### ✅ Funcionalidades ya Operativas
El estado actual del proyecto (actualizado a Diciembre 2024) indica que el **Backend está completado (Auth + CRUD)** y listo para la integración con el frontend.

Las funcionalidades del backend que ya están disponibles a través de sus endpoints son:

- **Autenticación** (/api/auth/*):


   - **Registro** de usuario (POST /api/auth/register).


   - **Login** (iniciar sesión) que devuelve el **JWT** (POST /api/auth/login).

- **Gestión de Tableros** (/api/boards/*):

   - Operaciones **CRUD** completas: Listar, Crear, Obtener por ID, Actualizar y Eliminar un tablero.

- **Gestión de Listas** (/api/lists/*):

Endpoints similares para la gestión de listas (implica funcionalidad CRUD).

- **Health Check** (GET /health).

Todos los endpoints (excepto el login y registro) están protegidos y **requieren el token JWT** para su acceso.
  
  
