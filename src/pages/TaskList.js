import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const role = localStorage.getItem('tt_role');

  useEffect(() => {
    fetchTasks();
    // Load employees list for assign dropdown — works for both ADMIN and TEAM_LEAD
    if (role === 'ADMIN' || role === 'TEAM_LEAD' || role === 'PROJECT_MANAGER') {
      api.get('/tasks/assignable-users').then((res) => setUsers(res.data)).catch(() => {});
    }
  }, []);

  const fetchTasks = () => {
    setLoading(true);
    api.get('/tasks')
      .then((res) => setTasks(res.data))
      .catch(() => setError('Failed to load tasks. Is the backend running?'))
      .finally(() => setLoading(false));
  };

  const updateStatus = (task, newStatus) => {
    api.put(`/tasks/${task.id}`, { title: task.title, description: task.description, status: newStatus })
      .then(() => fetchTasks())
      .catch(() => alert('Failed to update status'));
  };

  const assignTask = (taskId, userId) => {
    if (!userId) return;
    api.put(`/tasks/${taskId}/assign?userId=${userId}`)
      .then(() => fetchTasks())
      .catch(() => alert('Failed to assign task'));
  };

  const deleteTask = (id) => {
    if (!window.confirm('Delete this task and all its time logs?')) return;
    api.delete(`/tasks/${id}`)
      .then(() => fetchTasks())
      .catch(() => alert('Failed to delete task'));
  };

  const handleLogout = () => { localStorage.clear(); navigate('/'); };

  const statusOptions = ['TODO', 'IN_PROGRESS', 'DONE'];
  const employees = users.filter((u) => u.role === 'EMPLOYEE');
  const canAssign = role === 'ADMIN' || role === 'TEAM_LEAD' || role === 'PROJECT_MANAGER';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>All Tasks</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => navigate('/add-task')} style={styles.btnPrimary}>+ New Task</button>
          <button onClick={() => navigate('/time-logs')} style={{ ...styles.btnPrimary, background: '#722ed1' }}>Time Logs</button>
          {role === 'ADMIN' && (
            <button onClick={() => navigate('/admin/users')} style={{ ...styles.btnPrimary, background: '#fa8c16' }}>Users</button>
          )}
          <button onClick={() => navigate('/dashboard')} style={styles.btnSecondary}>Dashboard</button>
          <button onClick={handleLogout} style={styles.btnDanger}>Logout</button>
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
            <th style={styles.th}>Priority</th>
            <th style={styles.th}>Due Date</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Assigned To</th>
            <th style={styles.th}>Created By</th>
            <th style={styles.th}>Change Status</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td style={styles.td}>{task.id}</td>
              <td style={styles.td}>
                <div style={{ fontWeight: 600 }}>{task.title}</div>
                {task.description && <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>{task.description}</div>}
              </td>
              <td style={styles.td}>
                {task.priority ? (
                  <span style={{ ...styles.badge, background: priorityColor(task.priority) }}>{task.priority}</span>
                ) : '—'}
              </td>
              <td style={styles.td}>
                {task.dueDate ? (
                  <span style={{ color: isDueSoon(task.dueDate, task.status) }}>{task.dueDate}</span>
                ) : '—'}
              </td>
              <td style={styles.td}>
                <span style={{ ...styles.badge, background: statusColor(task.status) }}>
                  {task.status}
                </span>
              </td>
              <td style={styles.td}>
                {canAssign && employees.length > 0 ? (
                  <select
                    value={task.assignedTo?.id || ''}
                    onChange={(e) => assignTask(task.id, e.target.value)}
                    style={styles.select}
                  >
                    <option value="">— Unassigned —</option>
                    {employees.map((u) => (
                      <option key={u.id} value={u.id}>{u.fullName || u.username}</option>
                    ))}
                  </select>
                ) : (
                  task.assignedTo?.fullName || '—'
                )}
              </td>
              <td style={styles.td}>{task.createdBy?.fullName || '—'}</td>
              <td style={styles.td}>
                <select value={task.status} onChange={(e) => updateStatus(task, e.target.value)} style={styles.select}>
                  {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
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

const priorityColor = (priority) => {
  if (priority === 'HIGH') return '#ff4d4f';
  if (priority === 'MEDIUM') return '#faad14';
  return '#52c41a';
};

const isDueSoon = (dueDate, status) => {
  if (status === 'DONE') return '#aaa';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((new Date(dueDate) - today) / 86400000);
  if (diff < 0) return '#ff4d4f';
  if (diff <= 3) return '#fa8c16';
  return '#333';
};

const styles = {
  container: { padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  btnPrimary: { padding: '8px 16px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  btnSecondary: { padding: '8px 16px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' },
  btnDanger: { padding: '8px 16px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  btnEdit: { padding: '4px 10px', background: '#fa8c16', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '6px' },
  btnDelete: { padding: '4px 10px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: '#fafafa', padding: '10px', border: '1px solid #ddd', textAlign: 'left' },
  td: { padding: '10px', border: '1px solid #ddd' },
  badge: { padding: '2px 8px', borderRadius: '10px', color: '#fff', fontSize: '0.85em' },
  select: { padding: '4px', borderRadius: '4px', border: '1px solid #ccc' },
};

export default TaskList;

