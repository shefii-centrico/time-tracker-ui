import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function AddTask() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('TODO');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    api.post('/tasks', { title, description, status })
      .then(() => navigate('/tasks'))
      .catch(() => setError('Failed to create task. Is the backend running?'));
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>New Task</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.input}>
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="DONE">DONE</option>
            </select>
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" style={styles.btnPrimary}>Create Task</button>
            <button type="button" onClick={() => navigate('/tasks')} style={styles.btnSecondary}>Cancel</button>
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
  btnPrimary: { padding: '10px 20px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' },
  btnSecondary: { padding: '10px 20px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' },
};

export default AddTask;
