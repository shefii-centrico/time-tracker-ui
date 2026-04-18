import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const PAGE_SIZE = 20;

function TimeLogs() {
  const [logs, setLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Filters
  const [filterTaskId, setFilterTaskId] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  // Edit modal
  const [editLog, setEditLog] = useState(null);
  const [editHours, setEditHours] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/tasks'),
      api.get('/tasks/assignable-users'),
    ]).then(([taskRes, empRes]) => {
      setTasks(taskRes.data);
      setEmployees(empRes.data.filter(u => u.role === 'EMPLOYEE'));
    }).catch(() => {});
    fetchLogs();
  }, []);

  const buildUrl = (taskId, userId, sd, ed) => {
    const params = new URLSearchParams();
    if (taskId) params.append('taskId', taskId);
    if (userId) params.append('userId', userId);
    if (sd) params.append('startDate', sd);
    if (ed) params.append('endDate', ed);
    const q = params.toString();
    return q ? `/time-logs?${q}` : '/time-logs';
  };

  const fetchLogs = (taskId = filterTaskId, userId = filterUserId, sd = startDate, ed = endDate) => {
    setLoading(true);
    api.get(buildUrl(taskId, userId, sd, ed))
      .then((res) => { setLogs(res.data); setPage(1); })
      .catch(() => setError('Failed to load time logs.'))
      .finally(() => setLoading(false));
  };

  const applyFilters = () => fetchLogs(filterTaskId, filterUserId, startDate, endDate);
  const clearFilters = () => {
    setFilterTaskId(''); setFilterUserId(''); setStartDate(''); setEndDate('');
    fetchLogs('', '', '', '');
  };

  const deleteLog = (id) => {
    if (!window.confirm('Delete this time log?')) return;
    api.delete(`/time-logs/${id}`)
      .then(() => fetchLogs())
      .catch(() => alert('Failed to delete time log'));
  };

  const openEdit = (log) => {
    setEditLog(log);
    setEditHours(String(log.hours));
    setEditDate(log.date);
  };

  const saveEdit = () => {
    if (!editHours || !editDate) return;
    setEditSaving(true);
    api.put(`/time-logs/${editLog.id}`, { hours: Number(editHours), date: editDate })
      .then(() => { setEditLog(null); fetchLogs(); })
      .catch(() => alert('Failed to update time log'))
      .finally(() => setEditSaving(false));
  };

  const exportCSV = () => {
    const headers = ['ID', 'Task', 'Employee', 'Hours', 'Date'];
    const rows = logs.map(l => [
      l.id,
      `"${(l.task?.title || '').replace(/"/g, '""')}"`,
      `"${(l.user?.fullName || l.user?.username || '').replace(/"/g, '""')}"`,
      l.hours, l.date
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'time-logs.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const taskTitle = (taskId) => {
    const t = tasks.find((t) => t.id === taskId);
    return t ? t.title : `Task #${taskId}`;
  };

  const totalHours = logs.reduce((sum, l) => sum + (l.hours || 0), 0);
  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const paginated = logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = filterTaskId || filterUserId || startDate || endDate;

  return (
    <div style={styles.container}>
      {/* Edit modal */}
      {editLog && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{ marginTop: 0 }}>Edit Time Log #{editLog.id}</h3>
            <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 12px' }}>
              Task: <strong>{editLog.task?.title || '—'}</strong> · Employee: <strong>{editLog.user?.fullName || editLog.user?.username}</strong>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '0.9rem' }}>Hours</label>
              <input type="number" value={editHours} onChange={e => setEditHours(e.target.value)}
                min="0.01" step="any" style={styles.input} />
              <label style={{ fontSize: '0.9rem' }}>Date</label>
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={styles.input} />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditLog(null)} style={styles.btnSecondary}>Cancel</button>
              <button onClick={saveEdit} disabled={editSaving} style={styles.btnPrimary}>
                {editSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>
          Time Logs <span style={{ color: '#888', fontSize: '0.9rem', fontWeight: 400 }}>({logs.length} entries · {totalHours.toFixed(2)} hrs)</span>
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={exportCSV} style={{ ...styles.btnPrimary, background: '#13c2c2' }}>⬇ CSV</button>
          <button onClick={() => navigate('/tasks')} style={styles.btnSecondary}>← Back to Tasks</button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={styles.filterBar}>
        <select value={filterTaskId} onChange={e => setFilterTaskId(e.target.value)} style={styles.filterInput}>
          <option value="">All Tasks</option>
          {tasks.map((t) => <option key={t.id} value={t.id}>#{t.id} — {t.title}</option>)}
        </select>
        <select value={filterUserId} onChange={e => setFilterUserId(e.target.value)} style={styles.filterInput}>
          <option value="">All Employees</option>
          {employees.map(u => <option key={u.id} value={u.id}>{u.fullName || u.username}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '0.85rem', color: '#666', whiteSpace: 'nowrap' }}>From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={styles.filterInput} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '0.85rem', color: '#666', whiteSpace: 'nowrap' }}>To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={styles.filterInput} />
        </div>
        <button onClick={applyFilters} style={styles.btnPrimary}>Apply</button>
        {hasFilters && <button onClick={clearFilters} style={styles.btnClear}>✕ Clear</button>}
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && logs.length === 0 && <p style={{ color: '#888' }}>No time logs found for the selected filters.</p>}

      {!loading && logs.length > 0 && (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Task</th>
                <th style={styles.th}>Employee</th>
                <th style={styles.th}>Hours</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((log) => (
                <tr key={log.id}>
                  <td style={styles.td}>{log.id}</td>
                  <td style={styles.td}>{log.task ? taskTitle(log.task.id) : '—'}</td>
                  <td style={styles.td}>{log.user?.fullName || log.user?.username || '—'}</td>
                  <td style={styles.td}><strong>{log.hours}h</strong></td>
                  <td style={styles.td}>{log.date}</td>
                  <td style={styles.td}>
                    <button onClick={() => openEdit(log)} style={styles.btnEdit}>Edit</button>
                    <button onClick={() => deleteLog(log.id)} style={styles.btnDelete}>Delete</button>
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

const styles = {
  container: { padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' },
  filterBar: { display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center', background: '#fafafa', padding: '12px', borderRadius: '6px', border: '1px solid #eee' },
  filterInput: { padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem' },
  btnClear: { padding: '6px 12px', background: '#fff', color: '#ff4d4f', border: '1px solid #ff4d4f', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
  btnPrimary: { padding: '8px 16px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  btnSecondary: { padding: '8px 16px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' },
  btnEdit: { padding: '4px 10px', background: '#fa8c16', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '6px' },
  btnDelete: { padding: '4px 10px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: '#fafafa', padding: '10px', border: '1px solid #ddd', textAlign: 'left' },
  td: { padding: '10px', border: '1px solid #ddd' },
  pagination: { display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '1rem' },
  pageBtn: { padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', background: '#fff' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '8px', padding: '1.5rem', minWidth: '320px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' },
  input: { padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.95rem', width: '100%', boxSizing: 'border-box' },
};

export default TimeLogs;
