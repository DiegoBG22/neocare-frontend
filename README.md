# Neocare – Guía de integración (Backend + Frontend para Arianna)

> Nota: Este README está pensado para la **rama `Union/backend/frontend`** del repo `neocare-frontend`. Aquí tienes:
> - Resumen rápido de cómo levantar backend y frontend.
> - Estructura recomendada del frontend.
> - TODO el código base del frontend, ordenado por archivos, listo para copiar/pegar.
> Después puedes borrar o simplificar estas notas cuando el proyecto esté más avanzado.

---

## 1. Cómo levantar el backend

### 1.1. Requisitos

- Python 3.10+ (recomendado)
- `pip` para instalar dependencias

### 1.2. Instalar dependencias del backend

Desde la carpeta `backend/`:

```bash
cd backend
pip install -r requirements.txt
```

### 1.3. Arrancar el backend

```bash
uvicorn main:app --reload --port 8000
```

Comprobar que responde:

- Abre en el navegador: `http://localhost:8000/api/health`
- Deberías ver algo como:

> Nota (cambios recientes): Se han añadido dos nuevos campos booleanos a la entidad `Card`: `completed` y `overdue`.
> - Desarrollo local rápido: si quieres aplicar los cambios al esquema de la base de datos recrea `backend/neocare.db` y ejecuta `python backend/create_db.py`.
> - Producción / preservando datos: crea una migración con Alembic (`alembic revision --autogenerate -m "add card status"` y `alembic upgrade head`).

```json
{
  "status": "OK",
  "service": "FastAPI Backend",
  "version": "1.0.0"
}
```

**Base URL del backend en local:** `http://localhost:8000`

---

## 2. Resumen de endpoints disponibles

### 2.1. Autenticación

- `POST /api/auth/register`
  - Body:
    ```json
    {
      "email": "string",
      "password": "string"
    }
    ```

- `POST /api/auth/login`
  - Body:
    ```json
    {
      "email": "string",
      "password": "string"
    }
    ```
  - Respuesta:
    ```json
    {
      "access_token": "<JWT>"
    }
    ```

> El `access_token` se usará en el frontend como:
> `Authorization: Bearer <access_token>`

### 2.2. Tableros (Boards)

Todas estas rutas requieren header `Authorization: Bearer <token>`:

- `GET /api/boards/` – Listar tableros del usuario autenticado.
- `POST /api/boards/` – Crear tablero.
  - Body ejemplo:
    ```json
    {
      "title": "Mi primer tablero"
    }
    ```
- `DELETE /api/boards/{board_id}` – Eliminar tablero.

### 2.3. Listas (Lists)

También requieren header `Authorization: Bearer <token>`:

- `GET /api/lists/by-board/{board_id}` – Listar listas de un tablero.
- `POST /api/lists/` – Crear lista en un tablero.
  - Body ejemplo:
    ```json
    {
      "title": "To Do",
      "board_id": 1
    }
    ```
- `DELETE /api/lists/{list_id}` – Eliminar lista.

### 2.4. Labels y Subtasks (Checklist)

- `GET /api/cards/{card_id}/labels` – Obtener etiquetas de una tarjeta.
- `POST /api/cards/{card_id}/labels` – Crear etiqueta en una tarjeta.
  - Body ejemplo:
    ```json
    {
      "name": "Urgente",
      "color": "#ff0000"
    }
    ```
- `DELETE /api/cards/labels/{label_id}` – Eliminar etiqueta.

- `GET /api/cards/{card_id}/subtasks` – Obtener checklist (subtareas) de una tarjeta.
- `POST /api/cards/{card_id}/subtasks` – Crear subtarea.
  - Body ejemplo:
    ```json
    {
      "title": "Revisar PR"
    }
    ```
- `PATCH /api/cards/subtasks/{subtask_id}` – Actualizar subtarea (title o completed).
- `DELETE /api/cards/subtasks/{subtask_id}` – Eliminar subtarea.

---

## 3. Estructura propuesta del frontend (React + Vite)

> Esta es la estructura que se recomienda dentro del proyecto Vite.
> Si creas el proyecto con `npm create vite@latest`, colocar estos archivos así:

```text
src/
  api/
    client.js
  pages/
    LoginPage.jsx
    BoardPage.jsx
  App.jsx
  main.jsx
  index.css
```

---

## 4. Código del frontend (listo para copiar y pegar)

A continuación está TODO el código base del frontend, organizado por archivo.

> Puedes copiar cada bloque en el archivo correspondiente.
> Más adelante puedes refactorizar nombres, estilos, etc.

---

## ===== ARCHIVO: `src/main.jsx` =====
> NOTA: Punto de entrada de React (normalmente ya existe en Vite). Sustituir su contenido por este.

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

---

## ===== ARCHIVO: `src/App.jsx` =====
> NOTA: Componente raíz.
> - Si NO hay token → muestra `LoginPage`.
> - Si HAY token → muestra `BoardPage` y permite cerrar sesión.

```jsx
import React, { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import BoardPage from './pages/BoardPage.jsx';

function App() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('authToken');
    if (saved) setToken(saved);
  }, []);

  const handleLogin = (newToken) => {
    setToken(newToken);
    localStorage.setItem('authToken', newToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('authToken');
  };

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <BoardPage token={token} onLogout={handleLogout} />;
}

export default App;
```

---

## ===== ARCHIVO: `src/api/client.js` =====
> NOTA: Cliente de API centralizado.
> - Configura la URL del backend (`VITE_API_BASE_URL` o `http://localhost:8000`).
> - Expone funciones: `login`, `register`, `getBoards`, `createBoard`, `getListsByBoard`, `createList`, `deleteBoard`, `deleteList`.

```js
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = data?.detail || res.statusText || 'Request failed';
    throw new Error(message);
  }

  return data;
}

export function login(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function register(email, password) {
  return request('/api/auth/register', {
    method: 'POST',
    body: { email, password },
  });
}

export function getBoards(token) {
  return request('/api/boards/', { token });
}

export function createBoard(token, title) {
  return request('/api/boards/', {
    method: 'POST',
    token,
    body: { title },
  });
}

export function getListsByBoard(token, boardId) {
  return request(`/api/lists/by-board/${boardId}`, { token });
}

export function createList(token, boardId, title) {
  return request('/api/lists/', {
    method: 'POST',
    token,
    body: { title, board_id: boardId },
  });
}

export function deleteBoard(token, boardId) {
  return request(`/api/boards/${boardId}`, {
    method: 'DELETE',
    token,
  });
}

export function deleteList(token, listId) {
  return request(`/api/lists/${listId}`, {
    method: 'DELETE',
    token,
  });
}
```

---

## ===== ARCHIVO: `src/pages/LoginPage.jsx` =====
> NOTA: Pantalla de autenticación.
> - Tiene modo login y modo registro.
> - Usa las funciones `login` y `register` del cliente API.
> - Cuando el login tiene éxito, llama a `onLogin(access_token)`.

```jsx
import React, { useState } from 'react';
import { login, register } from '../api/client.js';

function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(email, password);
      }
      const data = await login(email, password);
      onLogin(data.access_token);
    } catch (err) {
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1>Neocare</h1>
      <h2>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>

      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading
            ? 'Cargando...'
            : mode === 'login'
            ? 'Entrar'
            : 'Registrarme y entrar'}
        </button>
      </form>

      <button
        type="button"
        className="link-button"
        onClick={() =>
          setMode(mode === 'login' ? 'register' : 'login')
        }
      >
        {mode === 'login'
          ? '¿No tienes cuenta? Regístrate'
          : '¿Ya tienes cuenta? Inicia sesión'}
      </button>
    </div>
  );
}

export default LoginPage;
```

---

## ===== ARCHIVO: `src/pages/BoardPage.jsx` =====
> NOTA: Pantalla principal del tablero.
> - Muestra lista de tableros en la barra lateral.
> - Permite crear tableros y seleccionar uno.
> - Para el tablero seleccionado, muestra sus listas y permite crear nuevas listas.

```jsx
import React, { useEffect, useState } from 'react';
import {
  getBoards,
  createBoard,
  getListsByBoard,
  createList,
} from '../api/client.js';

function BoardPage({ token, onLogout }) {
  const [boards, setBoards] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [lists, setLists] = useState([]);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newListTitle, setNewListTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadBoards = async () => {
      try {
        const data = await getBoards(token);
        setBoards(data);
        if (data.length > 0) setSelectedBoardId(data[0].id);
      } catch (err) {
        setError(err.message);
      }
    };
    loadBoards();
  }, [token]);

  useEffect(() => {
    const loadLists = async () => {
      if (!selectedBoardId) {
        setLists([]);
        return;
      }
      try {
        const data = await getListsByBoard(token, selectedBoardId);
        setLists(data);
      } catch (err) {
        setError(err.message);
      }
    };
    loadLists();
  }, [token, selectedBoardId]);

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;
    try {
      const board = await createBoard(token, newBoardTitle.trim());
      setBoards((prev) => [...prev, board]);
      setNewBoardTitle('');
      setSelectedBoardId(board.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim() || !selectedBoardId) return;
    try {
      const list = await createList(
        token,
        selectedBoardId,
        newListTitle.trim(),
      );
      setLists((prev) => [...prev, list]);
      setNewListTitle('');
    } catch (err) {
      setError(err.message);
    }
  };

  const selectedBoard =
    boards.find((b) => b.id === selectedBoardId) || null;

  return (
    <div className="board-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Tableros</h2>
          <button onClick={onLogout}>Cerrar sesión</button>
        </div>

        <ul className="board-list">
          {boards.map((board) => (
            <li
              key={board.id}
              className={
                board.id === selectedBoardId ? 'active' : ''
              }
              onClick={() => setSelectedBoardId(board.id)}
            >
              {board.title}
            </li>
          ))}
        </ul>

        <form onSubmit={handleCreateBoard} className="sidebar-form">
          <input
            type="text"
            placeholder="Nuevo tablero..."
            value={newBoardTitle}
            onChange={(e) => setNewBoardTitle(e.target.value)}
          />
          <button type="submit">Crear tablero</button>
        </form>
      </aside>

      <main className="board-main">
        {selectedBoard ? (
          <>
            <h1>{selectedBoard.title}</h1>
            <section className="lists-section">
              <div className="list-column">
                <h3>Listas</h3>
                <ul>
                  {lists.map((list) => (
                    <li key={list.id}>{list.title}</li>
                  ))}
                </ul>
                <form
                  onSubmit={handleCreateList}
                  className="list-form"
                >
                  <input
                    type="text"
                    placeholder="Nueva lista..."
                    value={newListTitle}
                    onChange={(e) =>
                      setNewListTitle(e.target.value)
                    }
                  />
                  <button type="submit">Crear lista</button>
                </form>
              </div>
            </section>
          </>
        ) : (
          <p>
            No hay tableros todavía. Crea uno usando el formulario de la
            izquierda.
          </p>
        )}

        {error && <p className="error">{error}</p>}
      </main>
    </div>
  );
}

export default BoardPage;
```

---

## ===== ARCHIVO: `src/index.css` =====
> NOTA: Estilos globales.
> - Modo oscuro sencillo.
> - Estilos para login y tablero (sidebar + contenido central).
> - Se puede refactorizar o reemplazar cuando el diseño esté definido.

```css
:root {
  color-scheme: dark;
  --bg: #020617;
  --bg-card: #0f172a;
  --accent: #38bdf8;
  --text: #e5e7eb;
  --muted: #64748b;
  --danger: #f97373;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
    sans-serif;
  background: radial-gradient(circle at top left, #0f172a, #020617);
  color: var(--text);
}

/* Login */

.auth-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
}

.auth-container h1 {
  font-size: 2rem;
  letter-spacing: 0.1em;
}

.auth-form {
  background: rgba(15, 23, 42, 0.9);
  padding: 1.5rem 2rem;
  border-radius: 0.75rem;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.8);
  width: min(360px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth-form label {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  color: var(--muted);
}

.auth-form input {
  margin-top: 0.25rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #1f2937;
  background: #020617;
  color: var(--text);
}

.auth-form button {
  margin-top: 0.5rem;
  padding: 0.6rem 0.75rem;
  border-radius: 0.5rem;
  border: none;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  cursor: pointer;
  font-weight: 600;
}

.auth-form button:disabled {
  opacity: 0.7;
  cursor: default;
}

.link-button {
  border: none;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 0.9rem;
}

/* Board layout */

.board-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 260px;
  background: rgba(15, 23, 42, 0.95);
  border-right: 1px solid #1e293b;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header button {
  border: none;
  background: #ef4444;
  color: white;
  border-radius: 0.5rem;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
}

.board-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.board-list li {
  padding: 0.4rem 0.6rem;
  border-radius: 0.4rem;
  cursor: pointer;
  color: var(--muted);
}

.board-list li.active,
.board-list li:hover {
  background: #0f172a;
  color: var(--text);
}

.sidebar-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar-form input {
  padding: 0.4rem 0.6rem;
  border-radius: 0.4rem;
  border: 1px solid #1f2937;
  background: #020617;
  color: var(--text);
}

.sidebar-form button {
  border: none;
  padding: 0.4rem 0.6rem;
  border-radius: 0.4rem;
  background: var(--accent);
  color: #020617;
  font-weight: 600;
  cursor: pointer;
}

/* Main board */

.board-main {
  flex: 1;
  padding: 1.5rem 2rem;
}

.board-main h1 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.lists-section {
  display: flex;
  gap: 1.5rem;
}

.list-column {
  background: rgba(15, 23, 42, 0.9);
  border-radius: 0.75rem;
  padding: 1rem;
  min-width: 260px;
}

.list-column ul {
  list-style: none;
  padding: 0;
  margin: 0 0 0.75rem 0;
}

.list-column li {
  padding: 0.35rem 0.5rem;
  border-radius: 0.4rem;
  background: #020617;
  margin-bottom: 0.3rem;
}

.list-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.list-form input {
  padding: 0.4rem 0.6rem;
  border-radius: 0.4rem;
  border: 1px solid #1f2937;
  background: #020617;
  color: var(--text);
}

.list-form button {
  border: none;
  padding: 0.4rem 0.6rem;
  border-radius: 0.4rem;
  background: var(--accent);
  color: #020617;
  font-weight: 600;
  cursor: pointer;
}

/* Errores */

.error {
  color: var(--danger);
  font-size: 0.9rem;
}
```
