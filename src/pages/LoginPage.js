import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('tt_token', data.token);
        localStorage.setItem('tt_user', data.username);
        localStorage.setItem('tt_role', data.role);
        localStorage.setItem('tt_fullName', data.fullName || data.username);
        navigate(data.role === 'EMPLOYEE' ? '/my-tasks' : data.role === 'TEAM_LEAD' ? '/tl-dashboard' : '/dashboard');
      } else {
        setError('Invalid username or password.');
      }
    } catch (err) {
      setError('Cannot reach the server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Time Tracker</h2>
        <p style={{ color: '#888', marginBottom: '1.5rem' }}>Sign in to continue</p>
        <form onSubmit={handleLogin}>
          <div style={styles.field}>
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p style={{ fontSize: '0.8em', color: '#aaa', marginTop: '1rem' }}>
          Default: admin / admin123
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' },
  card: { background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', width: '320px' },
  field: { marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' },
  input: { padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' },
  button: { width: '100%', padding: '10px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer' },
};

export default LoginPage;

