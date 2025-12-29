const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Función base para peticiones
 * @param {boolean} isFormData - Indica si enviamos un formulario (necesario para el login nuevo)
 */
async function request(path, { method = 'GET', token, body, isFormData = false } = {}) {
  const headers = {};
  
  // Si NO es formulario, enviamos JSON (para registro y el resto de la app)
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    // Si es formulario enviamos el objeto URLSearchParams directamente
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    credentials: 'include',
  });

  let data = null;
  try { 
    data = await res.json(); 
    console.log(`📡 Servidor responde a ${path}:`, data); 
  } catch { 
    data = null; 
  }

  if (!res.ok) {
    console.error("❌ Error detallado del servidor:", data);
    const error = { status: res.status, response: { data } };
    throw error;
  }
  return data;
}

// 🔐 LOGIN: Corregido para usar Form Data (Elimina el error 422)
export function login(email, password) {
  const formData = new URLSearchParams();
  // Usamos 'username' porque es el estándar que pide OAuth2PasswordRequestForm
  formData.append('username', email); 
  formData.append('password', password);

  return request('/api/auth/login', { 
    method: 'POST', 
    body: formData,
    isFormData: true 
  });
}

// 📝 REGISTRO: JSON con el campo 'email'
export function register(email, password) { 
  return request('/api/auth/register', { 
    method: 'POST', 
    body: { email, password } 
  }); 
}

/* 📋 Tableros */
export function getBoards(token) { return request('/api/boards/', { token }); }
export function createBoard(token, title) { return request('/api/boards/', { method: 'POST', token, body: { title } }); }
export function updateBoard(token, boardId, updates) { return request(`/api/boards/${boardId}`, { method: 'PUT', token, body: updates }); }
export function deleteBoard(token, boardId) { return request(`/api/boards/${boardId}`, { method: 'DELETE', token }); }

/* 📂 Listas */
export function getListsByBoard(token, boardId) { return request(`/api/lists/by-board/${boardId}`, { token }); }
export function createList(token, boardId, title) { return request('/api/lists/', { method: 'POST', token, body: { title, board_id: boardId } }); }
export function updateList(token, listId, updates) { return request(`/api/lists/${listId}`, { method: 'PUT', token, body: updates }); }
export function deleteList(token, listId) { return request(`/api/lists/${listId}`, { method: 'DELETE', token }); }

/* 🃏 Tarjetas */
export function createCard(token, listId, title, description, userId) {
  return request('/api/cards/', {
    method: 'POST',
    token,
    body: { 
      title, 
      description, 
      list_id: listId,
      user_id: userId 
    },
  });
}

export function getCardsByList(token, listId) { return request(`/api/cards/by-list/${listId}`, { token }); }
export function updateCard(token, cardId, updates) { return request(`/api/cards/${cardId}`, { method: 'PUT', token, body: updates }); }
export function deleteCard(token, cardId) { return request(`/api/cards/${cardId}`, { method: 'DELETE', token }); }
export function moveCard(token, cardId, listId, newOrder) {
  return request(`/api/cards/${cardId}/move`, {
    method: 'PATCH',
    token,
    body: { list_id: listId, new_order: newOrder },
  });
}