import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function TimeLogs() {
  const [logs, setLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [filterTaskId, setFilterTaskId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/tasks').then((res) => setTasks(res.data)).catch(() => {});
    fetchLogs('');
  }, []);

  const fetchLogs = (taskId) => {
    setLoading(true);
    const url = taskId ? `/time-logs?taskId=${taskId}` : '/time-logs';
    api.get(url)
      .then((res) => setLogs(res.data))
      .catch(() => setError('Failed to load time logs.'))
      .finally(() => setLoading(false));
  };

  const handleFilter = (e) => {
    const val = e.target.value;
    setFilterTaskId(val);
    fetchLogs(val);
  };

  const deleteLog = (id) => {
    if (!window.confirm('Delete this time log?')) return;
    api.delete(`/time-logs/${id}`)
      .then(() => fetchLogs(filterTaskId))
      .catch(() => alert('Failed to delete time log'));
  };

  const taskTitle = (taskId) => {
    const t = tasks.find((t) => t.id === taskId);
    return t ? t.title : `Task #${taskId}`;
  };

  const totalHours = logs.reduce((sum, l) => sum + (l.hours || 0), 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Time Logs</h2>
        <button onClick={() => navigate('/tasks')} style={styles.btnSecondary}>← Back to Tasks</button>
      </div>

      <div style={styles.filterRow}>
        <label>Filter by Task: </label>
        <select value={filterTaskId} onChange={handleFilter} style={styles.select}>
          <option value="">All Tasks</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>#{t.id} — {t.title}</option>
          ))}
        </select>
        <span style={styles.total}>Total: <strong>{totalHours.toFixed(2)} hrs</strong></span>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && logs.length === 0 && <p>No time logs found.</p>}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Task</th>
            <th style={styles.th}>Logged By</th>
            <th style={styles.th}>Hours</th>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td style={styles.td}>{log.id}</td>
              <td style={styles.td}>{log.task ? taskTitle(log.task.id) : '—'}</td>
              <td style={styles.td}>{log.user?.fullName || log.user?.username || '—'}</td>
              <td style={styles.td}>{log.hours}</td>
              <td style={styles.td}>{log.date}</td>
              <td style={styles.td}>
                <button onClick={() => deleteLog(log.id)} style={styles.btnDelete}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  container: { padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  filterRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' },
  total: { marginLeft: 'auto', fontSize: '1rem' },
  btnSecondary: { padding: '8px 16px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' },
  btnDelete: { padding: '4px 10px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: '#fafafa', padding: '10px', border: '1px solid #ddd', textAlign: 'left' },
  td: { padding: '10px', border: '1px solid #ddd' },
  select: { padding: '6px', borderRadius: '4px', border: '1px solid #ccc' },
};

export default TimeLogs;
