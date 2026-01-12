import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  getCardsByBoard,
  searchCards,
  getReportHoursByCard,
} from '../api/client.js';

// Imports para Drag & Drop (RESPETADOS)
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  useDroppable
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { SortableCard } from '../components/SortableCard';

function BoardPage({ token, onLogout }) {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [lists, setLists] = useState([]);
  const [cardsByList, setCardsByList] = useState({});
  const [cardInputs, setCardInputs] = useState({});
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newListTitle, setNewListTitle] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // --- BUSCADOR / FILTRO POR RESPONSABLE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // --- EXPORT CSV (INFORME) ---
  const [exportWeek, setExportWeek] = useState(() => {
    const now = new Date();
    // Calcular la semana ISO correctamente
    const date = new Date(now.getTime());
    date.setHours(0, 0, 0, 0);
    // Jueves en la semana actual decide el año
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    // Enero 4 siempre está en la semana 1
    const week1 = new Date(date.getFullYear(), 0, 4);
    // Calcular número de semana
    const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return `${date.getFullYear()}-W${String(weekNumber).padStart(2,'0')}`;
  });
  const [exporting, setExporting] = useState(false);


  // --- NUEVOS ESTADOS PARA TIEMPO ---
  const [timingCardId, setTimingCardId] = useState(null);
  const hoursInputRef = useRef(null);

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
    })
  );

  // Esta función ya no es necesaria, la eliminamos

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
    if (!over) return;
    
    const cardId = active.id;
    const overId = over.id;
    
    // Encontrar la lista origen de la tarjeta
    const sourceListId = Object.keys(cardsByList).find(lId => 
      cardsByList[lId].some(c => c.id === cardId)
    );
    if (!sourceListId) return;

    // Determinar si over es una tarjeta o una lista
    let targetListId = null;
    let targetIndex = 0;

    // Verificar si over es una lista (tiene el prefijo 'list-')
    if (String(overId).startsWith('list-')) {
      targetListId = String(overId).replace('list-', '');
      targetIndex = 0; // Al inicio de la lista
    } else {
      // over es una tarjeta, encontrar su lista
      targetListId = Object.keys(cardsByList).find(lId => 
        cardsByList[lId].some(c => c.id === overId)
      );
      if (targetListId) {
        targetIndex = cardsByList[targetListId].findIndex(c => c.id === overId);
      }
    }

    if (!targetListId) return;

    // Si es la misma tarjeta en la misma posición, no hacer nada
    if (sourceListId === targetListId && cardId === overId) return;

    const sourceCards = [...cardsByList[sourceListId]];
    const targetCards = sourceListId === targetListId ? sourceCards : [...cardsByList[targetListId]];
    
    const sourceIndex = sourceCards.findIndex(c => c.id === cardId);
    const [movedCard] = sourceCards.splice(sourceIndex, 1);

    if (sourceListId === targetListId) {
      // Movimiento dentro de la misma lista
      targetCards.splice(targetIndex, 0, movedCard);
      setCardsByList(prev => ({ ...prev, [sourceListId]: targetCards }));
    } else {
      // Movimiento entre listas diferentes
      targetCards.splice(targetIndex, 0, movedCard);
      setCardsByList(prev => ({
        ...prev,
        [sourceListId]: sourceCards,
        [targetListId]: targetCards
      }));
    }

    try {
      await moveCard(token, cardId, parseInt(targetListId), targetIndex);
      setSuccess('Tarjeta movida con éxito');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Error al mover la tarjeta');
      // Revertir cambios en caso de error
      await refreshBoardData();
    }
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
    const existingCards = cardsByList[listId] || [];
    if (existingCards.length >= 10) {
      setError('Límite de tarjetas generadas (máximo 10 por lista)');
      setTimeout(() => setError(''), 3000);
      return;
    }
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
    const raw = hoursInputRef.current ? hoursInputRef.current.value : '';
    const value = raw ? parseFloat(raw.replace(',', '.')) : NaN;
    if (!raw || Number.isNaN(value) || value === 0) {
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
          hours: value,
          date: new Date().toISOString().split('T')[0],
          card_id: cardId
        })
      });

      if (res.ok) {
        // Cálculo de hora estimada de fin solo al guardar, para no molestar mientras se escribe
        let message = '✅ Registro actualizado';
        if (value > 0) {
          const now = new Date();
          const end = new Date(now.getTime() + value * 60 * 60 * 1000);
          const nowStr = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
          const endStr = end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
          message = `✅ Registro actualizado. Si empiezas ahora (${nowStr}), terminarías aproximadamente a las ${endStr}.`;
        }
        setSuccess(message);
        setTimingCardId(null);
        if (hoursInputRef.current) {
          hoursInputRef.current.value = '';
        }
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

  // Componente para zona de drop (ocupa el alto disponible de la columna)
  const DroppableList = ({ listId, children }) => {
    const { setNodeRef } = useDroppable({
      id: `list-${listId}`,
    });
    return (
      <div ref={setNodeRef} className="droppable-list-wrapper">
        {children}
      </div>
    );
  };

  const availableResponsibles = () => {
    const ids = new Set();
    Object.values(cardsByList).flat().forEach(c => { if (c.user_id) ids.add(c.user_id); });
    return Array.from(ids);
  };

  const performSearch = async (query, responsibleId) => {
    if (!selectedBoard) return;
    if (!query && !responsibleId) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchLoading(true);
    setSearchResults([]);

    try {
      let results = [];
      if (!query && responsibleId) {
        results = await getCardsByBoard(token, selectedBoard.id, responsibleId);
      } else if (query && query.length >= 1) {
        results = await searchCards(token, selectedBoard.id, query || '', responsibleId || undefined);
      }
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Error en búsqueda'));
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => { setSearchQuery(''); setResponsibleFilter(''); setSearchResults([]); setIsSearching(false); setSearchLoading(false); };

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
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={onLogout}
          >
            Salir
          </button>
        </div>
        
        <div className="sidebar-scroll-container">
          <ul className="board-list" style={{ listStyle: 'none', padding: 0 }}>
            {boards.map((board) => (
              <li key={board.id} className={board.id === selectedBoardId ? 'active' : ''} style={{ marginBottom: '10px', padding: '8px', borderRadius: '6px', background: board.id === selectedBoardId ? '#1e293b' : 'transparent' }}>
                <div className="board-item-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    className="board-title"
                    tabIndex={0}
                    role="button"
                    style={{ cursor: 'pointer', fontWeight: board.id === selectedBoardId ? 'bold' : 'normal' }}
                    onClick={() => setSelectedBoardId(board.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedBoardId(board.id); } }}
                  >{board.title}</span>
                  <div className="card-actions" style={{ margin: 0 }}>
                    <button className="edit-btn" onClick={() => { setEditingBoardId(board.id); setEditBoardTitle(board.title); }}>✏️</button>
                    <button className="delete-btn" onClick={() => handleDeleteBoard(board.id)}>🗑️</button>
                  </div>
                </div>
                
                {editingBoardId === board.id && (
                  <form onSubmit={(e) => handleUpdateBoard(e, board.id)} className="edit-form-inline">
                    <input value={editBoardTitle} onChange={(e) => setEditBoardTitle(e.target.value)} autoFocus />
                    <div className="edit-buttons-group">
                      <button type="submit" className="confirm-icon-btn">✓</button>
                      <button type="button" className="cancel-icon-btn" onClick={() => setEditingBoardId(null)}>✖</button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleCreateBoard} className="sidebar-form add-board-form">
          <input
            placeholder="Nombre del nuevo tablero..."
            value={newBoardTitle}
            onChange={(e) => setNewBoardTitle(e.target.value)}
            className="add-board-input input-glow-effect"
          />
          <button type="submit" className="add-board-button">
            + Añadir tablero
          </button>
        </form>
      </aside>

      <main className="board-main">
        {selectedBoard ? (
          <div>
            <div className="board-header-with-report">
              <h1 className="page-board-title" style={{ marginBottom: '20px' }}>{selectedBoard.title}</h1>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label style={{ color: '#cfcfe6', fontSize: '12px' }}>Semana:</label>
                  <input 
                    type="week" 
                    value={exportWeek} 
                    onChange={(e) => setExportWeek(e.target.value)} 
                    style={{ 
                      padding: '6px', 
                      borderRadius: '6px', 
                      border: '1px solid #334155', 
                      background: '#0f172a', 
                      color: 'white',
                      cursor: 'pointer'
                    }} 
                  />
                  <span style={{ 
                    color: '#94a3b8', 
                    fontSize: '12px',
                    background: '#1e293b',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #334155'
                  }}>
                    {(() => {
                      const [year, week] = exportWeek.split('-W');
                      return `Semana ${week}, ${year}`;
                    })()}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input placeholder="Buscar tarjetas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') performSearch(searchQuery, responsibleFilter); }} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
                  <select value={responsibleFilter} onChange={(e) => setResponsibleFilter(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' }}>
                    <option value="">Todos responsables</option>
                    {availableResponsibles().map((id) => (<option key={id} value={id}>{`Usuario ${id}`}</option>))}
                  </select>
                  <button onClick={() => performSearch(searchQuery, responsibleFilter)} disabled={searchLoading} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: searchLoading ? 'not-allowed' : 'pointer' }}>{searchLoading ? 'Buscando...' : 'Buscar'}</button>
                  <button onClick={() => { if (responsibleFilter) { performSearch('', responsibleFilter); setSearchQuery(''); setIsSearching(true); } else { clearSearch(); } }} disabled={searchLoading} style={{ background: (responsibleFilter ? '#6b7280' : '#dc2626'), color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: searchLoading ? 'not-allowed' : 'pointer' }}>{responsibleFilter ? 'Filtrar' : 'Limpiar'}</button>
                </div>
              </div>
            </div>
            <section className="lists-section">
              <DndContext 
                sensors={sensors} 
                collisionDetection={closestCorners} 
                onDragEnd={handleDragEnd}
              >
              {isSearching ? (
                <div className="list-column">
                  <div className="list-header"><h3>Resultados ({searchResults.length})</h3></div>
                  <div className="cards-scroll-wrapper">
                    <div className="cards-container">
                      {(searchResults || []).length === 0 ? (
                        <div style={{ padding: '12px', color: '#94a3b8' }}>No se encontraron resultados</div>
                      ) : (
                        (searchResults || []).map((card) => (
                          <div key={card.id} className="card-item" style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', color: card.completed ? '#172f5f' : undefined, textDecoration: card.completed ? 'line-through' : undefined }}>{card.title}</h4>
                                {card.completed && <span className="card-badge completed">Completada</span>}
                                {card.overdue && <span className="card-badge overdue">Vencida</span>}
                              </div>
                              <span style={{ fontSize: '12px', color: '#ffffff' }}>{card.user_id ? `Usuario ${card.user_id}` : 'Sin responsable'}</span>
                            </div>
                            <p style={{ margin: '6px 0', fontSize: '0.8rem', color: '#ffffff' }}>{card.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <button onClick={clearSearch} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px' }}>Volver</button>
                  </div>
                </div>
              ) : (
                lists.map((list) => (
                <div key={list.id} className="list-column">
                  <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 className="list-title" style={{ margin: 0 }}>{list.title}</h3>
                    <div className="card-actions" style={{ margin: 0 }}>
                      <button className="edit-btn" onClick={() => { setEditingListId(list.id); setEditListTitle(list.title || ''); }}>✏️</button>
                      <button className="delete-btn" onClick={() => handleDeleteList(list.id)}>🗑️</button>
                    </div>
                  </div>

                  {editingListId === list.id && (
                    <form onSubmit={(e) => handleUpdateList(e, list.id)} className="edit-list-form">
                      <input value={editListTitle} onChange={(e) => setEditListTitle(e.target.value)} />
                      <div className="edit-buttons-group">
                        <button type="submit" className="confirm-icon-btn">✓</button>
                        <button type="button" className="cancel-icon-btn" onClick={() => setEditingListId(null)}>✖</button>
                      </div>
                    </form>
                  )}

                  <DroppableList listId={list.id}>
                  <div className="cards-scroll-wrapper">
                    <div className="cards-container">
                        <SortableContext items={(cardsByList[list.id] || []).map(c => c.id)} strategy={verticalListSortingStrategy}>
                          {(cardsByList[list.id] || []).map((card) => (
                            <SortableCard key={card.id} id={card.id} disabled={editingCardId === card.id}>
                              <div className="card-item">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '8px' }}>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <h4 className="card-title" style={{ margin: 0, fontSize: '0.9rem', color: card.completed ? '#6b7280' : undefined, textDecoration: card.completed ? 'line-through' : undefined }}>{card.title}</h4>
                                    {card.completed && <span className="card-badge completed">Completada</span>}
                                    {card.overdue && <span className="card-badge overdue">Vencida</span>}
                                  </div>

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
                                    <div className="timing-form-container" style={{ background: '#0b1220', padding: '10px', borderRadius: '6px', border: '1px solid #38bdf8' }}>
                                      <p style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: '#e5e7eb', fontWeight: 500 }}>
                                        Registrar tiempo para esta tarjeta
                                      </p>
                                      <p style={{ margin: '0 0 6px 0', fontSize: '0.7rem', color: '#9ca3af' }}>
                                        Horas actuales registradas: <strong>{typeof card.total_hours === 'number' ? card.total_hours : 0}h</strong>
                                      </p>
                                      <input 
                                        ref={hoursInputRef}
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="Horas a añadir (ej: 1.5 o 1,5)"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        style={{ width: '100%', background: '#020617', color: 'white', border: '1px solid #334155', padding: '6px', marginBottom: '4px', borderRadius: '4px', fontSize: '0.8rem'}} 
                                      />
                                      <p style={{ margin: '0 0 4px 0', fontSize: '0.7rem', color: '#9ca3af' }}>
                                        Puedes usar un número negativo para corregir restando tiempo si te has pasado.
                                      </p>
                                      <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
                                        <button onClick={() => saveHours(card.id)} onPointerDown={(e) => e.stopPropagation()} style={{ flex: 1, background: '#38bdf8', color: '#020617', border: 'none', borderRadius: '3px', fontWeight: 'bold', cursor: 'pointer', padding: '5px', fontSize: '0.8rem' }}>Guardar</button>
                                        <button onClick={() => setTimingCardId(null)} onPointerDown={(e) => e.stopPropagation()} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '3px', padding: '0 10px', cursor: 'pointer', fontSize: '0.8rem' }}>Cancelar</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn-registrar-tiempo"
                                      onClick={() => setTimingCardId(card.id)}
                                      onPointerDown={(e) => e.stopPropagation()}
                                    >
                                      ⏱️ Registrar tiempo
                                    </button>
                                  )}
                                </div>

                                <div className="card-actions" onPointerDown={(e) => e.stopPropagation()}>
                                  <button 
                                    title={card.completed ? 'Marcar no completada' : 'Marcar completada'}
                                    onClick={async () => {
                                      try {
                                        const updated = await updateCard(token, card.id, { completed: !card.completed });
                                        setCardsByList(prev => ({ ...prev, [list.id]: prev[list.id].map(c => c.id === card.id ? updated : c) }));
                                      } catch (err) { setError('Error al actualizar estado'); }
                                    }}
                                    style={{ 
                                      background: card.completed ? '#16a34a' : '#10b981', 
                                      color: 'white', 
                                      border: 'none', 
                                      padding: '4px 6px', 
                                      borderRadius: '4px', 
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      minWidth: '32px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    {card.completed ? '🏆' : 'Completar'}
                                  </button>

                                  <button 
                                    title={card.overdue ? 'Marcar no vencida' : 'Marcar vencida'}
                                    onClick={async () => {
                                      try {
                                        const updated = await updateCard(token, card.id, { overdue: !card.overdue });
                                        setCardsByList(prev => ({ ...prev, [list.id]: prev[list.id].map(c => c.id === card.id ? updated : c) }));
                                      } catch (err) { setError('Error al actualizar estado'); }
                                    }}
                                    style={{ 
                                      background: card.overdue ? '#b91c1c' : '#ef4444', 
                                      color: 'white', 
                                      border: 'none', 
                                      padding: '4px 6px', 
                                      borderRadius: '4px', 
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      minWidth: '32px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    {card.overdue ? '⌛' : 'Vencer'}
                                  </button>

                                  <button className="edit-btn" onClick={() => { 
                                    setEditingCardId(card.id); setEditTitle(card.title || ''); setEditDesc(card.description || ''); 
                                  }}>✏️</button>
                                  <button className="delete-btn" onClick={() => handleDeleteCard(card.id, list.id)}>🗑️</button>
                                </div>

                                {editingCardId === card.id && (
                                  <form 
                                    onSubmit={(e) => handleUpdateCard(e, card.id, list.id)} 
                                    className="edit-card-form-combined"
                                    onPointerDown={(e) => e.stopPropagation()}
                                  >
                                    <div className="edit-card-row-wrapper">
                                      <div className="edit-card-inputs">
                                        <input 
                                          value={editTitle} 
                                          onChange={(e) => setEditTitle(e.target.value)} 
                                          placeholder="Título"
                                          autoFocus
                                        />
                                        <input 
                                          value={editDesc} 
                                          onChange={(e) => setEditDesc(e.target.value)} 
                                          placeholder="Descripción"
                                        />
                                      </div>
                                      <div className="edit-icons-column">
                                        <button type="submit" className="confirm-icon-btn">✓</button>
                                        <button type="button" className="cancel-icon-btn" onClick={() => setEditingCardId(null)}>✖</button>
                                      </div>
                                    </div>
                                  </form>
                                )}
                              </div>
                            </SortableCard>
                          ))}
                        </SortableContext>
                    </div>
                  </div>
                  </DroppableList>

                  <form
                    onSubmit={(e) => handleCreateCard(e, list.id)}
                    className="add-card-form"
                  >
                    <input
                      placeholder="Título de la tarjeta..."
                      required
                      className="input-glow-effect add-card-title-input"
                      value={cardInputs[list.id]?.title || ''}
                      onChange={(e) =>
                        setCardInputs((prev) => ({
                          ...prev,
                          [list.id]: {
                            ...(prev[list.id] || {}),
                            title: e.target.value,
                          },
                        }))
                      }
                    />
                    <textarea
                      placeholder="Descripción detallada..."
                      className="input-glow-effect add-card-textarea"
                      value={cardInputs[list.id]?.description || ''}
                      onChange={(e) =>
                        setCardInputs((prev) => ({
                          ...prev,
                          [list.id]: {
                            ...(prev[list.id] || {}),
                            description: e.target.value,
                          },
                        }))
                      }
                    />
                    <button
                      type="submit"
                      className="btn-add-card-highlight add-card-submit"
                    >
                      Tarjeta
                    </button>
                  </form>
                </div>
              ))) }
              </DndContext>
              
              <div className="list-column add-list-column">
                <form onSubmit={handleCreateList} className="add-list-form">
                  <input
                    placeholder="Nombre de la nueva lista..."
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    className="add-list-input input-glow-effect"
                  />
                  <button type="submit" className="add-list-button">
                    + Añadir lista
                  </button>
                </form>
              </div>
            </section>
          </div>
        ) : (
          <div className="no-selection" style={{ textAlign: 'center', marginTop: '100px', color: '#64748b' }}>
              <p>Selecciona un tablero de la barra lateral para empezar.</p>
          </div>
        )}

        <div style={{ position: 'fixed', right: '20px', bottom: '20px', display: 'flex', gap: '8px', alignItems: 'center', zIndex: 999 }}>
          <button onClick={async () => {
            if (!selectedBoard) return setError('Selecciona un tablero');
            setExporting(true);
            try {
              const data = await getReportHoursByCard(token, selectedBoard.id, exportWeek);
              const headers = ['card_id','title','status','responsible','total_hours'];
              const rows = Array.isArray(data) ? data : [];
              const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))).join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `board_${selectedBoard.id}_hours_by_card_${exportWeek}.csv`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
              setSuccess('CSV descargado');
              setTimeout(() => setSuccess(''), 3000);
            } catch (err) {
              setError(extractErrorMessage(err, 'Error exportando CSV'));
            } finally {
              setExporting(false);
            }
          }} style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}>{exporting ? 'Generando...' : 'Export CSV'}</button>

          <button onClick={() => navigate('/report')} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}>Ver informe semanal</button>
        </div>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </main>
    </div>
  );
}

export default BoardPage;