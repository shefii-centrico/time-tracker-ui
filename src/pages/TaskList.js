import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const PAGE_SIZE = 15;

function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const role = localStorage.getItem('tt_role');

  useEffect(() => {
    fetchTasks();
    if (role === 'ADMIN' || role === 'TEAM_LEAD') {
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

  const exportCSV = () => {
    const headers = ['ID', 'Title', 'Description', 'Priority', 'Due Date', 'Status', 'Assigned To', 'Created By'];
    const rows = filtered.map(t => [
      t.id, `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.priority || '', t.dueDate || '', t.status,
      t.assignees?.map(u => u.fullName || u.username).join('; ') || '', t.createdBy?.fullName || ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'tasks.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const statusOptions = ['TODO', 'IN_PROGRESS', 'DONE'];
  const employees = users.filter((u) => u.role === 'EMPLOYEE');
  const canAssign = role === 'ADMIN' || role === 'TEAM_LEAD';

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title?.toLowerCase().includes(search.toLowerCase()) &&
          !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterAssignee) {
        if (filterAssignee === '__unassigned__') { if (t.assignees?.length > 0) return false; }
        else if (!t.assignees?.some(a => String(a.id) === filterAssignee)) return false;
      }
      return true;
    });
  }, [tasks, search, filterStatus, filterPriority, filterAssignee]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => { setSearch(''); setFilterStatus(''); setFilterPriority(''); setFilterAssignee(''); setPage(1); };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>📋 All Tasks <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 400 }}>({filtered.length} of {tasks.length})</span></h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/add-task')} style={styles.btnPrimary}>+ New Task</button>
          <button onClick={() => navigate('/time-logs')} style={{ ...styles.btnPrimary, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>Time Logs</button>
          {role === 'ADMIN' && (
            <button onClick={() => navigate('/admin/users')} style={{ ...styles.btnPrimary, background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>Users</button>
          )}
          <button onClick={exportCSV} style={{ ...styles.btnPrimary, background: 'linear-gradient(135deg,#13c2c2,#0891b2)' }}>⬇ CSV</button>
          <button onClick={() => navigate('/dashboard')} style={styles.btnSecondary}>Dashboard</button>
          <button onClick={handleLogout} style={styles.btnDanger}>Logout</button>
        </div>
      </div>
      <div style={{ padding: '0 1.5rem' }}>

      {/* Filter bar */}
      <div style={styles.filterBar}>
        <input
          placeholder="🔍 Search title or description..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ ...styles.filterInput, flex: 2, minWidth: '180px' }}
        />
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={styles.filterInput}>
          <option value="">All Statuses</option>
          <option value="TODO">TODO</option>
          <option value="IN_PROGRESS">IN PROGRESS</option>
          <option value="DONE">DONE</option>
        </select>
        <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1); }} style={styles.filterInput}>
          <option value="">All Priorities</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>
        {canAssign && (
          <select value={filterAssignee} onChange={e => { setFilterAssignee(e.target.value); setPage(1); }} style={styles.filterInput}>
            <option value="">All Assignees</option>
            <option value="__unassigned__">— Unassigned —</option>
            {employees.map(u => <option key={u.id} value={u.id}>{u.fullName || u.username}</option>)}
          </select>
        )}
        {(search || filterStatus || filterPriority || filterAssignee) && (
          <button onClick={clearFilters} style={styles.btnClear}>✕ Clear</button>
        )}
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && filtered.length === 0 && <p style={{ color: '#888' }}>No tasks match the current filters.</p>}

      {!loading && filtered.length > 0 && (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Priority</th>
                <th style={styles.th}>Due Date</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Env</th>
                <th style={styles.th}>Assigned To</th>
                <th style={styles.th}>Created By</th>
                <th style={styles.th}>Change Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((task) => (
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
                      {task.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {task.environment
                      ? <span style={{ ...styles.badge, background: ENV_COLORS[task.environment] || '#888' }}>{task.environment}</span>
                      : <span style={{ color: '#ccc', fontSize: '0.8rem' }}>—</span>}
                  </td>
                  <td style={styles.td}>
                    {task.assignees && task.assignees.length > 0
                      ? task.assignees.map(u => u.fullName || u.username).join(', ')
                      : <span style={{ color: '#bbb' }}>— Unassigned —</span>
                    }
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={styles.pageBtn}>‹ Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} style={{ ...styles.pageBtn, fontWeight: p === page ? 700 : 400, background: p === page ? '#7c3aed' : '#fff', color: p === page ? '#fff' : '#333' }}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={styles.pageBtn}>Next ›</button>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}

const statusColor = (status) => {
  if (status === 'DONE') return '#52c41a';
  if (status === 'IN_PROGRESS') return '#1890ff';
  return '#faad14';
};

const ENV_COLORS = { DEV: '#722ed1', TEST: '#fa8c16', PRE: '#1890ff', PRO: '#52c41a' };

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
  container: { padding: '0 0 2rem', background: '#f0f1f5', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, #0d0b1f 0%, #1a1535 100%)', padding: '0.85rem 1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(124,58,237,0.3)', boxShadow: '0 2px 12px rgba(0,0,0,0.25)', flexWrap: 'wrap', gap: '8px' },
  filterBar: { display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center', background: '#fff', padding: '12px 16px', borderRadius: '10px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: 'none' },
  filterInput: { padding: '7px 12px', borderRadius: '6px', border: '1px solid #e0e0ea', fontSize: '0.9rem', outline: 'none' },
  btnClear: { padding: '7px 12px', background: '#fff5f5', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
  btnPrimary: { padding: '8px 18px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  btnSecondary: { padding: '8px 16px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer' },
  btnDanger: { padding: '8px 16px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  btnEdit: { padding: '4px 12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '6px', fontWeight: 600 },
  btnDelete: { padding: '4px 12px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' },
  th: { background: '#1a1535', color: '#fff', padding: '11px 12px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f0f0f6', fontSize: '0.9rem' },
  badge: { padding: '2px 10px', borderRadius: '10px', color: '#fff', fontSize: '0.82em', fontWeight: 600 },
  select: { padding: '5px 8px', borderRadius: '6px', border: '1px solid #e0e0ea' },
  pagination: { display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '1rem' },
  pageBtn: { padding: '6px 14px', border: '1px solid #e0e0ea', borderRadius: '6px', cursor: 'pointer', background: '#fff', fontWeight: 500 },
};

export default TaskList;

