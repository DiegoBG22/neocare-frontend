const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const error = {
      status: res.status,
      statusText: res.statusText,
      response: { data },
    };
    throw error;
  }

  return data;
}

/* 🔐 Autenticación */
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

/* 📋 Tableros */
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

export function updateBoard(token, boardId, updates) {
  return request(`/api/boards/${boardId}`, {
    method: 'PUT',
    token,
    body: updates,
  });
}

export function deleteBoard(token, boardId) {
  return request(`/api/boards/${boardId}`, {
    method: 'DELETE',
    token,
  });
}

/* 📑 Listas */
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

export function updateList(token, listId, updates) {
  return request(`/api/lists/${listId}`, {
    method: 'PUT',
    token,
    body: updates,
  });
}

export function deleteList(token, listId) {
  return request(`/api/lists/${listId}`, {
    method: 'DELETE',
    token,
  });
}

/* 🃏 Tarjetas */
export function createCard(token, listId, title, description) {
  return request('/api/cards/', {
    method: 'POST',
    token,
    body: { title, description, list_id: listId },
  });
}

export function getCardsByList(token, listId) {
  return request(`/api/cards/by-list/${listId}`, { token });
}

export function updateCard(token, cardId, updates) {
  return request(`/api/cards/${cardId}`, {
    method: 'PUT',
    token,
    body: updates,
  });
}

export function deleteCard(token, cardId) {
  return request(`/api/cards/${cardId}`, {
    method: 'DELETE',
    token,
  });
}
