import React, { useState } from 'react';
import { login, register } from '../api/client.js';

function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(email, password);
      }
      const data = await login(email, password);
      onLogin(data.access_token);
    } catch (err) {
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* SECCIÓN DEL LOGO CON EL EFECTO DE LUZ */}
      <h1 className="neocare-logo">Neocare</h1>
      
      <h2>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>

      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading
            ? 'Cargando...'
            : mode === 'login'
            ? 'Entrar'
            : 'Registrarme y entrar'}
        </button>
      </form>

      <button
        type="button"
        className="link-button"
        onClick={() =>
          setMode(mode === 'login' ? 'register' : 'login')
        }
      >
        {mode === 'login'
          ? '¿No tienes cuenta? Regístrate'
          : '¿Ya tienes cuenta? Inicia sesión'}
      </button>
    </div>
  );
}

export default LoginPage;