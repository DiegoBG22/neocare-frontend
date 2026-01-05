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
  const [week, setWeek] = useState(getCurrentWeekString);

  const [summary, setSummary] = useState(null);
  const [hoursByUser, setHoursByUser] = useState([]);
  const [hoursByCard, setHoursByCard] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    const loadReport = async () => {
      if (!selectedBoardId || !week) return;
      setLoading(true);
      setError('');
      try {
        const [s, u, c] = await Promise.all([
          getReportSummary(token, selectedBoardId, week),
          getReportHoursByUser(token, selectedBoardId, week),
          getReportHoursByCard(token, selectedBoardId, week),
        ]);
        setSummary(s || null);
        setHoursByUser(Array.isArray(u) ? u : []);
        setHoursByCard(Array.isArray(c) ? c : []);
      } catch (err) {
        if (err && err.status === 304) {
          return;
        }
        setError(extractErrorMessage(err, 'Error cargando informe semanal (¿backend listo?)'));
        setSummary(null);
        setHoursByUser([]);
        setHoursByCard([]);
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [token, selectedBoardId, week]);

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
        <div className="sidebar-header">
          <h1 className="neocare-logo" style={{ fontSize: '1.5rem', letterSpacing: '2px', marginBottom: '20px' }}>
            NEOCARE
          </h1>
          <button
            onClick={onLogout}
            style={{
              background: 'transparent',
              border: '1px solid #ef4444',
              color: '#ef4444',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Salir
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
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
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
            <div className="report-filters">
              <label className="report-filter">
                <span>Semana</span>
                <input
                  type="week"
                  value={week}
                  onChange={(e) => setWeek(e.target.value)}
                />
              </label>
            </div>
          </div>
        </header>

        {loading && <p>Cargando informe...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <>
            <section className="report-section">
              <h2>1. Resumen de la semana</h2>
              <div className="report-summary-grid">
                <div className="report-card">
                  <h3>Completadas</h3>
                  <p className="report-kpi">{computedSummary.completed.count}</p>
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
                  <p className="report-kpi">{computedSummary.overdue.count}</p>
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
                  <p className="report-kpi">{computedSummary.created.count}</p>
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
                      {hoursByUser.map((row) => (
                        <tr key={row.user_id || row.user_name || row.email}>
                          <td>{row.user_name || row.user || row.email || row.user_id}</td>
                          <td>{row.total_hours}</td>
                          <td>{row.tasks_count}</td>
                        </tr>
                      ))}
                    </tbody>
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
                      {hoursByCard
                        .slice()
                        .sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0))
                        .map((row) => (
                          <tr key={row.card_id || row.id}>
                            <td>{row.title || row.titulo || row.card_title}</td>
                            <td>{row.responsible || row.owner || row.assignee || 'Sin responsable'}</td>
                            <td>{row.estado || row.status}</td>
                            <td>{row.total_hours}</td>
                          </tr>
                        ))}
                    </tbody>
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
