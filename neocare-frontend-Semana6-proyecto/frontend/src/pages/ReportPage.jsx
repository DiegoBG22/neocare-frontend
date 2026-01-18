import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getBoards,
  getReportSummary,
  getReportHoursByUser,
  getReportHoursByCard,
} from '../api/client.js';

function getCurrentWeekString() {
  const now = new Date();
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = ((now - oneJan) / 86400000) + oneJan.getDay() + 1;
  const week = Math.ceil(dayOfYear / 7);
  const weekStr = String(week).padStart(2, '0');
  return `${now.getFullYear()}-W${weekStr}`;
}

function formatShortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

function extractErrorMessage(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const loc = Array.isArray(d.loc) ? d.loc.join('.') : '';
        const msg = d.msg || 'Error';
        return `${loc}: ${msg}`;
      })
      .join(', ');
  }
  if (typeof detail === 'string') return detail;
  return fallback;
}

function downloadCsv(filename, rows, columns) {
  if (!rows || rows.length === 0) return;

  const header = columns.map((c) => c.label).join(',');
  const dataLines = rows.map((row) =>
    columns
      .map((c) => {
        const raw = c.accessor(row);
        const value = raw ?? '';
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(','),
  );

  const csvContent = [header, ...dataLines].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function ReportPage({ token, onLogout }) {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [week, setWeek] = useState(getCurrentWeekString());

  const [summary, setSummary] = useState(null);
  const [hoursByUser, setHoursByUser] = useState([]);
  const [hoursByCard, setHoursByCard] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadCounter, setReloadCounter] = useState(0);
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);

  // Cargar tableros desde la API
  useEffect(() => {
    const loadBoards = async () => {
      setError('');
      try {
        const data = await getBoards(token);
        setBoards(data || []);
        if (data && data.length > 0 && !selectedBoardId) {
          setSelectedBoardId(data[0].id);
        }
      } catch (err) {
        if (err && err.status === 304) {
          return;
        }
        setError(extractErrorMessage(err, 'Error cargando tableros'));
      }
    };
    loadBoards();
  }, [token]);

  // Cargar reporte con DATOS REALES desde la API
  useEffect(() => {
    const loadReport = async () => {
      if (!selectedBoardId || !week) return;
      
      console.log('📊 Cargando reporte REAL para:', {
        boardId: selectedBoardId,
        week: week
      });
      
      setLoading(true);
      setError('');
      
      try {
        // LLAMADAS REALES A LA API
        const [summaryData, usersData, cardsData] = await Promise.all([
          getReportSummary(token, selectedBoardId, week),
          getReportHoursByUser(token, selectedBoardId, week),
          getReportHoursByCard(token, selectedBoardId, week)
        ]);
        
        console.log('✅ Datos REALES cargados desde la API:', {
          summary: summaryData,
          users: usersData,
          cards: cardsData
        });
        
        setSummary(summaryData);
        setHoursByUser(usersData);
        setHoursByCard(cardsData);
        
      } catch (err) {
        console.error('❌ Error cargando datos reales:', err);
        const errMsg = extractErrorMessage(err, 'Error al cargar el informe desde el servidor');
        setError(errMsg);
        
        // Si hay error, inicializar con datos vacíos
        setSummary({
          completed: [],
          overdue: [],
          created: [],
          meta: {
            week_start: new Date().toISOString().split('T')[0],
            week_end: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            completed_prev_count: 0,
            overdue_prev_count: 0,
            created_prev_count: 0,
            done_list_name: 'No disponible',
            total_lists: 0
          }
        });
        setHoursByUser([]);
        setHoursByCard([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadReport();
  }, [token, selectedBoardId, week, reloadCounter]);

  const computedSummary = useMemo(() => {
    const mapRaw = (raw) => {
      if (Array.isArray(raw)) {
        return { count: raw.length, items: raw };
      }
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) {
        return { count: n, items: [] };
      }
      return { count: 0, items: [] };
    };

    const completedRaw = summary?.completed ?? summary?.completadas;
    const overdueRaw = summary?.overdue ?? summary?.vencidas;
    const createdRaw = summary?.created ?? summary?.nuevas;

    return {
      completed: mapRaw(completedRaw),
      overdue: mapRaw(overdueRaw),
      created: mapRaw(createdRaw),
    };
  }, [summary]);

  const meta = summary?.meta || null;

  const weekRangeLabel = useMemo(() => {
    if (!meta) return '';
    return `${formatShortDate(meta.week_start)} – ${formatShortDate(meta.week_end)}`;
  }, [meta]);

  const kpiDeltas = useMemo(() => {
    if (!meta) return null;
    const safe = (v) => (typeof v === 'number' ? v : Number(v) || 0);
    const createdPrev = safe(meta.created_prev_count);
    const completedPrev = safe(meta.completed_prev_count);
    const overduePrev = safe(meta.overdue_prev_count);

    return {
      created: {
        prev: createdPrev,
        diff: computedSummary.created.count - createdPrev,
      },
      completed: {
        prev: completedPrev,
        diff: computedSummary.completed.count - completedPrev,
      },
      overdue: {
        prev: overduePrev,
        diff: computedSummary.overdue.count - overduePrev,
      },
    };
  }, [meta, computedSummary]);

  const topUsers = useMemo(() => {
    if (!hoursByUser || !hoursByUser.length) return [];
    return [...hoursByUser]
      .slice()
      .sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0))
      .slice(0, 3);
  }, [hoursByUser]);

  const topCards = useMemo(() => {
    if (!hoursByCard || !hoursByCard.length) return [];
    return [...hoursByCard]
      .slice()
      .sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0))
      .slice(0, 3);
  }, [hoursByCard]);

  const totalHoursUsers = useMemo(
    () => (hoursByUser || []).reduce((acc, u) => acc + (u.total_hours || 0), 0),
    [hoursByUser],
  );

  const totalHoursCards = useMemo(
    () => (hoursByCard || []).reduce((acc, c) => acc + (c.total_hours || 0), 0),
    [hoursByCard],
  );

  const filteredHoursByCard = useMemo(() => {
    if (!selectedUserEmail) return hoursByCard;
    const target = selectedUserEmail.toLowerCase();
    return (hoursByCard || []).filter((row) => {
      const email =
        row.user_email ||
        row.responsible ||
        row.owner ||
        row.assignee ||
        '';
      return email.toLowerCase() === target;
    });
  }, [hoursByCard, selectedUserEmail]);

  const maxUserHours = useMemo(
    () => (hoursByUser || []).reduce((max, u) => Math.max(max, u.total_hours || 0), 0),
    [hoursByUser],
  );

  const maxCardHours = useMemo(
    () => (filteredHoursByCard || []).reduce((max, c) => Math.max(max, c.total_hours || 0), 0),
    [filteredHoursByCard],
  );

  const handleExportUsers = () => {
    if (!hoursByUser.length) return;
    downloadCsv('reporte_horas_por_usuario.csv', hoursByUser, [
      { label: 'Usuario', accessor: (r) => r.user_name || r.user || r.user_email || r.email || r.user_id },
      { label: 'Total horas', accessor: (r) => r.total_hours },
      { label: 'Nº tareas', accessor: (r) => r.tasks_count },
    ]);
  };

  const handleExportCards = () => {
    if (!hoursByCard.length) return;
    downloadCsv('reporte_horas_por_tarjeta.csv', hoursByCard, [
      { label: 'Tarjeta', accessor: (r) => r.title || r.titulo || r.card_title },
      { label: 'Responsable', accessor: (r) => r.responsible || r.owner || r.assignee },
      { label: 'Estado', accessor: (r) => r.estado || r.status },
      { label: 'Total horas', accessor: (r) => r.total_hours },
    ]);
  };

  const formatBadgeStatus = (status) => {
    if (!status) return '';
    return String(status);
  };

  const renderTaskItem = (task, color) => {
    return (
      <li key={task.id || task.title} className="report-task-item">
        <div className="report-task-main">
          <span className="report-task-title">{task.title || task.titulo}</span>
          <span className={`report-badge report-badge-${color}`}>
            {formatBadgeStatus(task.status || task.estado || '')}
          </span>
        </div>
        <div className="report-task-meta">
          <span>{task.responsible || task.owner || task.assignee || 'Sin responsable'}</span>
        </div>
      </li>
    );
  };

  return (
    <div className="report-layout">
      <aside className="sidebar">
        <div className="sidebar-header" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', // Centra horizontalmente
          padding: '20px 15px',
          gap: '15px' // Espacio entre logo y botón
        }}>
          <h1 className="neocare-logo" style={{ 
            fontSize: '1.5rem', 
            letterSpacing: '2px', 
            margin: 0 // Elimina margin-bottom
          }}>
            NEOCARE
          </h1>
          
          {/* Botón CERRAR SESIÓN: Centrado horizontalmente */}
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
          <h3 style={{ marginTop: 0, fontSize: '0.9rem', color: '#94a3b8' }}>Tableros</h3>
          <ul className="board-list" style={{ listStyle: 'none', padding: 0 }}>
            {boards.map((board) => (
              <li
                key={board.id}
                className={board.id === selectedBoardId ? 'active' : ''}
                style={{
                  marginBottom: '8px',
                  padding: '8px',
                  borderRadius: '6px',
                  background: board.id === selectedBoardId ? '#1e293b' : 'transparent',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedBoardId(board.id)}
              >
                {board.title}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="board-main">
        <header className="report-header">
          <div>
            <h1 style={{ marginBottom: '8px' }}>Informe semanal</h1>
            <p style={{ margin: 0, color: '#05f3f3', fontSize: '0.9rem' }}>
              Visualiza tareas completadas, vencidas, nuevas y horas trabajadas por persona y tarjeta.
            </p>
          </div>
          <div className="report-actions">
            <button
              type="button"
              className="report-back-btn"
              onClick={() => navigate('/')}
            >
              ← Volver al tablero
            </button>
            <button
              type="button"
              className={`report-refresh-btn ${loading ? 'is-loading' : ''}`}
              onClick={() => setReloadCounter((c) => c + 1)}
              disabled={loading}
            >
              {loading && <span className="report-refresh-spinner" />}
              <span>{loading ? 'Actualizando…' : 'Actualizar datos'}</span>
            </button>
            <div className="report-filters" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px' 
            }}>
              <input
                type="week"
                value={week}
                onChange={(e) => setWeek(e.target.value)}
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
                  e.currentTarget.style.background = '#13e7d6';
                  e.currentTarget.style.outline = 'none';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = '1px solid #334155';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.background = '#0f172a';
                }}
              />
            </div>
          </div>
        </header>

        {weekRangeLabel && !loading && !error && (
          <p style={{ 
            marginTop: '-8px', 
            marginBottom: '16px', 
            color: '#01fcef', 
            fontSize: '0.8rem',
            fontWeight: '500',
            background: 'rgba(1, 252, 239, 0.1)',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(1, 252, 239, 0.2)',
            display: 'inline-block'
          }}>
            📅 Semana seleccionada: <strong>{weekRangeLabel}</strong>
          </p>
        )}

        {loading && <p>Cargando informe...</p>}
        
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <>
            <section className="report-section">
              <h2>1. Resumen de la semana</h2>
              <div className="report-summary-grid">
                <div className="report-card">
                  <h3>Completadas</h3>
                  <p className="report-kpi">
                    {computedSummary.completed.count}
                    {kpiDeltas &&
                      computedSummary.completed.count > 0 &&
                      kpiDeltas.completed.diff !== 0 && (
                      <span
                        className={`report-kpi-delta ${
                          kpiDeltas.completed.diff >= 0 ? 'up' : 'down'
                        }`}
                      >
                        {kpiDeltas.completed.diff >= 0 ? '+' : ''}
                        {kpiDeltas.completed.diff}
                      </span>
                    )}
                  </p>
                  {computedSummary.completed.count === 0 ? (
                    <p className="report-empty">No hubo tareas completadas esta semana.</p>
                  ) : (
                    <ul className="report-task-list">
                      {computedSummary.completed.items.slice(0, 5).map((t) =>
                        renderTaskItem(t, 'green'),
                      )}
                    </ul>
                  )}
                </div>

                <div className="report-card">
                  <h3>Vencidas</h3>
                  <p className="report-kpi">
                    {computedSummary.overdue.count}
                    {kpiDeltas &&
                      computedSummary.overdue.count > 0 &&
                      kpiDeltas.overdue.diff !== 0 && (
                      <span
                        className={`report-kpi-delta ${
                          kpiDeltas.overdue.diff >= 0 ? 'up' : 'down'
                        }`}
                      >
                        {kpiDeltas.overdue.diff >= 0 ? '+' : ''}
                        {kpiDeltas.overdue.diff}
                      </span>
                    )}
                  </p>
                  {computedSummary.overdue.count === 0 ? (
                    <p className="report-empty">No hubo tareas vencidas esta semana.</p>
                  ) : (
                    <ul className="report-task-list">
                      {computedSummary.overdue.items.slice(0, 5).map((t) =>
                        renderTaskItem(t, 'red'),
                      )}
                    </ul>
                  )}
                </div>

                <div className="report-card">
                  <h3>Nuevas</h3>
                  <p className="report-kpi">
                    {computedSummary.created.count}
                    {kpiDeltas &&
                      computedSummary.created.count > 0 &&
                      kpiDeltas.created.diff !== 0 && (
                      <span
                        className={`report-kpi-delta ${
                          kpiDeltas.created.diff >= 0 ? 'up' : 'down'
                        }`}
                      >
                        {kpiDeltas.created.diff >= 0 ? '+' : ''}
                        {kpiDeltas.created.diff}
                      </span>
                    )}
                  </p>
                  {computedSummary.created.count === 0 ? (
                    <p className="report-empty">No hubo nuevas tareas esta semana.</p>
                  ) : (
                    <ul className="report-task-list">
                      {computedSummary.created.items.slice(0, 5).map((t) =>
                        renderTaskItem(t, 'blue'),
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            {(topUsers.length > 0 || topCards.length > 0) && (
              <section className="report-section">
                <div className="report-summary-grid">
                  {topUsers.length > 0 && (
                    <div className="report-card">
                      <h3>Top personas por horas</h3>
                      <ul className="report-task-list">
                        {topUsers.map((u) => (
                          <li
                            key={u.user_id || u.user_email}
                            className="report-task-item"
                          >
                            <div className="report-task-main">
                              <span className="report-task-title">
                                {u.user_name || u.user_email || u.email || u.user_id}
                              </span>
                              <span className="report-badge report-badge-blue">
                                {u.total_hours}h
                              </span>
                            </div>
                            <div className="report-task-meta">
                              <span>{u.tasks_count} tareas</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {topCards.length > 0 && (
                    <div className="report-card">
                      <h3>Top tarjetas por horas</h3>
                      <ul className="report-task-list">
                        {topCards.map((c) => (
                          <li
                            key={c.card_id || c.id}
                            className="report-task-item"
                          >
                            <div className="report-task-main">
                              <span className="report-task-title">
                                {c.title || c.titulo || c.card_title}
                              </span>
                              <span className="report-badge report-badge-green">
                                {c.total_hours}h
                              </span>
                            </div>
                            <div className="report-task-meta">
                              <span>
                                {c.responsible || c.owner || c.assignee || 'Sin responsable'}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="report-section">
              <div className="report-section-header">
                <h2>2. Horas por persona</h2>
                <button className="export-btn" onClick={handleExportUsers} disabled={!hoursByUser.length}>
                  Exportar CSV
                </button>
              </div>
              {hoursByUser.length === 0 ? (
                <p className="report-empty">No hay horas registradas para esta semana.</p>
              ) : (
                <div className="report-table-wrapper">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Total horas</th>
                        <th>Nº tareas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hoursByUser.map((row) => {
                        const email =
                          row.user_name || row.user || row.email || row.user_id;
                        const rowEmail = row.user_email || row.email || '';
                        const isTop = maxUserHours > 0 && (row.total_hours || 0) === maxUserHours;
                        const isSelected =
                          selectedUserEmail &&
                          selectedUserEmail.toLowerCase() === rowEmail.toLowerCase();
                        return (
                          <tr
                            key={row.user_id || row.user_name || row.email}
                            className={`${isTop ? 'report-row-highlight' : ''} ${
                              isSelected ? 'report-row-selected' : ''
                            }`}
                            onClick={() =>
                              setSelectedUserEmail((current) => {
                                const target = rowEmail || '';
                                if (
                                  current &&
                                  current.toLowerCase() === target.toLowerCase()
                                ) {
                                  return null;
                                }
                                return target || null;
                              })
                            }
                            style={{ cursor: 'pointer' }}
                          >
                            <td>{email}</td>
                            <td>{row.total_hours}</td>
                            <td>{row.tasks_count}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>Total</td>
                        <td style={{ fontWeight: 'bold' }}>{totalHoursUsers.toFixed(1)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>

            <section className="report-section">
              <div className="report-section-header">
                <h2>3. Horas por tarjeta</h2>
                <button className="export-btn" onClick={handleExportCards} disabled={!hoursByCard.length}>
                  Exportar CSV
                </button>
              </div>
              {selectedUserEmail && (
                <p className="report-filter-chip">
                  Filtrando tarjetas por: <strong>{selectedUserEmail}</strong>
                  <button
                    type="button"
                    className="chip-clear-btn"
                    onClick={() => setSelectedUserEmail(null)}
                  >
                    Quitar filtro
                  </button>
                </p>
              )}
              {hoursByCard.length === 0 ? (
                <p className="report-empty">No hay horas registradas por tarjeta en esta semana.</p>
              ) : (
                <div className="report-table-wrapper">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Tarjeta</th>
                        <th>Responsable</th>
                        <th>Estado</th>
                        <th>Total horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHoursByCard.map((row) => {
                        const isTop =
                          maxCardHours > 0 && (row.total_hours || 0) === maxCardHours;
                        return (
                          <tr
                            key={row.card_id || row.id}
                            className={isTop ? 'report-row-highlight' : ''}
                          >
                            <td>{row.title || row.titulo || row.card_title}</td>
                            <td>
                              {row.responsible || row.owner || row.assignee || 'Sin responsable'}
                            </td>
                            <td>{row.estado || row.status}</td>
                            <td>{row.total_hours}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>Total</td>
                        <td></td>
                        <td></td>
                        <td style={{ fontWeight: 'bold' }}>{totalHoursCards.toFixed(1)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default ReportPage;