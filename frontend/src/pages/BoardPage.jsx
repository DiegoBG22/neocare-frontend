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
  moveCard,
} from '../api/client.js';

// Imports para Drag & Drop (RESPETADOS)
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { SortableCard } from '../components/SortableCard';

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

  // --- NUEVOS ESTADOS PARA TIEMPO ---
  const [timingCardId, setTimingCardId] = useState(null);
  const [hoursInput, setHoursInput] = useState("");

  // Estados de edición (RESPETADOS)
  const [editingCardId, setEditingCardId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editingListId, setEditingListId] = useState(null);
  const [editListTitle, setEditListTitle] = useState('');
  const [editingBoardId, setEditingBoardId] = useState(null);
  const [editBoardTitle, setEditBoardTitle] = useState('');

  // Estado para el Modal (RESPETADO)
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    message: '',
    onConfirm: null
  });

  // CONFIGURACIÓN DE SENSORES (RESPETADA)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      onActivation: (event) => {
        const { activeElement } = document;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)) {
          return false; 
        }
      },
    })
  );

  const handleInputKeyDown = (e) => {
    if (e.key === ' ') {
      e.stopPropagation();
    }
  };

  const askConfirmation = (message, action) => {
    setModalConfig({
      isOpen: true,
      message,
      onConfirm: async () => {
        await action();
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const getUserIdFromToken = (t) => {
    try {
      const base64Url = t.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      return payload.sub || payload.id || payload.user_id;
    } catch (e) { return null; }
  };

  const extractErrorMessage = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => {
        const loc = Array.isArray(d.loc) ? d.loc.join('.') : '';
        const msg = d.msg || 'Error';
        return `${loc}: ${msg}`;
      }).join(', ');
    }
    return detail || fallback;
  };

  // Función auxiliar para recargar listas y tarjetas (CORREGIDA PARA EVITAR ERROR DEL 0)
  const refreshBoardData = async () => {
    if (!selectedBoardId) return;
    try {
      const listsData = await getListsByBoard(token, selectedBoardId);
      
      const timeRes = await fetch('http://localhost:8000/api/timesheets/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const allTimes = await timeRes.json();

      const cardsData = {};
      const inputsData = {};

      for (const list of listsData) {
        const cards = await getCardsByList(token, list.id);
        const safeCards = Array.isArray(cards) ? cards : [];

        const cardsWithHours = safeCards.map(card => {
          const total = Array.isArray(allTimes) 
            ? allTimes
                .filter(t => t.card_id === card.id || t.card === card.id || t.task_id === card.id)
                .reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0)
            : 0;
          // Si el total es 0, ponemos null para que el badge desaparezca por completo
          return { ...card, total_hours: total > 0 ? total : null };
        });

        cardsData[list.id] = cardsWithHours;
        inputsData[list.id] = cardInputs[list.id] || { title: '', description: '' };
      }

      setLists(listsData);
      setCardsByList(cardsData);
      setCardInputs(inputsData);
    } catch (err) {
      setError(extractErrorMessage(err, 'Error al actualizar datos'));
    }
  };

  useEffect(() => {
    const loadBoards = async () => {
      setError('');
      try {
        const data = await getBoards(token);
        setBoards(data);
        if (data.length > 0 && !selectedBoardId) setSelectedBoardId(data[0].id);
      } catch (err) { setError(extractErrorMessage(err, 'Error tableros')); }
    };
    loadBoards();
  }, [token]);

  useEffect(() => {
    refreshBoardData();
  }, [token, selectedBoardId]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const cardId = active.id;
    const listId = Object.keys(cardsByList).find(lId => cardsByList[lId].some(c => c.id === cardId));
    if (!listId) return;
    const oldIndex = cardsByList[listId].findIndex(c => c.id === cardId);
    const newIndex = cardsByList[listId].findIndex(c => c.id === over.id);
    const newOrderedCards = arrayMove(cardsByList[listId], oldIndex, newIndex);
    setCardsByList(prev => ({ ...prev, [listId]: newOrderedCards }));
    try { 
      await moveCard(token, cardId, parseInt(listId), newIndex); 
      setSuccess('Orden actualizado con éxito');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) { setError('Error al mover'); }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;
    setError('');
    try {
      const board = await createBoard(token, newBoardTitle.trim());
      setBoards([...boards, board]);
      setNewBoardTitle('');
      setSelectedBoardId(board.id);
      setSuccess('Tablero creado con éxito');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) { setError(extractErrorMessage(err, 'Error')); }
  };

  const handleUpdateBoard = async (e, boardId) => {
    e.preventDefault();
    setError('');
    try {
      const updated = await updateBoard(token, boardId, { title: editBoardTitle });
      setBoards(boards.map(b => b.id === boardId ? updated : b));
      setEditingBoardId(null);
      setSuccess('Tablero actualizado con éxito');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) { setError('Error'); }
  };

  const handleDeleteBoard = (id) => {
    askConfirmation("¿Estás seguro de que quieres eliminar este tablero?", async () => {
      setError('');
      try {
        await deleteBoard(token, id);
        setBoards(boards.filter(b => b.id !== id));
        if (selectedBoardId === id) setSelectedBoardId(null);
        setSuccess('Tablero eliminado con éxito');
        setTimeout(() => setSuccess(''), 2000);
      } catch (err) { setError('Error'); }
    });
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    setError('');
    try {
      const list = await createList(token, selectedBoardId, newListTitle.trim());
      setLists([...lists, list]);
      setCardsByList(prev => ({ ...prev, [list.id]: [] }));
      setCardInputs(prev => ({ ...prev, [list.id]: { title: '', description: '' } }));
      setNewListTitle('');
      setSuccess('Lista creada con éxito');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) { setError('Error'); }
  };

  const handleDeleteList = (id) => {
    askConfirmation("¿Quieres eliminar esta lista definitivamente?", async () => {
      setError('');
      try {
        await deleteList(token, id);
        setLists(lists.filter(l => l.id !== id));
        setSuccess('Lista eliminada con éxito');
        setTimeout(() => setSuccess(''), 2000);
      } catch (err) { setError('Error'); }
    });
  };

  const handleUpdateList = async (e, id) => {
    e.preventDefault();
    setError('');
    try {
      const updated = await updateList(token, id, { title: editListTitle });
      setLists(lists.map(l => l.id === id ? updated : l));
      setEditingListId(null);
      setSuccess('Lista actualizada con éxito');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) { setError('Error'); }
  };

  const handleCreateCard = async (e, listId) => {
    e.preventDefault();
    setError('');
    const currentInput = cardInputs[listId] || { title: '', description: '' };
    const title = currentInput.title;
    const description = currentInput.description;
    const userId = getUserIdFromToken(token);
    
    if (!title.trim()) return;

    try {
      const card = await createCard(token, listId, title.trim(), description.trim(), userId);
      setCardsByList(prev => ({
        ...prev,
        [listId]: [...(prev[listId] || []), card]
      }));
      setCardInputs(prev => ({
        ...prev,
        [listId]: { title: '', description: '' }
      }));
      setSuccess('Tarjeta creada con éxito');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) { 
      setError(extractErrorMessage(err, 'Error al crear tarjeta')); 
    }
  };

  const handleDeleteCard = (cardId, listId) => {
    askConfirmation("¿Eliminar esta tarjeta?", async () => {
      setError('');
      try {
        await deleteCard(token, cardId);
        setCardsByList(prev => ({
          ...prev,
          [listId]: prev[listId].filter(c => c.id !== cardId)
        }));
        setSuccess('Tarjeta eliminada con éxito');
        setTimeout(() => setSuccess(''), 2000);
      } catch (err) { setError('Error'); }
    });
  };

  const handleUpdateCard = async (e, cardId, listId) => {
    e.preventDefault();
    setError('');
    try {
      const updated = await updateCard(token, cardId, { title: editTitle, description: editDesc });
      setCardsByList(prev => ({
        ...prev,
        [listId]: prev[listId].map(c => c.id === cardId ? updated : c)
      }));
      setEditingCardId(null);
      setSuccess('Tarjeta actualizada con éxito');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) { setError('Error'); }
  };

  const saveHours = async (cardId) => {
    const hoursValue = parseFloat(hoursInput);
    if (!hoursInput || isNaN(hoursValue) || hoursValue === 0) {
      setError('Introduce un número de horas válido (usa - para restar)');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/api/timesheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description: "Registro de tiempo",
          hours: hoursValue,
          date: new Date().toISOString().split('T')[0],
          card_id: cardId
        })
      });

      if (res.ok) {
        setSuccess('✅ Registro actualizado');
        setTimingCardId(null);
        setHoursInput("");
        setTimeout(() => setSuccess(''), 3000);
        await refreshBoardData();
      } else {
        const errorData = await res.json();
        setError(errorData.detail || 'Error al guardar');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) { 
      setError('Error de conexión'); 
      setTimeout(() => setError(''), 3000);
    }
  };

  const selectedBoard = boards.find((b) => b.id === selectedBoardId) || null;

  return (
    <div className="board-layout">
      {modalConfig.isOpen && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-content">
            <p>{modalConfig.message}</p>
            <div className="modal-buttons">
              <button className="confirm-btn" onClick={modalConfig.onConfirm}>Aceptar</button>
              <button className="cancel-btn" onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="neocare-logo" style={{ fontSize: '1.5rem', letterSpacing: '2px', marginBottom: '20px' }}>NEOCARE</h1>
          <button onClick={onLogout} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Salir</button>
        </div>
        
        <div className="sidebar-scroll-container">
          <ul className="board-list" style={{ listStyle: 'none', padding: 0 }}>
            {boards.map((board) => (
              <li key={board.id} className={board.id === selectedBoardId ? 'active' : ''} style={{ marginBottom: '10px', padding: '8px', borderRadius: '6px', background: board.id === selectedBoardId ? '#1e293b' : 'transparent' }}>
                <div className="board-item-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ cursor: 'pointer', fontWeight: board.id === selectedBoardId ? 'bold' : 'normal' }} onClick={() => setSelectedBoardId(board.id)}>{board.title}</span>
                  <div className="card-actions" style={{ margin: 0 }}>
                    <button className="edit-btn" onClick={() => { setEditingBoardId(board.id); setEditBoardTitle(board.title); }}>✏️</button>
                    <button className="delete-btn" onClick={() => handleDeleteBoard(board.id)}>🗑️</button>
                  </div>
                </div>
                
                {editingBoardId === board.id && (
                  <form onSubmit={(e) => handleUpdateBoard(e, board.id)} className="edit-form-inline">
                    <input value={editBoardTitle} onChange={(e) => setEditBoardTitle(e.target.value)} onKeyDown={handleInputKeyDown} autoFocus />
                    <div className="edit-buttons-group">
                      <button type="submit" className="confirm-icon-btn">✔</button>
                      <button type="button" className="cancel-icon-btn" onClick={() => setEditingBoardId(null)}>✖</button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleCreateBoard} className="sidebar-form">
          <input placeholder="Nuevo tablero..." value={newBoardTitle} onChange={(e) => setNewBoardTitle(e.target.value)} onKeyDown={handleInputKeyDown} />
          <button type="submit">+ Añadir</button>
        </form>
      </aside>

      <main className="board-main">
        {selectedBoard ? (
          <>
            <h1 style={{ marginBottom: '20px' }}>{selectedBoard.title}</h1>
            <section className="lists-section">
              {lists.map((list) => (
                <div key={list.id} className="list-column">
                  <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0 }}>{list.title}</h3>
                    <div className="card-actions" style={{ margin: 0 }}>
                      <button className="edit-btn" onClick={() => { setEditingListId(list.id); setEditListTitle(list.title || ''); }}>✏️</button>
                      <button className="delete-btn" onClick={() => handleDeleteList(list.id)}>🗑️</button>
                    </div>
                  </div>

                  {editingListId === list.id && (
                    <form onSubmit={(e) => handleUpdateList(e, list.id)} className="edit-list-form">
                      <input value={editListTitle} onChange={(e) => setEditListTitle(e.target.value)} onKeyDown={handleInputKeyDown} />
                      <div className="edit-buttons-group">
                        <button type="submit" className="confirm-icon-btn">✔</button>
                        <button type="button" className="cancel-icon-btn" onClick={() => setEditingListId(null)}>✖</button>
                      </div>
                    </form>
                  )}

                  <div className="cards-scroll-wrapper">
                    <div className="cards-container">
                      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                        <SortableContext items={(cardsByList[list.id] || []).map(c => c.id)} strategy={verticalListSortingStrategy}>
                          {(cardsByList[list.id] || []).map((card) => (
                            <SortableCard key={card.id} id={card.id}>
                              <div className="card-item">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '8px' }}>
                                  <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{card.title}</h4>
                                  
                                  {/* Lógica de Badge CORREGIDA: Si es null no se muestra nada */}
                                  {card.total_hours && (
                                    <span style={{ 
                                      fontSize: '10px', 
                                      background: '#38bdf8', 
                                      color: '#020617', 
                                      padding: '2px 6px', 
                                      borderRadius: '10px', 
                                      fontWeight: 'bold',
                                      whiteSpace: 'nowrap',
                                      marginLeft: '8px'
                                    }}>
                                      {card.total_hours}h
                                    </span>
                                  )}
                                </div>
                                <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#94a3b8' }}>{card.description}</p>

                                <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                                  {timingCardId === card.id ? (
                                    <div className="timing-form-container" style={{ background: '#1e293b', padding: '8px', borderRadius: '4px', border: '1px solid #38bdf8' }}>
                                      <input type="number" placeholder="Ej: 2 o -1 para restar" value={hoursInput} onChange={(e) => setHoursInput(e.target.value)}
                                        style={{ width: '100%', background: '#0f172a', color: 'white', border: '1px solid #334155', padding: '4px', marginBottom: '5px', borderRadius: '4px'}} />
                                      <div style={{ display: 'flex', gap: '5px' }}>
                                        <button onClick={() => saveHours(card.id)} style={{ flex: 1, background: '#38bdf8', color: '#020617', border: 'none', borderRadius: '3px', fontWeight: 'bold', cursor: 'pointer', padding: '4px' }}>Guardar</button>
                                        <button onClick={() => setTimingCardId(null)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '3px', padding: '0 8px', cursor: 'pointer' }}>X</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button className="btn-registrar-tiempo" onClick={() => setTimingCardId(card.id)}
                                      style={{ marginTop: '8px', width: '100%', background: '#38bdf8', color: '#020617', border: 'none', padding: '4px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                                      ⏱️ Registrar tiempo
                                    </button>
                                  )}
                                </div>

                                <div className="card-actions">
                                  <button className="edit-btn" onClick={() => { 
                                    setEditingCardId(card.id); setEditTitle(card.title || ''); setEditDesc(card.description || ''); 
                                  }}>✏️</button>
                                  <button className="delete-btn" onClick={() => handleDeleteCard(card.id, list.id)}>🗑️</button>
                                </div>

                                {editingCardId === card.id && (
                                  <form onSubmit={(e) => handleUpdateCard(e, card.id, list.id)} className="edit-card-form-combined">
                                    <div className="edit-card-row-wrapper">
                                      <div className="edit-card-inputs">
                                        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onKeyDown={handleInputKeyDown} placeholder="Título" />
                                        <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} onKeyDown={handleInputKeyDown} placeholder="Descripción" />
                                      </div>
                                      <div className="edit-icons-column">
                                        <button type="submit" className="confirm-icon-btn">✔</button>
                                        <button type="button" className="cancel-icon-btn" onClick={() => setEditingCardId(null)}>✖</button>
                                      </div>
                                    </div>
                                  </form>
                                )}
                              </div>
                            </SortableCard>
                          ))}
                        </SortableContext>
                      </DndContext>
                    </div>
                  </div>

                  <form onSubmit={(e) => handleCreateCard(e, list.id)} className="add-card-form" style={{ marginTop: '15px' }}>
                    <input placeholder="Título..." required value={cardInputs[list.id]?.title || ''} 
                      onChange={(e) => setCardInputs(prev => ({...prev, [list.id]: { ...(prev[list.id] || {}), title: e.target.value }}))}
                      onKeyDown={handleInputKeyDown} />
                    <button type="submit" style={{ marginTop: '5px', width: '100%' }}>+ Tarjeta</button>
                  </form>
                </div>
              ))}
              
              <div className="list-column add-list-column">
                <form onSubmit={handleCreateList}>
                  <input placeholder="Añadir otra lista..." value={newListTitle} onChange={(e) => setNewListTitle(e.target.value)} onKeyDown={handleInputKeyDown} />
                  <button type="submit" style={{ marginTop: '8px', width: '100%' }}>+ Añadir lista</button>
                </form>
              </div>
            </section>
          </>
        ) : (
          <div className="no-selection" style={{ textAlign: 'center', marginTop: '100px', color: '#64748b' }}>
              <p>Selecciona un tablero de la barra lateral para empezar.</p>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </main>
    </div>
  );
}

export default BoardPage;