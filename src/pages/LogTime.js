import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const parseError = (err) => {
  const data = err?.response?.data;
  if (!data) return 'Cannot reach server. Is the backend running?';
  if (typeof data === 'object') return Object.values(data).join(', ');
  return String(data);
};

function LogTime() {
  const [tasks, setTasks] = useState([]);
  const [taskId, setTaskId] = useState('');
  const [hours, setHours] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/tasks')
      .then((res) => {
        setTasks(res.data);
        if (res.data.length > 0) setTaskId(res.data[0].id);
      })
      .catch(() => setError('Failed to load tasks.'));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    api.post(`/time-logs?taskId=${Number(taskId)}`, {
      hours: Number(hours),
      date,
    })
      .then(() => {
        setMessage('Time logged successfully!');
        setHours('');
      })
      .catch((err) => setError(parseError(err)))
      .finally(() => setSubmitting(false));
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Log Time</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label>Task *</label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              required
              style={styles.input}
            >
              {tasks.length === 0 && <option value="">No tasks available</option>}
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>#{t.id} — {t.title}</option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label>Hours *</label>
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
              min={0.01}
              step="any"
              placeholder="e.g. 2.5"
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label>Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          {message && <p style={{ color: 'green' }}>{message}</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" disabled={submitting} style={styles.btnPrimary}>
              {submitting ? 'Logging...' : 'Log Time'}
            </button>
            <button type="button" onClick={() => navigate('/tasks')} style={styles.btnSecondary}>Back to Tasks</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', padding: '2rem' },
  card: { background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', width: '480px' },
  field: { marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' },
  input: { padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' },
  btnPrimary: { padding: '10px 20px', background: '#52c41a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' },
  btnSecondary: { padding: '10px 20px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' },
};

export default LogTime;
