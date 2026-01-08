### 🚀 Neocare Project Management System

### 📄 Resumen del Proyecto

Es una **aplicación web interna** para gestionar proyectos de innovación dentro de NeoCare Health. Su objetivo es centralizar la organización de tareas (mediante un tablero Kanban), registrar las horas trabajadas y generar informes semanales automáticos. La meta es mejorar la visibilidad y eficiencia del departamento, reduciendo la dependencia de herramientas dispersas como Excel o Trello.

### 📅 Cronograma General

<img width="790" height="345" alt="Captura de pantalla 2025-12-07 115725" src="https://github.com/user-attachments/assets/0703c834-feeb-4907-97ca-bafdf4338698" />

### 👥 Equipo y Roles (Semana 1)


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

### ✅ Funcionalidades ya Operativas (Diciembre 2024)

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
Inicia un terminal y escribe lo siguiente.

<img width="434" height="50" alt="image" src="https://github.com/user-attachments/assets/84d68eee-7a4f-4bf7-ab7a-acadcd395b31" />

Accede a la carpeta backend/ y ejecuta el servidor con uvicorn:

<img width="770" height="63" alt="image" src="https://github.com/user-attachments/assets/5da60386-0468-49a4-a5a0-9768f3a6cece" />

El backend estará disponible en http://localhost:8000 (o http://127.0.0.1:8000).

### 🖥️ Frontend: Arquitectura y Ejecución
El frontend está desarrollado con **React + Vite + TypeScript** y utiliza **npm**.

### 1. 🏗️ Arquitectura del Código
La estructura sigue un patrón modular:

<img width="771" height="333" alt="image" src="https://github.com/user-attachments/assets/9146aa5e-8268-4a71-84e5-278c9422b318" />

### 2. 🚀 Pasos para la Instalación (Creación Inicial)
Estos pasos se realizaron para inicializar el proyecto:

  1. **Creación del proyecto Vite (React/TS):**
     
     <img width="731" height="47" alt="image" src="https://github.com/user-attachments/assets/80c953f8-8bdc-417c-8a96-dae686c5281b" />

  2. **Instalación de Librerías Clave:**
     
     <img width="734" height="44" alt="image" src="https://github.com/user-attachments/assets/c0b314bb-f04a-4ae9-be42-f758452f05cd" />

### 3. ▶️ Pasos para Ejecutar el Proyecto
Para iniciar el servidor de desarrollo del Frontend:

  1. **Acceder a la Carpeta:**
     
     <img width="725" height="46" alt="image" src="https://github.com/user-attachments/assets/6c0ab494-ad8e-4417-a311-3bc2ca989db7" />

  2. **Instalar Dependencias:**

     <img width="737" height="46" alt="image" src="https://github.com/user-attachments/assets/aab11b59-c353-4268-a1a5-3a62fa106a3b" />

  3. **Ejecutar el Servidor:**

     <img width="733" height="41" alt="image" src="https://github.com/user-attachments/assets/0b10fda7-48c5-4460-b273-3ebb2acbfbc0" />

El Frontend estará disponible en http://localhost:5173.

---
---

### 👥 Roles y Organización (Semana 2)


<img width="358" height="282" alt="image" src="https://github.com/user-attachments/assets/f467a571-3181-4d41-9168-815026525124" />


### 📅 Detalle de la Semana 2: Gestión de Tarjetas y Listas (CRUD)

En esta fase, el equipo se centró en habilitar la estructura operativa del tablero Kanban, permitiendo la creación de las columnas (listas) y las tareas (tarjetas).

### 🔧 Backend: Expansión de la API REST
Se implementaron nuevos controladores en **FastAPI** para gestionar la jerarquía del tablero:

 - **Gestión de Listas:** Endpoints para crear y organizar las columnas de estado (ej: "Por hacer", "En curso", "Hecho").

**Endpoints Operativos:** A continuación se detallan las rutas implementadas para la gestión de tableros y tarjetas:

- **Modelado de Datos:** Creación de esquemas Pydantic y modelos SQLAlchemy para definir la estructura de las tarjetas (título, descripción, prioridad y estado).

- **Endpoints Operativos:**

<img width="989" height="874" alt="Captura de pantalla 2026-01-07 152536" src="https://github.com/user-attachments/assets/7102c2a5-7e5c-4b66-ba5b-0590bc2a84d3" />

- **POST /api/lists/**: Creación de nuevas columnas dentro de un tablero. **Las tarjetas se organizan en estas listas dinámicas que representan las columnas del Kanban.**

- **GET /api/lists/by-board/{board_id}**: Recuperación organizada de la estructura del tablero.

- **Seguridad**: Validación rigurosa mediante **JWT** para asegurar que cada usuario gestione exclusivamente sus propios tableros.

### 🖥️ Frontend: Interfaz de Usuario Interactiva

Se crearon componentes en **React + TypeScript** diseñados para ofrecer una experiencia fluida al gestionar el trabajo:

- **Modales de Gestión**: Implementación de formularios dinámicos que capturan la información de las tareas y la envían al servidor.


- **Gestión del Estado**: Uso de hooks para que la interfaz se actualice instantáneamente al crear o borrar una tarjeta, eliminando la necesidad de recargar la página.

**Esta estructura jerárquica (Tablero -> Listas -> Tarjetas) permite que NeoCare sea escalable para diferentes departamentos del hospital.**

**Ventana de Login y Registro de Usuario**

En la siguiente imagen vemos la pantalla donde nos logeamos y nos registramos.

<img width="1853" height="909" alt="image" src="https://github.com/user-attachments/assets/a5fd877d-5490-40f0-9df2-66ff15d2d0af" />

**Punto Clave 1:** Control de Acceso: La seguridad es lo primero. Implementamos un 
proceso de autenticación para asegurar que solo los usuarios registrados puedan 
acceder a las funcionalidades **CRUD**.

**Punto Clave 2:** Validación: Se valida el formato del correo electrónico y la 
contraseña se maneja con cifrado (hashing).

**Punto Clave 3:** Alternativa: Existe la opción de Registrarse para nuevos 
usuarios, lo que inicia un proceso de Creación (C) de un nuevo registro de 
usuario.

---

Una vez dentro del programa se nos abrira la siguiente ventana donde podemos crear un tablero en la parte izquierda.

<img width="1881" height="925" alt="Captura de pantalla 2026-01-07 162721" src="https://github.com/user-attachments/assets/5189c46c-be84-4c1b-a43d-632b03aec860" />

**Punto Clave 1:** **Lectura (R)** Inicial: La pantalla por defecto intenta realizar una 
operación de **Lectura (R)**. Actualmente, la base de datos no devuelve registros de 
tableros.

**Punto Clave 2:** Recurso a Gestionar: El recurso principal de la demo es el 
**"Tablero"**.

**Punto Clave 3:** Iniciar **Creación (C)**: El formulario de la izquierda nos 
permite comenzar con la operación **Crear (C)** un nuevo Tablero.

---

<img width="1329" height="719" alt="image" src="https://github.com/user-attachments/assets/96f21bd8-7ef4-46b0-aecc-9105f90976d7" />

**Punto Clave 1 (C Confirmada):** El Tablero llamado **“Médicos"** ahora es visible en el menú 
lateral, confirmando que la operación **INSERT** fue exitosa.

**Punto Clave 2 (R Detalle):** Al hacer clic en el Tablero, accedemos a la vista de detalle. Aquí 
se realiza una consulta **SELECT** para obtener todas las Listas asociadas a este Tablero 
(actualmente vacías).

**Punto Clave 3 (Anidamiento CRUD):** La demo ahora continúa con un CRUD anidado: 
Crear una Lista dentro del Tablero.

---

<img width="850" height="347" alt="image" src="https://github.com/user-attachments/assets/e56021d0-5452-4196-9997-e38428d7b56c" />

**Punto Clave 1 (R Detalle):** Accedimos al Tablero "Médicos" para leer su contenido, que son las 
Listas y las Tarjetas.

**Punto Clave 2 (Lista NOMBRES):** Hemos creado la lista NOMBRES.

**Punto Clave 3 (U/D del Tablero):** A la izquierda, vemos los iconos para Editar (azul) y Borrar 
(rojo) el Tablero completo.

**Punto Clave 4 (U/D de la Lista):** También hemos implementado la capacidad de Editar lista y 
Eliminar lista (CRUD anidado)

---

<img width="920" height="647" alt="image" src="https://github.com/user-attachments/assets/c926ba89-23d6-4a0a-95ac-ee0cb82933e9" />

**1. Lectura Detallada (R):** El sistema ha ejecutado una consulta para leer y mostrar los 
registros de los médicos (**"Lourdes García"** y **"Sergio Díaz"**) dentro de la Lista **"NOMBRES"**.

**2. Creación Anidada (C):** Se puede añadir un nuevo médico usando el formulario **"Título 
tarjeta"** y **"Descripción..."** para insertar un nuevo registro.

**3. Actualización Anidada (U):** Cada registro de médico tiene un botón 
**"Editar"** (azul) para modificar sus datos.

**4. Borrado Anidado (D):** Cada registro de médico tiene un botón **"Eliminar"** 
(rojo) que ejecuta el **DELETE** para ese registro específico.

**Conclusión:** Se demuestra el control total (**CRUD**) sobre los datos primarios (**Tableros**) y 
los datos anidados (**Médicos/Tarjetas**)

---

<img width="1012" height="686" alt="image" src="https://github.com/user-attachments/assets/b8ceadc4-8f06-4f2d-bc60-45d1aa0e5994" />

**1. Acción (U):** Se utilizó el botón "**Editar**" (✏️) del registro de **Lourdes García**.

**2. Ejecución:** El backend ejecutó la operación **UPDATE** en la base de datos, 
identificando el registro por su **ID** único.

**3. Resultado** (Cambio): El sistema muestra el cambio en tiempo real: la especialidad 
de Lourdes García ha pasado de "**Cardióloga**" a "**Laboratorio**".

**4. Confirmación:** Esto demuestra que los datos son modificables y la operación **U**
del **CRUD** anidado funciona correctamente.

---

<img width="916" height="476" alt="image" src="https://github.com/user-attachments/assets/6415bd12-91eb-4b9a-9926-7e08cc609445" />

**1. Acción (D):** Se hizo clic en el botón "**Eliminar**" (🗑️) del registro de **Sergio Díaz (el 
cirujano)**.

**2. Resultado:** El registro de **Sergio Díaz** ha desaparecido de la lista.

**3. Final del Ciclo:** Esto confirma que la operación **DELETE** fue ejecutada exitosamente, 
demostrando el control total sobre la eliminación de datos.

**4. Persistencia:** Solo el registro no eliminado (**Lourdes García**) permanece en la base de 
datos.

---
---

### 👥 Roles y Organización (Semana 3)

<img width="375" height="284" alt="Captura de pantalla 2026-01-07 185129" src="https://github.com/user-attachments/assets/f0e76df9-4cc8-4f65-b2a2-2cbe7a1978a1" />

### 📅 Detalle de la Semana 3: Interactividad y Drag & Drop
En esta fase, el proyecto da un salto cualitativo en **Experiencia de Usuario (UX).** Implementamos la capacidad de gestionar el flujo de trabajo mediante el arrastre de tarjetas, haciendo que la herramienta sea intuitiva y dinámica.

### 🎥 Demostración Funcional

![Grabación_readme_1](https://github.com/user-attachments/assets/8b9d53ff-08a1-4313-a774-754c4b544bf8)

**1. Acción:** El usuario selecciona una tarjeta (ej. un registro médico o tarea pendiente) y la arrastra físicamente hacia una columna diferente para cambiar su estado.

**2. Ejecución:** La librería **dnd-kit** gestiona los sensores de movimiento y las colisiones entre contenedores. Al "soltar" la tarjeta, el frontend detecta el cambio de lista y dispara automáticamente una petición PUT /api/cards/{id} al backend.

**3. Resultado:** El estado de la tarea se actualiza en la base de datos **SQLite** de forma permanente. Gracias a la reactividad de **React,** la interfaz se reordena suavemente sin parpadeos ni recargas.

**4. Confirmación:** Esta funcionalidad permite que la gestión hospitalaria sea ágil y visual, eliminando la necesidad de editar manualmente cada registro para cambiar su fase de trabajo.

---
---
### 👥 Roles y Organización (Semana 4)

<img width="285" height="214" alt="image" src="https://github.com/user-attachments/assets/df88207b-b3c2-4f2a-9273-5c8a6bb6bd75" />

### 📅 Detalle de la Semana 4: Gestión de Tiempos (Timesheets)
En esta fase, el tablero Kanban deja de ser solo visual para convertirse en una herramienta de métricas. Implementamos la funcionalidad de Timesheets para que el personal registre el tiempo invertido en cada tarea.

### ⏱️ Registro de Horas y Worklogs
El objetivo de esta fase fue permitir que el personal registre el tiempo invertido en cada tarea para un control de costes y eficiencia.

#### Funcionalidades Clave:

**- Añadir Horas:** Formulario para registrar descripción y número de horas por tarjeta.

**- Consulta Personal:** Vista dedicada para que cada usuario vea su resumen de horas.

**- Integración con Tarjetas:** Las horas se vinculan directamente al card_id para trazabilidad total.

### 🔧 Backend: Endpoints de Control
Se creó un nuevo router dedicado a los registros horarios:

- POST /api/timesheets/: Creación de registros.

- GET /api/timesheets/me: Listado de horas del usuario autenticado.

- DELETE /api/timesheets/{id}: Borrado de registros propios.

**1. Acción:** El usuario selecciona la tarjeta (ej: Lourdes García) y activa el botón **"Registrar tiempo"**.

**2. Ejecución:** Se abre un campo de entrada (señalado en verde) donde se introducen las horas. El backend valida la existencia de la tarjeta y guarda el registro asociado al user_id del token JWT.

**3. Resultado:** El sistema procesa la suma y refleja el total en la esquina superior derecha de la tarjeta (señalado en naranja).

**4. Confirmación:** Como se observa en la imagen, tras introducir "8", la tarjeta se actualiza automáticamente mostrando **8h**, permitiendo generar informes de productividad en fases posteriores.

<img width="1321" height="627" alt="Captura de pantalla 2026-01-08 170221" src="https://github.com/user-attachments/assets/f0c4a72c-e505-4b33-97cc-433c3007a81a" />











     

     








