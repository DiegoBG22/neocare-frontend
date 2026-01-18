// EN App.jsx, cambia el componente completo por:

import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import BoardPage from './pages/BoardPage.jsx';
import ReportPage from './pages/ReportPage.jsx';

function App() {
  const [token, setToken] = useState(null);
  const [reportConfig, setReportConfig] = useState({
    boardId: null,
    week: '',
    filters: {
      responsible: '',
      searchQuery: '',
    }
  });

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

  return (
    <Routes>
      <Route
        path="/"
        element={
          <BoardPage 
            token={token} 
            onLogout={handleLogout}
            setReportConfig={setReportConfig}
          />
        }
      />
      <Route
        path="/report"
        element={
          <ReportPage 
            token={token} 
            onLogout={handleLogout}
            initialConfig={reportConfig}
            setReportConfig={setReportConfig}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;