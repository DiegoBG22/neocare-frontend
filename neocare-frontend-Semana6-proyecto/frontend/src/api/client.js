const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Función base para peticiones
 */
async function request(path, { method = 'GET', token, body } = {}) {
  const headers = {
    'Content-Type': 'application/json', // Siempre JSON
  };
  
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
    console.log(`📡 Servidor responde a ${path}:`, data); 
  } catch { 
    data = null; 
  }

  if (!res.ok && res.status !== 304) {
    console.error("❌ Error detallado del servidor:", data);
    // Manejo global de sesión expirada o token inválido (excepto en login)
    if (res.status === 401 && !path.startsWith('/api/auth/login')) {
      try {
        localStorage.removeItem('authToken');
      } catch (e) {
        // Ignoramos errores de acceso a localStorage (modo privado, etc.)
      }
      // Forzamos recarga para volver a la pantalla de login limpia
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
    const error = { status: res.status, response: { data } };
    throw error;
  }
  return data;
}

// 🔐 LOGIN: JSON (igual que Swagger)
export function login(email, password) {
  return request('/api/auth/login', { 
    method: 'POST', 
    body: { 
      email: email,    // Campo "email" como en Swagger
      password: password 
    }
  });
}

// 📝 REGISTRO: JSON (ya estaba correcto)
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
export function getCardsByBoard(token, boardId, responsibleId) {
  const qs = responsibleId ? `?board_id=${boardId}&responsible_id=${responsibleId}` : `?board_id=${boardId}`;
  return request(`/api/cards/${qs}`, { token });
}
export function searchCards(token, boardId, queryText, responsibleId) {
  const qs = `?board_id=${boardId}&query=${encodeURIComponent(queryText)}${responsibleId ? `&responsible_id=${responsibleId}` : ''}`;
  return request(`/api/cards/search${qs}`, { token });
}
export function updateCard(token, cardId, updates) { return request(`/api/cards/${cardId}`, { method: 'PUT', token, body: updates }); }
export function deleteCard(token, cardId) { return request(`/api/cards/${cardId}`, { method: 'DELETE', token }); }
export function moveCard(token, cardId, listId, newOrder) {
  return request(`/api/cards/${cardId}/move`, {
    method: 'PATCH',
    token,
    body: { list_id: listId, new_order: newOrder },
  });
}

/* 📊 Reportes semanales (frontend) */
export function getReportSummary(token, boardId, week) {
  const qs = week ? `?week=${encodeURIComponent(week)}` : '';
  return request(`/report/${boardId}/summary${qs}`, { token });
}

export function getReportHoursByUser(token, boardId, week) {
  const qs = week ? `?week=${encodeURIComponent(week)}` : '';
  return request(`/report/${boardId}/hours-by-user${qs}`, { token });
}

export function getReportHoursByCard(token, boardId, week) {
  const qs = week ? `?week=${encodeURIComponent(week)}` : '';
  return request(`/report/${boardId}/hours-by-card${qs}`, { token });
}