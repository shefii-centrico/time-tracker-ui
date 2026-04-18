import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const parseError = (err) => {
  const data = err?.response?.data;
  if (!data) return 'Cannot reach server.';
  if (typeof data === 'object') return Object.values(data).join(', ');
  return String(data);
};

const PAGE_SIZE = 20;

function MyTimeLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTask, setFilterTask] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ hours: '', date: '' });
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/time-logs/my')
      .then(res => setLogs(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const taskOptions = useMemo(() => {
    const seen = new Map();
    logs.forEach(l => { if (l.task) seen.set(l.task.id, l.task.title); });
    return Array.from(seen.entries());
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filterTask && String(l.task?.id) !== filterTask) return false;
      if (filterStart && l.date < filterStart) return false;
      if (filterEnd && l.date > filterEnd) return false;
      return true;
    });
  }, [logs, filterTask, filterStart, filterEnd]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalHours = filtered.reduce((s, l) => s + (l.hours || 0), 0);

  const resetFilters = () => {
    setFilterTask(''); setFilterStart(''); setFilterEnd(''); setPage(1);
  };

  const startEdit = (log) => {
    setEditingId(log.id);
    setEditForm({ hours: String(log.hours), date: log.date });
  };

  const saveEdit = (id) => {
    api.put(`/time-logs/my/${id}`, { hours: Number(editForm.hours), date: editForm.date })
      .then(res => {
        setLogs(prev => prev.map(l => l.id === id ? res.data : l));
        setEditingId(null);
      })
      .catch(err => alert(parseError(err)));
  };

  const deleteLog = (id) => {
    if (!window.confirm('Delete this time log entry?')) return;
    api.delete(`/time-logs/my/${id}`)
      .then(() => setLogs(prev => prev.filter(l => l.id !== id)))
      .catch(err => alert(parseError(err)));
  };

  const exportCSV = () => {
    const header = ['Date', 'Task', 'Hours'];
    const rows = filtered.map(l => [l.date, `"${l.task?.title || ''}"`, l.hours]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'my-time-logs.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>⏱ My Time Logs</h2>
          <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>
            {filtered.length} entries · {totalHours.toFixed(1)}h total
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={exportCSV} style={styles.btnSecondary}>⬇ CSV</button>
          <button onClick={() => navigate('/my-tasks')} style={styles.btnSecondary}>← My Tasks</button>
        </div>
      </div>
      <div style={{ padding: '0 1.5rem' }}>

      {/* Filters */}
      <div style={styles.filters}>
        <select value={filterTask} onChange={e => { setFilterTask(e.target.value); setPage(1); }} style={styles.input}>
          <option value="">All Tasks</option>
          {taskOptions.map(([id, title]) => (
            <option key={id} value={String(id)}>{title}</option>
          ))}
        </select>
        <input type="date" value={filterStart} onChange={e => { setFilterStart(e.target.value); setPage(1); }} style={styles.input} placeholder="From" title="From date" />
        <input type="date" value={filterEnd} onChange={e => { setFilterEnd(e.target.value); setPage(1); }} style={styles.input} placeholder="To" title="To date" />
        {(filterTask || filterStart || filterEnd) && (
          <button onClick={resetFilters} style={styles.btnSecondary}>✕ Clear</button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>No time log entries found.</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Task</th>
                <th style={styles.th}>Hours</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(l => (
                <tr key={l.id} style={{ background: editingId === l.id ? '#f0f9ff' : 'transparent' }}>
                  {editingId === l.id ? (
                    <>
                      <td style={styles.td}>
                        <input type="date" value={editForm.date}
                          onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                          style={{ ...styles.input, padding: '3px 6px', width: '130px' }} />
                      </td>
                      <td style={styles.td}>{l.task?.title || '—'}</td>
                      <td style={styles.td}>
                        <input type="number" value={editForm.hours} min="0.01" step="any"
                          onChange={e => setEditForm(f => ({ ...f, hours: e.target.value }))}
                          style={{ ...styles.input, padding: '3px 6px', width: '80px' }} />
                      </td>
                      <td style={styles.td}>
                        <button onClick={() => saveEdit(l.id)} style={{ ...styles.btnAction, background: '#52c41a' }}>Save</button>
                        <button onClick={() => setEditingId(null)} style={{ ...styles.btnAction, background: '#aaa', marginLeft: '4px' }}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={styles.td}>{l.date}</td>
                      <td style={styles.td}>{l.task?.title || '—'}</td>
                      <td style={styles.td}>{l.hours}h</td>
                      <td style={styles.td}>
                        <button onClick={() => startEdit(l)} style={{ ...styles.btnAction, background: '#1890ff' }}>Edit</button>
                        <button onClick={() => deleteLog(l.id)} style={{ ...styles.btnAction, background: '#ff4d4f', marginLeft: '4px' }}>Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={{ ...styles.td, fontWeight: 700 }}>
                  {filtered.length} entries shown
                </td>
                <td style={{ ...styles.td, fontWeight: 700 }}>{totalHours.toFixed(1)}h</td>
                <td style={styles.td}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button onClick={() => setPage(1)} disabled={page === 1} style={styles.pageBtn}>«</button>
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1} style={styles.pageBtn}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => Math.abs(p - page) <= 2)
            .map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{ ...styles.pageBtn, background: p === page ? '#1890ff' : '#fff', color: p === page ? '#fff' : '#333', fontWeight: p === page ? 700 : 400 }}>
                {p}
              </button>
            ))}
          <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} style={styles.pageBtn}>›</button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={styles.pageBtn}>»</button>
          <span style={{ color: '#888', fontSize: '0.85rem', marginLeft: '8px' }}>
            Page {page} of {totalPages}
          </span>
        </div>
      )}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '0 0 1.5rem', background: '#f0f1f5', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'linear-gradient(90deg, #0d0b1f 0%, #1a1535 100%)', padding: '0.85rem 1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(124,58,237,0.3)', boxShadow: '0 2px 12px rgba(0,0,0,0.25)', flexWrap: 'wrap', gap: '12px' },
  filters: { display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center', background: '#fff', padding: '12px 16px', borderRadius: '10px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  input: { padding: '7px 12px', borderRadius: '6px', border: '1px solid #e0e0ea', fontSize: '0.9rem', outline: 'none' },
  tableWrapper: { background: '#fff', borderRadius: '10px', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
  th: { background: '#1a1535', color: '#fff', padding: '11px 14px', textAlign: 'left', fontSize: '0.79rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '9px 14px', borderBottom: '1px solid #f0f0f6' },
  empty: { background: '#fff', borderRadius: '10px', padding: '2.5rem', textAlign: 'center', color: '#aaa', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', fontSize: '0.95rem' },
  btnSecondary: { padding: '8px 14px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' },
  btnAction: { padding: '3px 10px', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 },
  pagination: { display: 'flex', gap: '4px', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap' },
  pageBtn: { padding: '6px 12px', border: '1px solid #e0e0ea', borderRadius: '6px', cursor: 'pointer', background: '#fff', color: '#333', fontSize: '0.85rem', fontWeight: 500 },
};

export default MyTimeLogs;
