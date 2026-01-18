import React, { useEffect, useState, useRef } from 'react';
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
  verticalListSortingStrategy,
  horizontalListSortingStrategy 
} from '@dnd-kit/sortable';
import { SortableCard } from '../components/SortableCard';

// --- SUB-COMPONENTE PARA EDITAR TARJETA (SIMPLIFICADO) ---
const CardEditForm = ({ card, listId, token, setCardsByList, setEditingCardId, setError, setSuccess }) => {
  const [localTitle, setLocalTitle] = useState(card.title || '');
  const [localDesc, setLocalDesc] = useState(card.description || '');

  const onSave = async (e) => {
    e.preventDefault();
    try {
      const updated = await updateCard(token, card.id, { 
        title: localTitle, 
        description: localDesc
      });
      setCardsByList(prev => ({
        ...prev,
        [listId]: prev[listId].map(c => c.id === card.id ? updated : c)
      }));
      setEditingCardId(null);
      setSuccess('Tarjeta actualizada con éxito');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Error al actualizar la tarjeta');
    }
  };

  return (
    <form onSubmit={onSave} className="edit-card-form-combined" onPointerDown={(e) => e.stopPropagation()}>
      <div className="edit-card-row-wrapper">
        <div className="edit-card-inputs">
          <input 
            value={localTitle} 
            onChange={(e) => setLocalTitle(e.target.value)} 
            placeholder="Título"
            autoFocus
            autoComplete="off"
            onKeyDown={(e) => e.stopPropagation()}
          />
          <input 
            value={localDesc} 
            onChange={(e) => setLocalDesc(e.target.value)} 
            placeholder="Descripción"
            autoComplete="off"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <div className="edit-icons-column">
          <button type="submit" className="confirm-icon-btn">✓</button>
          <button type="button" className="cancel-icon-btn" onClick={() => setEditingCardId(null)}>✖</button>
        </div>
      </div>
    </form>
  );
};

// --- SUB-COMPONENTE PARA REGISTRAR HORAS (CIERRE INMEDIATO) ---
const TimingForm = ({ cardId, token, setSuccess, setError, refreshBoardData, onClose }) => {
  const [hoursInput, setHoursInput] = useState("");
  const [saving, setSaving] = useState(false);

  const saveHours = async () => {
    const hoursValue = parseFloat(hoursInput);
    if (!hoursInput || isNaN(hoursValue)) {
      setError('Introduce un número de horas válido (usa - para restar)');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setSaving(true);
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
        setSuccess('✅ Horas registradas correctamente');
        await refreshBoardData();
        
        // CERRADO INMEDIATO sin delay
        onClose();
        
        // El mensaje de éxito se mantiene por 2 segundos
        setTimeout(() => {
          setSuccess('');
        }, 2000);
      } else {
        const errorData = await res.json();
        setError(errorData.detail || 'Error al guardar');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) { 
      setError('Error de conexión'); 
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveHours();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="timing-form-container" style={{ 
      background: '#1e293b', 
      padding: '10px', 
      borderRadius: '6px', 
      border: '1px solid #38bdf8',
      marginTop: '8px',
      marginBottom: '8px'
    }}>
      <input 
        type="number" 
        placeholder="Ej: 2 o -1 para restar" 
        value={hoursInput} 
        onChange={(e) => setHoursInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPointerDown={(e) => e.stopPropagation()}
        autoFocus
        disabled={saving}
        step="0.5"
        min="-24"
        max="24"
        style={{ 
          width: '100%', 
          background: '#0f172a', 
          color: 'white', 
          border: '1px solid #334155', 
          padding: '8px 10px', 
          marginBottom: '10px', 
          borderRadius: '6px',
          fontSize: '14px',
          boxSizing: 'border-box',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.border = '1px solid #38bdf8';
          e.currentTarget.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.3)';
        }}
        onMouseLeave={(e) => {
          if (document.activeElement !== e.currentTarget) {
            e.currentTarget.style.border = '1px solid #334155';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
        onFocus={(e) => {
          e.currentTarget.style.border = '1px solid #38bdf8';
          e.currentTarget.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.5)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.border = '1px solid #334155';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={saveHours} 
          onPointerDown={(e) => e.stopPropagation()} 
          disabled={saving}
          className={`btn-guardar-horas ${saving ? 'saving' : ''}`}
        >
          {saving ? 'Guardando...' : 'Guardar horas'}
        </button>
        <button 
          onClick={onClose} 
          onPointerDown={(e) => e.stopPropagation()} 
          disabled={saving}
          className="btn-cancelar-horas"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTE PARA MOSTRAR RESULTADOS DE BÚSQUEDA CON MOVER ---
const SearchResultCard = ({ 
  card, 
  lists, 
  cardsByList, 
  token, 
  moveCard, 
  refreshBoardData, 
  setSearchResults, 
  setSuccess, 
  setError 
}) => {
  const [isMoving, setIsMoving] = useState(false);
  const [targetList, setTargetList] = useState('');
  
  const listInfo = lists.find(list => 
    cardsByList[list.id]?.some(c => c.id === card.id)
  );
  const listTitle = listInfo ? listInfo.title : 'Lista desconocida';
  const currentListId = listInfo ? listInfo.id : null;
  
  return (
    <div className="card-item" style={{ 
      marginBottom: '16px',
      padding: '14px',
      background: '#1e293b',
      borderRadius: '10px',
      border: '1px solid #334155',
      transition: 'all 0.2s ease'
    }}>
      {/* CABECERA: Título y botón de mover */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: '12px'
      }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ 
            margin: 0, 
            fontSize: '0.95rem', 
            color: card.completed ? '#6b7280' : '#f8fafc',
            textDecoration: card.completed ? 'line-through' : 'none',
            marginBottom: '6px'
          }}>
            {card.title}
          </h4>
          
          {/* Estado: lista actual y badges */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <span style={{ 
              fontSize: '11px', 
              color: '#38bdf8', 
              background: '#0f172a',
              padding: '3px 10px',
              borderRadius: '4px',
              border: '1px solid #334155',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              📋 {listTitle}
            </span>
            
            {card.completed && (
              <span style={{ 
                fontSize: '10px', 
                background: '#10b981', 
                color: '#020617', 
                padding: '2px 8px', 
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                Completada
              </span>
            )}
            
            {card.overdue && (
              <span style={{ 
                fontSize: '10px', 
                background: '#ef4444', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                Vencida
              </span>
            )}
          </div>
        </div>
        
        {/* Botón Mover y horas */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'flex-end',
          gap: '6px'
        }}>
          {card.total_hours && (
            <span style={{ 
              fontSize: '10px', 
              background: '#38bdf8', 
              color: '#020617', 
              padding: '3px 10px', 
              borderRadius: '10px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              ⏱️ {card.total_hours}h
            </span>
          )}
          
          <button
            onClick={() => setIsMoving(!isMoving)}
            style={{
              padding: '4px 10px',
              background: isMoving ? '#a10f0f' : '#1e293b', // Rojo cuando activo
              color: isMoving ? 'white' : '#94a3b8', // Blanco cuando activo
              border: `1px solid ${isMoving ? '#a11717' : '#334155'}`,
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              fontWeight: isMoving ? 'bold' : 'normal',
              boxShadow: isMoving ? '0 0 5px rgba(220, 38, 38, 0.3)' : 'none' // Brillo suave
            }}
            onMouseEnter={(e) => {
              if (isMoving) {
                e.target.style.background = '#a71818'; // Rojo más claro
                e.target.style.border = '1px solid #af1c1c';
                e.target.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.4)'; // Brillo SUAVE
                e.target.style.transform = 'scale(1.02)'; // Ligero aumento
              } else {
                e.target.style.background = '#334155';
                e.target.style.color = '#38bdf8';
                e.target.style.border = '1px solid #38bdf8';
                e.target.style.boxShadow = '0 0 5px rgba(56, 189, 248, 0.2)'; // Brillo azul suave
              }
            }}
            onMouseLeave={(e) => {
              if (isMoving) {
                e.target.style.background = '#b11616';
                e.target.style.border = '1px solid #ac1313';
                e.target.style.boxShadow = '0 0 5px rgba(220, 38, 38, 0.3)'; // Vuelve al brillo suave
                e.target.style.transform = 'scale(1)';
              } else {
                e.target.style.background = '#1e293b';
                e.target.style.color = '#94a3b8';
                e.target.style.border = '1px solid #334155';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            {isMoving ? '✕ Cancelar' : '↳ Mover tarjeta'}
          </button>
        </div>
      </div>
      
      {/* Descripción */}
      {card.description && (
        <div style={{ 
          marginBottom: '12px',
          padding: '10px',
          background: '#0f172a',
          borderRadius: '6px',
          border: '1px solid #334155'
        }}>
          <p style={{ 
            margin: 0, 
            fontSize: '0.8rem', 
            color: '#cbd5e1',
            lineHeight: '1.4'
          }}>
            {card.description}
          </p>
        </div>
      )}
      
      {/* Selector de lista (solo cuando isMoving = true) */}
      {isMoving && (
        <div style={{ 
          marginTop: '12px',
          padding: '14px',
          background: '#0f172a',
          borderRadius: '8px',
          border: '1px solid #38bdf8',
          boxShadow: '0 0 12px rgba(56, 189, 248, 0.15)'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ 
              display: 'block',
              fontSize: '11px', 
              color: '#38bdf8', 
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              Mover a lista:
            </label>
            <select
              value={targetList}
              onChange={(e) => setTargetList(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                background: '#1e293b',
                color: 'white',
                border: '1px solid #334155',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.border = '1px solid #38bdf8';
                e.target.style.boxShadow = '0 0 5px rgba(56, 189, 248, 0.3)';
              }}
              onMouseLeave={(e) => {
                if (document.activeElement !== e.target) {
                  e.target.style.border = '1px solid #334155';
                  e.target.style.boxShadow = 'none';
                }
              }}
              onFocus={(e) => {
                e.target.style.border = '1px solid #38bdf8';
                e.target.style.boxShadow = '0 0 5px rgba(56, 189, 248, 0.5)';
              }}
              onBlur={(e) => {
                e.target.style.border = '1px solid #334155';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="">-- Seleccionar lista destino --</option>
              {lists.map((list) => (
                <option 
                  key={list.id} 
                  value={list.id}
                  disabled={list.id === currentListId}
                >
                  {list.title} {list.id === currentListId ? '(lista actual)' : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={async () => {
                const newListId = parseInt(targetList);
                if (!newListId || newListId === currentListId) return;
                
                try {
                  // Mover la tarjeta
                  await moveCard(token, card.id, newListId, 0);
                  
                  // Actualizar resultados localmente
                  setSearchResults(prev => 
                    prev.map(c => 
                      c.id === card.id 
                        ? { ...c, list_id: newListId } 
                        : c
                    )
                  );
                  
                  // Actualizar datos del tablero
                  await refreshBoardData();
                  
                  // Cerrar el selector y mostrar éxito
                  setIsMoving(false);
                  setTargetList('');
                  
                  const newListTitle = lists.find(l => l.id === newListId)?.title || 'nueva lista';
                  setSuccess(`✓ "${card.title}" movida a "${newListTitle}"`);
                  setTimeout(() => setSuccess(''), 2000);
                } catch (err) {
                  setError('Error al mover la tarjeta');
                  setTimeout(() => setError(''), 3000);
                }
              }}
              disabled={!targetList || parseInt(targetList) === currentListId}
              style={{
                padding: '8px 16px',
                background: '#38bdf8',
                color: '#020617',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: (!targetList || parseInt(targetList) === currentListId) ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!e.target.disabled) {
                  e.target.style.background = '#0ea5e9';
                  e.target.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.target.disabled) {
                  e.target.style.background = '#38bdf8';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              Mover
            </button>
            
          </div>
        </div>
      )}
    </div>
  );
};

function BoardPage({ token, onLogout, setReportConfig}) {
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

// --- NUEVO: ESTADO PARA FECHA ACTUAL ---
const [currentDateDisplay, setCurrentDateDisplay] = useState('');

// --- NUEVOS ESTADOS PARA TIEMPO ---
const [timingCardId, setTimingCardId] = useState(null);

  // Estados de edición (RESPETADOS) - Eliminamos los estados antiguos
  const [editingCardId, setEditingCardId] = useState(null);
  // Eliminamos: editTitle, editDesc ya no se usan
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

  // Ref para el contenedor de listas (scroll horizontal)
  const listsContainerRef = useRef(null);

  // CONFIGURACIÓN DE SENSORES (RESPETADA)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // --- FUNCIÓN PARA ACTUALIZAR CONFIGURACIÓN DE REPORTE ---
const updateReportConfig = (updates) => {
  if (!setReportConfig) return; // Si no está definido, salir
  setReportConfig(prev => ({
    ...prev,
    ...updates,
    boardId: selectedBoardId,
    week: exportWeek, // Usa la misma semana que el export
    filters: {
      ...prev.filters,
      ...(updates.filters || {})
    }
  }));
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
      if (data.length > 0 && !selectedBoardId) {
        const firstBoardId = data[0].id;
        setSelectedBoardId(firstBoardId);
        updateReportConfig({ boardId: firstBoardId });
      }
    } catch (err) { 
      setError(extractErrorMessage(err, 'Error tableros')); 
    }
  };
  loadBoards();
}, [token]);

useEffect(() => {
  if (selectedBoardId) {
    updateReportConfig({ boardId: selectedBoardId });
  }
}, [selectedBoardId]);

// DESPUÉS del useEffect anterior, AÑADE:
useEffect(() => {
  if (exportWeek) {
    updateReportConfig({ week: exportWeek });
  }
}, [exportWeek]);

// DESPUÉS del useEffect anterior, AÑADE:
useEffect(() => {
  if (searchQuery || responsibleFilter) {
    updateReportConfig({
      filters: {
        responsible: responsibleFilter,
        searchQuery: searchQuery
      }
    });
  }
}, [searchQuery, responsibleFilter]);

useEffect(() => {
  refreshBoardData();
}, [token, selectedBoardId]);

// --- NUEVO USEEFFECT: FECHA ACTUAL ---
useEffect(() => {
  // Establecer fecha actual al cargar
  const hoy = new Date();
  const dia = String(hoy.getDate()).padStart(2, '0');
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const año = hoy.getFullYear();
  
  setCurrentDateDisplay(`${dia}/${mes}/${año}`);
  
  // Programar actualización diaria a medianoche
  const actualizarFecha = () => {
    const nuevoHoy = new Date();
    const nuevoDia = String(nuevoHoy.getDate()).padStart(2, '0');
    const nuevoMes = String(nuevoHoy.getMonth() + 1).padStart(2, '0');
    const nuevoAño = nuevoHoy.getFullYear();
    
    setCurrentDateDisplay(`${nuevoDia}/${nuevoMes}/${nuevoAño}`);
    
    // Programar próxima actualización para mañana a las 00:00
    const ahora = new Date();
    const manana = new Date(ahora);
    manana.setDate(manana.getDate() + 1);
    manana.setHours(0, 0, 0, 0);
    
    const tiempoHastaManana = manana - ahora;
    setTimeout(actualizarFecha, tiempoHastaManana);
  };
  
  // Calcular tiempo hasta la próxima medianoche
  const ahora = new Date();
  const manana = new Date(ahora);
  manana.setDate(manana.getDate() + 1);
  manana.setHours(0, 0, 0, 0);
  
  const tiempoHastaManana = manana - ahora;
  const timeoutId = setTimeout(actualizarFecha, tiempoHastaManana);
  
  return () => {
    clearTimeout(timeoutId);
  };
}, []); // <-- Asegúrate de que termine con ]); y no solo ]

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

  // Eliminamos la función handleUpdateCard antigua ya que usamos el componente CardEditForm
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

  const selectedBoard = boards.find((b) => b.id === selectedBoardId) || null;

  // Componente para zona de drop
  const DroppableList = ({ listId, children }) => {
    const { setNodeRef } = useDroppable({
      id: `list-${listId}`,
    });
    return <div ref={setNodeRef}>{children}</div>;
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
    
    // Añadir información de la lista a cada tarjeta
    const resultsWithListInfo = Array.isArray(results) ? await Promise.all(
      results.map(async (card) => {
        try {
          // Obtener la lista de esta tarjeta
          const listsData = await getListsByBoard(token, selectedBoard.id);
          const list = listsData.find(l => l.id === card.list_id);
          return {
            ...card,
            list_title: list ? list.title : 'Lista desconocida'
          };
        } catch (err) {
          return { ...card, list_title: 'Sin lista' };
        }
      })
    ) : [];
    
    setSearchResults(resultsWithListInfo);
  } catch (err) {
    setError(extractErrorMessage(err, 'Error en búsqueda'));
    setSearchResults([]);
  } finally {
    setSearchLoading(false);
  }
};

  const clearSearch = () => { 
    setSearchQuery(''); 
    setResponsibleFilter(''); 
    setSearchResults([]); 
    setIsSearching(false); 
    setSearchLoading(false); };

    // --- FUNCIÓN PARA IR AL REPORTE CON CONFIGURACIÓN ---
const handleGoToReport = () => {
  // Actualizar configuración antes de navegar
  updateReportConfig({
    boardId: selectedBoardId,
    week: exportWeek,
    filters: {
      responsible: responsibleFilter,
      searchQuery: searchQuery
    }
  });
  navigate('/report');
};


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

      <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-header" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', // Centra horizontalmente
          padding: '20px 15px',
          gap: '15px' // Espacio entre logo y botón
        }}>
          <h1 className="neocare-logo" style={{ fontSize: '1.5rem', letterSpacing: '2px', margin: 0 }}>
            NEOCARE
          </h1>

          {/* BOTÓN CERRAR SESIÓN: Centrado horizontalmente */}
          <button 
            onClick={onLogout} 
            style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid #ef4444', 
              color: '#ef4444', 
              padding: '5px 10px', 
              borderRadius: '5px', 
              cursor: 'pointer', 
              fontSize: '11px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              width: 'auto', // Se ajusta al contenido
              minWidth: '100px' // Ancho mínimo para que se vea bien
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ef4444';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Cerrar sesión
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

        
        <form onSubmit={handleCreateBoard} style={{ marginTop: '10px' }}>
          <input
            placeholder="Nuevo tablero..."
            value={newBoardTitle}
            onChange={(e) => setNewBoardTitle(e.target.value)}
            className="sidebar-board-input"  // <-- AQUÍ
          />
          <button 
            type="submit" 
            className="btn-add-card-highlight"
            style={{ 
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            + Añadir tablero
          </button>
        </form>
      </aside>

      <main className="board-main">
        {selectedBoard ? (
          <>
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
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      border: '1px solid #334155', 
                      background: '#0f172a', 
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: 'none',
                      fontSize: '13px',
                      minWidth: '150px'
                    }} 
                    onMouseEnter={(e) => {
                      e.currentTarget.style.border = '1px solid #38bdf8';
                      e.currentTarget.style.boxShadow = '0 0 15px rgba(56, 189, 248, 0.3)';
                      e.currentTarget.style.background = '#1e293b';
                    }}
                    onMouseLeave={(e) => {
                      if (document.activeElement !== e.currentTarget) {
                        e.currentTarget.style.border = '1px solid #334155';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.background = '#0f172a';
                      }
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.border = '2px solid #38bdf8';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.5)';
                      e.currentTarget.style.background = '#1e293b';
                      e.currentTarget.style.outline = 'none';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.border = '1px solid #334155';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.background = '#0f172a';
                    }}
                  />
                  <span style={{ 
                    color: '#38bdf8',
                    fontSize: '12px',
                    background: '#0f172a',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #38bdf8',  // Borde azul permanente
                    fontWeight: 'bold',
                    minWidth: '100px',
                    display: 'inline-block',
                    textAlign: 'center',
                    boxShadow: '0 0 10px rgba(56, 189, 248, 0.3)',  // Brillo permanente
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(56, 189, 248, 0.5)';
                    e.currentTarget.style.background = '#1e293b';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.3)';
                    e.currentTarget.style.background = '#0f172a';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  >
                    {currentDateDisplay}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    placeholder="Buscar tarjetas..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    onKeyDown={(e) => { if (e.key === 'Enter') performSearch(searchQuery, responsibleFilter); }} 
                    className="search-cards-input"
                  />
                  <div className="custom-select-container">
                    <select
                      value={responsibleFilter} 
                      onChange={(e) => setResponsibleFilter(e.target.value)} 
                      className="custom-select"
                    >
                      <option value="">🔍 Todos responsables</option>  {/* Lupa - SIEMPRE visible */}
                      {availableResponsibles().map((id) => (
                        <option key={id} value={id}>👤 Usuario {id}</option>
                      ))}
                    </select>
                    <div className="custom-select-arrow"></div>
                  </div>
                  <button 
                    onClick={() => performSearch(searchQuery, responsibleFilter)} 
                    disabled={searchLoading} 
                    className="btn-buscar"
                  >
                    {searchLoading ? 'Buscando...' : 'Buscar'}
                  </button>
                  
                  <button 
                    onClick={() => { 
                      if (responsibleFilter) { 
                        performSearch('', responsibleFilter); 
                        setSearchQuery(''); 
                        setIsSearching(true); 
                      } else { 
                        clearSearch(); 
                      } 
                    }} 
                    disabled={searchLoading}
                    className={`btn-limpiar ${responsibleFilter ? 'is-filtering' : ''}`}
                  >
                    {responsibleFilter ? 'Filtrar' : 'Limpiar'}
                  </button>

                  {/* --- BOTONES MOVIDOS AQUÍ (Flecha naranja) --- */}
                  <button 
                    onClick={async () => {
                      setExporting(true);
                      try {
                        const data = await getReportHoursByCard(token, selectedBoard.id, exportWeek);
                        const headers = ['card_id', 'card_title', 'total_hours'];
                        const rows = Array.isArray(data) ? data : [];
                        const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))).join('\n');
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `board_${selectedBoard.id}_hours_${exportWeek}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                        setSuccess('CSV descargado');
                        setTimeout(() => setSuccess(''), 3000);
                      } catch (err) { setError('Error exportando CSV'); } finally { setExporting(false); }
                    }}
                    className={`btn-export-csv ${exporting ? 'exporting' : ''}`}
                  >
                    {exporting ? '...' : 'Export CSV'}
                  </button>

                  <button 
                    onClick={handleGoToReport} 
                    className="btn-informe-semana"
                  >
                    Informe semana
                  </button>

                  <div style={{ marginLeft: 'auto', paddingLeft: '20px' }}>
                  </div>
                </div>
              </div>
            </div>
            
           <section className="lists-section" 
              ref={listsContainerRef}
              style={{ 
                display: 'flex', 
                gap: '16px', 
                overflowX: 'auto', 
                paddingBottom: '10px',
                paddingTop: '10px',
                minHeight: '400px', // Cambiado de 'calc(100vh - 220px)' a 400px
                alignItems: 'flex-start', // Añadido: todas las listas alineadas arriba
                scrollBehavior: 'smooth',
                marginTop: '10px',
                scrollbarWidth: 'thin',
                scrollbarColor: '#02d7fd10 #0f172a'
              }}
            >
              <DndContext 
                sensors={sensors} 
                collisionDetection={closestCorners} 
                onDragEnd={handleDragEnd}
              >
                {isSearching ? (
                  <div className="list-column" style={{ minWidth: '300px' }}>
                    <div className="list-header" style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '15px',
                      padding: '12px',
                      background: '#0f172a',
                      borderRadius: '8px',
                      border: '1px solid #334155'
                    }}>
                      <h3 style={{ margin: 0, color: '#38bdf8' }}>🔍 Resultados ({searchResults.length})</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        {searchQuery && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Búsqueda: "{searchQuery}"</span>}
                        {responsibleFilter && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Responsable: Usuario {responsibleFilter}</span>}
                      </div>
                    </div>
                    
                    <div className="cards-scroll-wrapper" style={{
                      flex: 1,
                      minHeight: '200px',
                      maxHeight: 'none',
                      overflowY: 'auto'
                    }}>
                      <div className="cards-container" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        {(searchResults || []).length === 0 ? (
                          <div style={{ padding: '12px', color: '#94a3b8', textAlign: 'center' }}>
                            No se encontraron resultados
                          </div>
                        ) : (
                          (searchResults || []).map((card) => (
                            <SearchResultCard
                              key={card.id}
                              card={card}
                              lists={lists}
                              cardsByList={cardsByList}
                              token={token}
                              moveCard={moveCard}
                              refreshBoardData={refreshBoardData}
                              setSearchResults={setSearchResults}
                              setSuccess={setSuccess}
                              setError={setError}
                            />
                          ))
                        )}
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '12px' }}>
                      <button 
                        onClick={clearSearch} 
                        style={{ 
                          background: '#1e293b', 
                          color: '#94a3b8', 
                          border: '1px solid #334155', 
                          padding: '8px 16px', 
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          width: '100%',
                          fontWeight: '500',
                          boxShadow: 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#334155';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.border = '1px solid #38bdf8';
                          e.currentTarget.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#1e293b';
                          e.currentTarget.style.color = '#94a3b8';
                          e.currentTarget.style.border = '1px solid #334155';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        ← Volver al tablero
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <SortableContext items={lists.map(l => l.id)} strategy={horizontalListSortingStrategy}>
                      {lists.map((list) => (
                        <div key={list.id} className="list-column" style={{ 
                          minWidth: '300px', 
                          maxWidth: '300px',
                          flexShrink: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          height: 'fit-content', // Cambiado de 'auto' a 'fit-content'
                          minHeight: '150px',
                          maxHeight: 'calc(100vh - 250px)', // Añadido: altura máxima
                          overflow: 'hidden' // Añadido: evita desbordamiento
                        }}>
                          <div className="list-header" style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginBottom: '15px',
                            flexShrink: 0
                          }}>
                            <h3 className="list-title" style={{ margin: 0 }}>{list.title}</h3>
                            <div className="card-actions" style={{ margin: 0 }}>
                              <button className="edit-btn" onClick={() => { setEditingListId(list.id); setEditListTitle(list.title || ''); }}>✏️</button>
                              <button className="delete-btn" onClick={() => handleDeleteList(list.id)}>🗑️</button>
                            </div>
                          </div>

                          {editingListId === list.id && (
                            <form onSubmit={(e) => handleUpdateList(e, list.id)} className="edit-list-form" style={{ flexShrink: 0 }}>
                              <input value={editListTitle} onChange={(e) => setEditListTitle(e.target.value)} />
                              <div className="edit-buttons-group">
                                <button type="submit" className="confirm-icon-btn">✓</button>
                                <button type="button" className="cancel-icon-btn" onClick={() => setEditingListId(null)}>✖</button>
                              </div>
                            </form>
                          )}

                          <DroppableList listId={list.id}>
                            <div className="cards-scroll-wrapper" style={{
                              flex: '1 1 auto', // Cambiado de '1' a '1 1 auto'
                              overflowY: 'auto', // Scroll vertical cuando hay muchas tarjetas
                              minHeight: '50px',
                              maxHeight: 'calc(100vh - 350px)', // Añadido: altura máxima con scroll interno
                              display: 'flex',
                              flexDirection: 'column'
                            }}>
                              <div className="cards-container" style={{
                                flex: '0 0 auto', // Cambiado de '1' a '0 0 auto'
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                paddingBottom: '10px'
                              }}>
                                <SortableContext items={(cardsByList[list.id] || []).map(c => c.id)} strategy={verticalListSortingStrategy}>
                                  {(cardsByList[list.id] || []).map((card) => (
                                    <SortableCard key={card.id} id={card.id} disabled={editingCardId === card.id || timingCardId === card.id}>
                                      <div className="card-item">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '8px' }}>
                                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <h4 className="card-title" style={{ margin: 0, fontSize: '0.9rem', color: card.completed ? '#6b7280' : undefined, textDecoration: card.completed ? 'line-through' : undefined }}>
                                              {card.title}
                                            </h4>
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
                                            <TimingForm 
                                              cardId={card.id}
                                              token={token}
                                              setSuccess={setSuccess}
                                              setError={setError}
                                              refreshBoardData={refreshBoardData}
                                              onClose={() => setTimingCardId(null)}
                                            />
                                          ) : (
                                            <button className="btn-registrar-tiempo" onClick={() => setTimingCardId(card.id)} onPointerDown={(e) => e.stopPropagation()}
                                              style={{ 
                                                marginTop: '8px', 
                                                width: '100%', 
                                                background: '#38bdf8', 
                                                color: '#020617', 
                                                border: 'none', 
                                                padding: '6px', 
                                                borderRadius: '4px', 
                                                fontSize: '12px', 
                                                fontWeight: 'bold', 
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                              }}>
                                              ⏱️ Registrar tiempo
                                            </button>
                                          )}
                                        </div>

                                        <div className="card-actions" onPointerDown={(e) => e.stopPropagation()}>
                                          <button 
                                            title={card.completed ? 'Marcar no completada' : 'Marcar completada'}
                                            className="btn-complete"
                                            onClick={async () => {
                                              try {
                                                const updated = await updateCard(token, card.id, { 
                                                  completed: !card.completed,
                                                  overdue: false // Si se marca como completada, no puede estar vencida
                                                });
                                                setCardsByList(prev => ({ 
                                                  ...prev, 
                                                  [list.id]: prev[list.id].map(c => c.id === card.id ? updated : c) 
                                                }));
                                              } catch (err) {
                                                await refreshBoardData();
                                                console.warn("Re-sincronizando tras error de red ligero");
                                              }
                                            }}
                                          >
                                            {card.completed ? (
                                              <span className="trophy-emoji" style={{ fontSize: '12px' }}>🏆</span>
                                            ) : (
                                              'Completar'
                                            )}
                                          </button>

                                          <button 
                                            title={card.overdue ? 'Marcar no vencida' : 'Marcar vencida'}
                                            className="btn-overdue"
                                            onClick={async () => {
                                              try {
                                                const updated = await updateCard(token, card.id, { 
                                                  overdue: !card.overdue,
                                                  completed: false // Si se marca como vencida, no puede estar completada
                                                });
                                                setCardsByList(prev => ({ 
                                                  ...prev, 
                                                  [list.id]: prev[list.id].map(c => c.id === card.id ? updated : c) 
                                                }));
                                              } catch (err) { 
                                                await refreshBoardData(); 
                                                console.warn("Re-sincronizando tras error de red ligero"); 
                                              }
                                            }}
                                          >
                                            {card.overdue ? (
                                              <span className="hourglass-emoji" style={{ fontSize: '12px' }}>⌛</span>
                                            ) : (
                                              'Vencida'
                                            )}
                                          </button>

                                          <button className="edit-btn" onClick={() => { 
                                            setEditingCardId(card.id);
                                          }}>✏️</button>
                                          <button className="delete-btn" onClick={() => handleDeleteCard(card.id, list.id)}>🗑️</button>
                                        </div>

                                        {/* Usamos CardEditForm simplificado sin ID del usuario responsable */}
                                        {editingCardId === card.id && (
                                          <CardEditForm 
                                            card={card} 
                                            listId={list.id} 
                                            token={token} 
                                            setCardsByList={setCardsByList} 
                                            setEditingCardId={setEditingCardId} 
                                            setError={setError} 
                                            setSuccess={setSuccess} 
                                          />
                                        )}
                                      </div>
                                    </SortableCard>
                                  ))}
                                </SortableContext>
                              </div>
                            </div>
                          </DroppableList>

                          <form onSubmit={(e) => handleCreateCard(e, list.id)} className="add-card-form" style={{ 
                            marginTop: '10px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '8px',
                            flexShrink: 0
                          }}>
                            <input 
                              placeholder="Título..." 
                              required 
                              className="input-glow-effect" 
                              value={cardInputs[list.id]?.title || ''} 
                              onChange={(e) => setCardInputs(prev => ({...prev, [list.id]: { ...(prev[list.id] || {}), title: e.target.value }}))}
                              style={{ 
                                transition: 'all 0.3s ease',
                                padding: '8px', 
                                borderRadius: '4px', 
                                background: '#0f172a', 
                                color: 'white', 
                                border: '1px solid #334155',
                                minHeight: '45px',
                                fontSize: '13px',
                                resize: 'vertical', 
                              }}
                            />
                            <textarea 
                              placeholder="Descripción..." 
                              className="input-glow-effect" 
                              value={cardInputs[list.id]?.description || ''} 
                              onChange={(e) => setCardInputs(prev => ({...prev, [list.id]: { ...(prev[list.id] || {}), description: e.target.value }}))}
                              style={{ 
                                padding: '8px', 
                                borderRadius: '4px', 
                                background: '#0f172a', 
                                color: 'white', 
                                border: '1px solid #334155',
                                minHeight: '60px',
                                fontSize: '13px',
                                resize: 'vertical',
                                transition: 'all 0.3s ease'
                              }}
                            />
                            <button 
                              type="submit" 
                              className="btn-add-card-highlight"
                              style={{ 
                                marginTop: '5px', 
                                width: '100%',
                                background: '#1e293b', 
                                color: '#94a3b8',      
                                border: '1px solid #334155',
                                padding: '10px',
                                borderRadius: '8px',   
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                                textAlign: 'center'
                              }}
                            >
                              + Tarjeta
                            </button>
                          </form>
                        </div>
                      ))}
                    </SortableContext>
                    
                    <div className="list-column add-list-column" style={{ 
                      minWidth: '300px', 
                      flexShrink: 0,
                      height: 'fit-content' // Añadido: se ajusta al contenido
                    }}>
                      <div style={{ 
                        background: '#1e293b', 
                        padding: '20px', 
                        borderRadius: '16px', 
                        border: '1px solid #334155',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' 
                      }}>
                        <form onSubmit={handleCreateList}>
                          <input 
                            placeholder="Nombre de la lista..." 
                            value={newListTitle} 
                            onChange={(e) => setNewListTitle(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '12px',
                              borderRadius: '8px',
                              border: '1px solid #334155',
                              background: '#0f172a',
                              color: 'white',
                              marginBottom: '15px',
                              outline: 'none',
                              fontSize: '14px',
                              transition: 'all 0.3s ease',
                              boxSizing: 'border-box'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.border = '1px solid #38bdf8';
                              e.currentTarget.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.3)';
                              e.currentTarget.style.setProperty('--ph-color', '#f8fafc');
                            }}
                            onMouseLeave={(e) => {
                              if (document.activeElement !== e.currentTarget) {
                                e.currentTarget.style.border = '1px solid #334155';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.setProperty('--ph-color', '#94a3b8');
                              }
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.border = '1px solid #38bdf8';
                              e.currentTarget.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.5)';
                              e.currentTarget.style.background = '#1e293b';
                              e.currentTarget.style.setProperty('--ph-color', '#f8fafc');
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.border = '1px solid #334155';
                              e.currentTarget.style.boxShadow = 'none';
                              e.currentTarget.style.background = '#0f172a';
                              e.currentTarget.style.setProperty('--ph-color', '#94a3b8');
                            }}
                            ref={(input) => {
                              if (input) {
                                input.style.setProperty('--ph-color', '#94a3b8');
                                const style = document.createElement('style');
                                style.innerHTML = `
                                  #${input.id}::placeholder {
                                    color: var(--ph-color);
                                    transition: color 0.3s ease;
                                  }
                                `;
                                input.parentNode.insertBefore(style, input.nextSibling);
                              }
                            }}
                            id="new-list-input"
                          />
                          <button 
                            type="submit" 
                            className="btn-add-card-highlight"
                            style={{ 
                              width: '100%', 
                              padding: '12px', 
                              borderRadius: '10px',
                              fontSize: '15px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '10px'
                            }}
                          >
                            <span style={{ fontSize: '20px', lineHeight: '0' }}>+</span> Añadir lista
                          </button>
                        </form>
                      </div>
                    </div>
                  </>
                )}
              </DndContext>
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