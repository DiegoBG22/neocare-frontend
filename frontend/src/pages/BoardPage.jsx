import React, { useEffect, useState } from 'react';
import {
  getBoards,
  createBoard,
  getListsByBoard,
  createList,
  createCard,
  getCardsByList,
  deleteCard,
  updateCard,
  deleteList,
  updateList,
  deleteBoard,
  updateBoard,
} from '../api/client.js';

function BoardPage({ token, onLogout }) {
  const [boards, setBoards] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [lists, setLists] = useState([]);
  const [cardsByList, setCardsByList] = useState({});
  const [cardInputs, setCardInputs] = useState({});
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newListTitle, setNewListTitle] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados de edición
  const [editingCardId, setEditingCardId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [editingListId, setEditingListId] = useState(null);
  const [editListTitle, setEditListTitle] = useState('');

  const [editingBoardId, setEditingBoardId] = useState(null);
  const [editBoardTitle, setEditBoardTitle] = useState('');

  // Extractor seguro
  const extractErrorMessage = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d) => {
          const loc = Array.isArray(d.loc) ? d.loc.join('.') : '';
          const msg = d.msg || 'Error desconocido';
          if (loc.includes('title') && msg.includes('required')) return 'El título es obligatorio';
          if (loc.includes('list_id') && msg.includes('valid integer')) return 'El identificador de lista no es válido';
          return `${loc}: ${msg}`;
        })
        .join(', ');
    }
    if (typeof detail === 'string') return detail;
    if (err?.response?.data?.error) return err.response.data.error;
    if (typeof err === 'string') return err;
    if (err?.message) return err.message;
    return fallback;
  };

  // Cargar tableros
  useEffect(() => {
    const loadBoards = async () => {
      try {
        const data = await getBoards(token);
        setBoards(data);
        if (data.length > 0) setSelectedBoardId(data[0].id);
      } catch (err) {
        setError(extractErrorMessage(err, 'Error al cargar tableros'));
      }
    };
    loadBoards();
  }, [token]);

  // Cargar listas y tarjetas del tablero seleccionado
  useEffect(() => {
    const loadListsAndCards = async () => {
      if (!selectedBoardId) {
        setLists([]);
        setCardsByList({});
        return;
      }
      try {
        const data = await getListsByBoard(token, selectedBoardId);
        setLists(data);

        const cardsData = {};
        const inputsData = {};
        for (const list of data) {
          cardsData[list.id] = await getCardsByList(token, list.id);
          inputsData[list.id] = { title: '', description: '' };
        }
        setCardsByList(cardsData);
        setCardInputs(inputsData);
      } catch (err) {
        setError(extractErrorMessage(err, 'Error al cargar listas y tarjetas'));
      }
    };
    loadListsAndCards();
  }, [token, selectedBoardId]);

  // Crear tablero
  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;
    try {
      const board = await createBoard(token, newBoardTitle.trim());
      setBoards((prev) => [...prev, board]);
      setNewBoardTitle('');
      setSelectedBoardId(board.id);
      setSuccess(`✅ Tablero "${board.title}" creado correctamente`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Error al crear tablero'));
    }
  };

  // Eliminar tablero
  const handleDeleteBoard = async (boardId) => {
    try {
      await deleteBoard(token, boardId);
      setBoards((prev) => prev.filter((b) => b.id !== boardId));
      if (selectedBoardId === boardId) {
        setSelectedBoardId(null);
        setLists([]);
        setCardsByList({});
      }
      setSuccess('✅ Tablero eliminado correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Error al eliminar tablero'));
    }
  };

  // Actualizar tablero
  const handleUpdateBoard = async (e, boardId) => {
    e.preventDefault();
    if (!editBoardTitle.trim()) return;
    try {
      const updated = await updateBoard(token, boardId, { title: editBoardTitle.trim() });
      setBoards((prev) => prev.map((b) => (b.id === boardId ? updated : b)));
      setEditingBoardId(null);
      setSuccess('✅ Tablero actualizado correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Error al actualizar tablero'));
    }
  };

  // Crear lista
  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim() || !selectedBoardId) return;
    try {
      const list = await createList(token, selectedBoardId, newListTitle.trim());
      setLists((prev) => [...prev, list]);
      setCardInputs((prev) => ({
        ...prev,
        [list.id]: { title: '', description: '' },
      }));
      setNewListTitle('');
      setSuccess(`✅ Lista "${list.title}" creada correctamente`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Error al crear lista'));
    }
  };

  // Eliminar lista
  const handleDeleteList = async (listId) => {
    try {
      await deleteList(token, listId);
      setLists((prev) => prev.filter((l) => l.id !== listId));
      setCardsByList((prev) => {
        const copy = { ...prev };
        delete copy[listId];
        return copy;
      });
      setSuccess('✅ Lista eliminada correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Error al eliminar lista'));
    }
  };

  // Actualizar lista
  const handleUpdateList = async (e, listId) => {
    e.preventDefault();
    if (!editListTitle.trim()) return;
    try {
      const updated = await updateList(token, listId, { title: editListTitle.trim() });
      setLists((prev) => prev.map((l) => (l.id === listId ? updated : l)));
      setEditingListId(null);
      setSuccess('✅ Lista actualizada correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Error al actualizar lista'));
    }
  };

  // Crear tarjeta
  const handleCreateCard = async (e, listId) => {
    e.preventDefault();
    const title = cardInputs[listId]?.title?.trim();
    const description = cardInputs[listId]?.description?.trim();
    if (!title) return;

    try {
      const card = await createCard(token, listId, title, description);
      setCardsByList((prev) => ({
        ...prev,
        [listId]: [...(prev[listId] || []), card],
      }));
      setCardInputs((prev) => ({
        ...prev,
        [listId]: { title: '', description: '' },
      }));
      setSuccess(`✅ Tarjeta "${card.title}" creada correctamente`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Error al crear tarjeta'));
    }
  };

  // Eliminar tarjeta
  const handleDeleteCard = async (cardId, listId) => {
    try {
      await deleteCard(token, cardId);
      setCardsByList((prev) => ({
        ...prev,
        [listId]: (prev[listId] || []).filter((c) => c.id !== cardId),
      }));
      setSuccess('✅ Tarjeta eliminada correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Error al eliminar tarjeta'));
    }
  };

  // Actualizar tarjeta
  const handleUpdateCard = async (e, cardId, listId) => {
    e.preventDefault();
    const updates = {
      title: editTitle.trim(),
      description: editDesc.trim(),
    };
    if (!updates.title) return;
    try {
      const updated = await updateCard(token, cardId, updates);
      setCardsByList((prev) => ({
        ...prev,
        [listId]: (prev[listId] || []).map((c) => (c.id === cardId ? updated : c)),
      }));
      setEditingCardId(null);
      setSuccess('✅ Tarjeta actualizada correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Error al actualizar tarjeta'));
    }
  };

  const selectedBoard = boards.find((b) => b.id === selectedBoardId) || null;

  return (
    <div className="board-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Tableros</h2>
          <button type="button" onClick={onLogout}>Cerrar sesión</button>
        </div>

        <ul className="board-list">
          {boards.map((board) => (
            <li
              key={board.id}
              className={board.id === selectedBoardId ? 'active' : ''}
            >
              <span onClick={() => setSelectedBoardId(board.id)}>{board.title}</span>
              <div className="card-actions" style={{ marginTop: 6 }}>
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => handleDeleteBoard(board.id)}
                >
                  🗑️
                </button>
                <button
                  type="button"
                  className="edit-btn"
                  onClick={() => {
                    setEditingBoardId(board.id);
                    setEditBoardTitle(board.title || '');
                  }}
                >
                  ✏️
                </button>
              </div>

              {editingBoardId === board.id && (
                <form onSubmit={(e) => handleUpdateBoard(e, board.id)} style={{ marginTop: 8 }}>
                  <input
                    type="text"
                    value={editBoardTitle}
                    onChange={(e) => setEditBoardTitle(e.target.value)}
                    placeholder="Título del tablero"
                    style={{ marginRight: 8 }}
                  />
                  <button type="submit">Guardar</button>
                  <button type="button" onClick={() => setEditingBoardId(null)} style={{ marginLeft: 8 }}>
                    Cancelar
                  </button>
                </form>
              )}
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
                    <li key={list.id}>
                      <h4>{list.title}</h4>

                      <div className="card-actions" style={{ marginTop: 6 }}>
                        <button
                          type="button"
                          className="delete-btn"
                          onClick={() => handleDeleteList(list.id)}
                        >
                          🗑️ Eliminar lista
                        </button>
                        <button
                          type="button"
                          className="edit-btn"
                          onClick={() => {
                            setEditingListId(list.id);
                            setEditListTitle(list.title || '');
                          }}
                        >
                          ✏️ Editar lista
                        </button>
                      </div>

                      {editingListId === list.id && (
                        <form onSubmit={(e) => handleUpdateList(e, list.id)} style={{ marginTop: 8 }}>
                          <input
                            type="text"
                            value={editListTitle}
                            onChange={(e) => setEditListTitle(e.target.value)}
                            placeholder="Título de la lista"
                            style={{ marginRight: 8 }}
                          />
                          <button type="submit">Guardar</button>
                          <button type="button" onClick={() => setEditingListId(null)} style={{ marginLeft: 8 }}>
                            Cancelar
                          </button>
                        </form>
                      )}

                      <ul style={{ marginTop: 8 }}>
                        {(cardsByList[list.id] || []).map((card) => (
                          <li key={card.id}>
                            <strong>{card.title}</strong> - {card.description}
                            <div className="card-actions">
                              <button
                                type="button"
                                className="delete-btn"
                                onClick={() => handleDeleteCard(card.id, list.id)}
                              >
                                🗑️ Eliminar
                              </button>
                              <button
                                type="button"
                                className="edit-btn"
                                onClick={() => {
                                  setEditingCardId(card.id);
                                  setEditTitle(card.title || '');
                                  setEditDesc(card.description || '');
                                }}
                              >
                                ✏️ Editar
                              </button>
                            </div>

                            {editingCardId === card.id && (
                              <form onSubmit={(e) => handleUpdateCard(e, card.id, list.id)} style={{ marginTop: 8 }}>
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  placeholder="Título"
                                  style={{ marginRight: 8 }}
                                />
                                <input
                                  type="text"
                                  value={editDesc}
                                  onChange={(e) => setEditDesc(e.target.value)}
                                  placeholder="Descripción"
                                  style={{ marginRight: 8 }}
                                />
                                <button type="submit">Guardar</button>
                                <button type="button" onClick={() => setEditingCardId(null)} style={{ marginLeft: 8 }}>
                                  Cancelar
                                </button>
                              </form>
                            )}
                          </li>
                        ))}
                      </ul>

                      <form onSubmit={(e) => handleCreateCard(e, list.id)} style={{ marginTop: 8 }}>
                        <input
                          type="text"
                          placeholder="Título tarjeta..."
                          value={cardInputs[list.id]?.title || ''}
                          onChange={(e) =>
                            setCardInputs((prev) => ({
                              ...prev,
                              [list.id]: {
                                ...(prev[list.id] || { title: '', description: '' }),
                                title: e.target.value,
                              },
                            }))
                          }
                          style={{ marginRight: 8 }}
                        />
                        <input
                          type="text"
                          placeholder="Descripción..."
                          value={cardInputs[list.id]?.description || ''}
                          onChange={(e) =>
                            setCardInputs((prev) => ({
                              ...prev,
                              [list.id]: {
                                ...(prev[list.id] || { title: '', description: '' }),
                                description: e.target.value,
                              },
                            }))
                          }
                          style={{ marginRight: 8 }}
                        />
                        <button type="submit">Crear tarjeta</button>
                      </form>
                    </li>
                  ))}
                </ul>

                <form onSubmit={handleCreateList} className="list-form" style={{ marginTop: 16 }}>
                  <input
                    type="text"
                    placeholder="Nueva lista..."
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    style={{ marginRight: 8 }}
                  />
                  <button type="submit">Crear lista</button>
                </form>
              </div>
            </section>
          </>
        ) : (
          <p>No hay tableros todavía. Crea uno usando el formulario de la izquierda.</p>
        )}

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </main>
    </div>
  );
}

export default BoardPage;
