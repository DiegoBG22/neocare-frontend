import React, { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import BoardPage from './pages/BoardPage.jsx';

function App() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('authToken');
    if (saved) setToken(saved);
  }, []);

  const handleLogin = (newToken) => {
    setToken(newToken);
    localStorage.setItem('authToken', newToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('authToken');
  };

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <BoardPage token={token} onLogout={handleLogout} />;
}

export default App;
