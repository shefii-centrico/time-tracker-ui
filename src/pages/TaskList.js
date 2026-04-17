import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = () => {
    setLoading(true);
    api.get('/tasks')
      .then((res) => setTasks(res.data))
      .catch(() => setError('Failed to load tasks. Is the backend running?'))
      .finally(() => setLoading(false));
  };

  const updateStatus = (task, newStatus) => {
    api.put(`/tasks/${task.id}`, { ...task, status: newStatus })
      .then(() => fetchTasks())
      .catch(() => alert('Failed to update status'));
  };

  const deleteTask = (id) => {
    if (!window.confirm('Delete this task?')) return;
    api.delete(`/tasks/${id}`)
      .then(() => fetchTasks())
      .catch(() => alert('Failed to delete task'));
  };

  const handleLogout = () => {
    localStorage.removeItem('tt_token');
    localStorage.removeItem('tt_user');
    navigate('/');
  };

  const statusOptions = ['TODO', 'IN_PROGRESS', 'DONE'];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Task List</h2>
        <div>
          <button onClick={() => navigate('/add-task')} style={styles.btnPrimary}>+ New Task</button>
          <button onClick={() => navigate('/log-time')} style={{ ...styles.btnPrimary, marginLeft: '8px', background: '#52c41a' }}>Log Time</button>
          <button onClick={() => navigate('/time-logs')} style={{ ...styles.btnPrimary, marginLeft: '8px', background: '#722ed1' }}>View Time Logs</button>
          <button onClick={handleLogout} style={{ ...styles.btnPrimary, marginLeft: '8px', background: '#ff4d4f' }}>Logout</button>
        </div>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && tasks.length === 0 && <p>No tasks yet. Create one!</p>}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Title</th>
            <th style={styles.th}>Description</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Change Status</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td style={styles.td}>{task.id}</td>
              <td style={styles.td}>{task.title}</td>
              <td style={styles.td}>{task.description}</td>
              <td style={styles.td}>
                <span style={{ ...styles.badge, background: statusColor(task.status) }}>
                  {task.status}
                </span>
              </td>
              <td style={styles.td}>
                <select
                  value={task.status}
                  onChange={(e) => updateStatus(task, e.target.value)}
                  style={styles.select}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td style={styles.td}>
                <button onClick={() => navigate(`/edit-task/${task.id}`)} style={styles.btnEdit}>Edit</button>
                <button onClick={() => deleteTask(task.id)} style={styles.btnDelete}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const statusColor = (status) => {
  if (status === 'DONE') return '#52c41a';
  if (status === 'IN_PROGRESS') return '#1890ff';
  return '#faad14';
};

const styles = {
  container: { padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  btnPrimary: { padding: '8px 16px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  btnEdit: { padding: '4px 10px', background: '#fa8c16', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '6px' },
  btnDelete: { padding: '4px 10px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: '#fafafa', padding: '10px', border: '1px solid #ddd', textAlign: 'left' },
  td: { padding: '10px', border: '1px solid #ddd' },
  badge: { padding: '2px 8px', borderRadius: '10px', color: '#fff', fontSize: '0.85em' },
  select: { padding: '4px', borderRadius: '4px', border: '1px solid #ccc' },
};

export default TaskList;
