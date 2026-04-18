import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const parseError = (err) => {
  const data = err?.response?.data;
  if (!data) return 'Cannot reach server. Is the backend running?';
  if (typeof data === 'object') return Object.values(data).join(', ');
  return String(data);
};

function AddTask() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('TODO');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/tasks/assignable-users')
      .then((res) => setEmployees(res.data))
      .catch(() => {});
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const payload = { title, description, status, priority };
    if (dueDate) payload.dueDate = dueDate;
    if (assignedToId) payload.assignedToId = Number(assignedToId);
    api.post('/tasks', payload)
      .then((res) => {
        // If user selected an assignee and backend doesn't auto-assign at create, call assign
        if (assignedToId) {
          return api.put(`/tasks/${res.data.id}/assign?userId=${assignedToId}`);
        }
      })
      .then(() => navigate('/tasks'))
      .catch((err) => setError(parseError(err)))
      .finally(() => setSubmitting(false));
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
          <div style={styles.field}>
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={styles.input}>
              <option value="HIGH">🔴 HIGH</option>
              <option value="MEDIUM">🟡 MEDIUM</option>
              <option value="LOW">🟢 LOW</option>
            </select>
          </div>
          <div style={styles.field}>
            <label>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={styles.input} />
          </div>
          {employees.length > 0 && (
            <div style={styles.field}>
              <label>Assign To</label>
              <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} style={styles.input}>
                <option value="">— Unassigned —</option>
                {employees.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName || u.username}</option>
                ))}
              </select>
            </div>
          )}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" disabled={submitting} style={styles.btnPrimary}>
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
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
