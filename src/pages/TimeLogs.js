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
    Promise.allSettled([
      api.get('/tasks'),
      api.get('/tasks/assignable-users'),
    ]).then(([taskRes, empRes]) => {
      if (taskRes.status === 'fulfilled') setTasks(taskRes.value.data);
      if (empRes.status === 'fulfilled') setEmployees(empRes.value.data.filter(u => u.role === 'EMPLOYEE'));
    });
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
        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>
          ⏱ Time Logs <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 400 }}>({logs.length} entries · {totalHours.toFixed(2)} hrs)</span>
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={exportCSV} style={{ ...styles.btnPrimary, background: 'linear-gradient(135deg,#13c2c2,#0891b2)' }}>⬇ CSV</button>
          <button onClick={() => navigate('/tasks')} style={styles.btnSecondary}>← Back to Tasks</button>
        </div>
      </div>
      <div style={{ padding: '0 1.5rem' }}>

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
    </div>
  );
}

const styles = {
  container: { padding: '0 0 2rem', background: '#f0f1f5', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, #0d0b1f 0%, #1a1535 100%)', padding: '0.85rem 1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(124,58,237,0.3)', boxShadow: '0 2px 12px rgba(0,0,0,0.25)', flexWrap: 'wrap', gap: '8px' },
  filterBar: { display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center', background: '#fff', padding: '12px 16px', borderRadius: '10px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  filterInput: { padding: '7px 12px', borderRadius: '6px', border: '1px solid #e0e0ea', fontSize: '0.9rem', outline: 'none' },
  btnClear: { padding: '7px 12px', background: '#fff5f5', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
  btnPrimary: { padding: '8px 18px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  btnSecondary: { padding: '8px 16px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer' },
  btnEdit: { padding: '4px 12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '6px', fontWeight: 600 },
  btnDelete: { padding: '4px 12px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' },
  th: { background: '#1a1535', color: '#fff', padding: '11px 12px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f0f0f6', fontSize: '0.9rem' },
  pagination: { display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '1rem' },
  pageBtn: { padding: '6px 14px', border: '1px solid #e0e0ea', borderRadius: '6px', cursor: 'pointer', background: '#fff', fontWeight: 500 },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', padding: '1.8rem', minWidth: '320px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' },
  input: { padding: '9px 12px', borderRadius: '6px', border: '1px solid #e0e0ea', fontSize: '0.95rem', width: '100%', boxSizing: 'border-box', outline: 'none' },
};

export default TimeLogs;
