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
      t.assignedTo?.fullName || '', t.createdBy?.fullName || ''
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
        if (filterAssignee === '__unassigned__') { if (t.assignedTo) return false; }
        else if (String(t.assignedTo?.id) !== filterAssignee) return false;
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
        <h2 style={{ margin: 0 }}>All Tasks <span style={{ color: '#888', fontSize: '0.9rem', fontWeight: 400 }}>({filtered.length} of {tasks.length})</span></h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/add-task')} style={styles.btnPrimary}>+ New Task</button>
          <button onClick={() => navigate('/time-logs')} style={{ ...styles.btnPrimary, background: '#722ed1' }}>Time Logs</button>
          {role === 'ADMIN' && (
            <button onClick={() => navigate('/admin/users')} style={{ ...styles.btnPrimary, background: '#fa8c16' }}>Users</button>
          )}
          <button onClick={exportCSV} style={{ ...styles.btnPrimary, background: '#13c2c2' }}>⬇ CSV</button>
          <button onClick={() => navigate('/dashboard')} style={styles.btnSecondary}>Dashboard</button>
          <button onClick={handleLogout} style={styles.btnDanger}>Logout</button>
        </div>
      </div>

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

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={styles.pageBtn}>‹ Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} style={{ ...styles.pageBtn, fontWeight: p === page ? 700 : 400, background: p === page ? '#1890ff' : '#fff', color: p === page ? '#fff' : '#333' }}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={styles.pageBtn}>Next ›</button>
            </div>
          )}
        </>
      )}
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' },
  filterBar: { display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center', background: '#fafafa', padding: '12px', borderRadius: '6px', border: '1px solid #eee' },
  filterInput: { padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem' },
  btnClear: { padding: '6px 12px', background: '#fff', color: '#ff4d4f', border: '1px solid #ff4d4f', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
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
  pagination: { display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '1rem' },
  pageBtn: { padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', background: '#fff' },
};

export default TaskList;

