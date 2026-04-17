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
    const token = btoa(`${username}:${password}`);
    try {
      const response = await fetch('http://localhost:8080/tasks', {
        headers: { Authorization: `Basic ${token}` },
      });
      if (response.ok || response.status === 200) {
        localStorage.setItem('tt_token', token);
        localStorage.setItem('tt_user', username);
        navigate('/tasks');
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
        <h2>Time Tracker Login</h2>
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
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p style={{ fontSize: '0.8em', color: '#888' }}>
          use: mohammed / 1234
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
