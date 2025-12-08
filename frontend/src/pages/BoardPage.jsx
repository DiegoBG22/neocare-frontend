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
