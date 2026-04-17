import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function LogTime() {
  const [taskId, setTaskId] = useState('');
  const [hours, setHours] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    api.post('/time-logs', {
      taskId: Number(taskId),
      hours: Number(hours),
      date,
    })
      .then(() => {
        setMessage('Time logged successfully!');
        setTaskId('');
        setHours('');
      })
      .catch(() => setError('Failed to log time. Is the backend running?'));
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Log Time</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label>Task ID *</label>
            <input
              type="number"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              required
              min={1}
              placeholder="Enter task ID from the task list"
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label>Hours *</label>
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
              min={0.1}
              step={0.5}
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
            <button type="submit" style={styles.btnPrimary}>Log Time</button>
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
