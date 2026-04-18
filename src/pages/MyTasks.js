import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const parseError = (err) => {
  const data = err?.response?.data;
  if (!data) return 'Cannot reach server.';
  if (typeof data === 'object') return Object.values(data).join(', ');
  return String(data);
};

const STATUS_FLOW = ['TODO', 'IN_PROGRESS', 'DONE'];
const STATUS_COLORS = { TODO: '#faad14', IN_PROGRESS: '#1890ff', DONE: '#52c41a' };
const PRIORITY_COLORS = { HIGH: '#ff4d4f', MEDIUM: '#faad14', LOW: '#52c41a' };
const ANNOUNCE_COLORS = { INFO: '#1890ff', WARNING: '#faad14', URGENT: '#ff4d4f' };
const ANNOUNCE_BG = { INFO: '#e6f7ff', WARNING: '#fffbe6', URGENT: '#fff2f0' };

const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

const startOfThisWeek = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
};

const getDueDateStyle = (dueDate) => {
  if (!dueDate) return { color: '#aaa' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  const diff = Math.ceil((due - today) / 86400000);
  if (diff < 0) return { color: '#ff4d4f', fontWeight: 700 };
  if (diff <= 3) return { color: '#fa8c16', fontWeight: 600 };
  return { color: '#aaa' };
};

const getCardBorder = (task) => {
  if (!task.dueDate) return STATUS_COLORS[task.status] || '#1890ff';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((new Date(task.dueDate) - today) / 86400000);
  if (diff < 0) return '#ff4d4f';
  if (diff <= 3) return '#fa8c16';
  return STATUS_COLORS[task.status] || '#1890ff';
};

const dueDateLabel = (dueDate) => {
  if (!dueDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((new Date(dueDate) - today) / 86400000);
  if (diff < 0) return `⚠ Overdue by ${Math.abs(diff)}d`;
  if (diff === 0) return '⚠ Due today';
  if (diff <= 3) return `Due in ${diff}d`;
  return `Due: ${dueDate}`;
};

function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [expandedTask, setExpandedTask] = useState(null);
  const [logForm, setLogForm] = useState({ taskId: '', hours: '', date: new Date().toISOString().split('T')[0] });
  const [logMsg, setLogMsg] = useState('');
  const [logErr, setLogErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const fullName = localStorage.getItem('tt_fullName') || '';
  const initials = getInitials(fullName);

  useEffect(() => {
    Promise.all([
      api.get('/tasks/my'),
      api.get('/time-logs/my'),
      api.get('/announcements'),
    ]).then(([taskRes, logRes, annRes]) => {
      setTasks(taskRes.data);
      setTimeLogs(logRes.data);
      setAnnouncements(annRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const updateStatus = (task, newStatus) => {
    api.put(`/tasks/${task.id}/status?status=${newStatus}`)
      .then(res => setTasks(prev => prev.map(t => t.id === task.id ? res.data : t)))
      .catch(err => alert(parseError(err)));
  };

  const nextStatus = (current) => {
    const idx = STATUS_FLOW.indexOf(current);
    return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  };

  const handleLogTime = (e) => {
    e.preventDefault();
    setLogErr(''); setLogMsg(''); setSubmitting(true);
    api.post(`/time-logs?taskId=${logForm.taskId}`, { hours: Number(logForm.hours), date: logForm.date })
      .then(res => {
        setTimeLogs(prev => [res.data, ...prev]);
        setLogMsg(`✓ ${logForm.hours}h logged successfully!`);
        setLogForm(f => ({ ...f, hours: '' }));
      })
      .catch(err => setLogErr(parseError(err)))
      .finally(() => setSubmitting(false));
  };

  const logsForTask = (taskId) => timeLogs.filter(l => l.task?.id === taskId);
  const totalHoursForTask = (taskId) => logsForTask(taskId).reduce((s, l) => s + (l.hours || 0), 0);
  const totalHoursAll = timeLogs.reduce((s, l) => s + (l.hours || 0), 0);
  const weekStart = startOfThisWeek();
  const weekHours = timeLogs
    .filter(l => l.date && new Date(l.date) >= weekStart)
    .reduce((s, l) => s + (l.hours || 0), 0);

  const todoCount = tasks.filter(t => t.status === 'TODO').length;
  const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const doneCount = tasks.filter(t => t.status === 'DONE').length;
  const overdueCount = tasks.filter(t => {
    if (!t.dueDate || t.status === 'DONE') return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(t.dueDate) < today;
  }).length;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={styles.avatar}>{initials}</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>My Workspace</h2>
            <p style={{ margin: '2px 0 0', color: '#888', fontSize: '0.85rem' }}>Welcome back, <strong>{fullName}</strong></p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/change-password')} style={styles.btnSecondary}>🔑 Change Password</button>
          <button onClick={() => { localStorage.clear(); navigate('/'); }} style={styles.btnDanger}>Logout</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={styles.stats}>
        <div style={styles.statCard}>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#faad14' }}>{todoCount}</span>
          <span style={{ color: '#888', fontSize: '0.85rem' }}>To Do</span>
        </div>
        <div style={styles.statCard}>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1890ff' }}>{inProgressCount}</span>
          <span style={{ color: '#888', fontSize: '0.85rem' }}>In Progress</span>
        </div>
        <div style={styles.statCard}>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#52c41a' }}>{doneCount}</span>
          <span style={{ color: '#888', fontSize: '0.85rem' }}>Done</span>
        </div>
        {overdueCount > 0 && (
          <div style={styles.statCard}>
            <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#ff4d4f' }}>{overdueCount}</span>
            <span style={{ color: '#888', fontSize: '0.85rem' }}>Overdue</span>
          </div>
        )}
        <div style={styles.statCard}>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#722ed1' }}>{weekHours.toFixed(1)}h</span>
          <span style={{ color: '#888', fontSize: '0.85rem' }}>This Week</span>
        </div>
        <div style={styles.statCard}>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#13c2c2' }}>{totalHoursAll.toFixed(1)}h</span>
          <span style={{ color: '#888', fontSize: '0.85rem' }}>Total Logged</span>
        </div>
      </div>

      <div style={styles.body}>
        {/* Task Cards */}
        <div style={styles.taskSection}>
          <h3 style={{ marginTop: 0 }}>My Tasks ({tasks.length})</h3>
          {loading && <p>Loading...</p>}
          {!loading && tasks.length === 0 && (
            <div style={styles.emptyBox}>No tasks assigned yet. Check back later!</div>
          )}
          {tasks.map(task => {
            const next = nextStatus(task.status);
            const logs = logsForTask(task.id);
            const isExpanded = expandedTask === task.id;
            const cardBorder = getCardBorder(task);
            return (
              <div key={task.id} style={{ ...styles.taskCard, borderLeftColor: cardBorder }}>
                <div style={styles.taskCardHeader}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1rem' }}>{task.title}</strong>
                      <span style={{ ...styles.badge, background: STATUS_COLORS[task.status] || '#888' }}>{task.status?.replace('_', ' ')}</span>
                      {task.priority && <span style={{ ...styles.badge, background: PRIORITY_COLORS[task.priority] || '#888' }}>{task.priority}</span>}
                      {task.dueDate && (
                        <span style={{ fontSize: '0.8rem', ...getDueDateStyle(task.dueDate) }}>
                          {dueDateLabel(task.dueDate)}
                        </span>
                      )}
                    </div>
                    {task.description && <p style={{ margin: '6px 0 0', color: '#666', fontSize: '0.9rem' }}>{task.description}</p>}
                    <p style={{ margin: '4px 0 0', color: '#aaa', fontSize: '0.8rem' }}>
                      Assigned by: {task.createdBy?.fullName || '—'} · {totalHoursForTask(task.id).toFixed(1)}h logged
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexShrink: 0 }}>
                    {next && (
                      <button onClick={() => updateStatus(task, next)} style={{ ...styles.btnSmall, background: STATUS_COLORS[next] }}>
                        → {next.replace('_', ' ')}
                      </button>
                    )}
                    <button onClick={() => {
                      setExpandedTask(isExpanded ? null : task.id);
                      setLogForm(f => ({ ...f, taskId: task.id }));
                      setLogMsg(''); setLogErr('');
                    }} style={styles.btnSmallSecondary}>
                      {isExpanded ? 'Close' : 'Log Time'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={styles.taskExpanded}>
                    {/* Log time inline */}
                    <form onSubmit={handleLogTime} style={styles.logForm}>
                      <strong style={{ fontSize: '0.9rem' }}>Log time for this task</strong>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input type="number" placeholder="Hours (e.g. 2.5)" value={logForm.hours}
                          onChange={e => setLogForm(f => ({ ...f, hours: e.target.value }))}
                          min="0.01" step="any" required style={{ ...styles.input, width: '140px' }} />
                        <input type="date" value={logForm.date}
                          onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))}
                          required style={{ ...styles.input, width: '140px' }} />
                        <button type="submit" disabled={submitting} style={styles.btnGreen}>
                          {submitting ? 'Saving...' : '+ Log'}
                        </button>
                      </div>
                      {logMsg && <p style={{ color: '#52c41a', margin: '4px 0 0', fontSize: '0.85rem' }}>{logMsg}</p>}
                      {logErr && <p style={{ color: 'red', margin: '4px 0 0', fontSize: '0.85rem' }}>{logErr}</p>}
                    </form>

                    {/* Time log history */}
                    {logs.length > 0 && (
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: '#555' }}>Time History</strong>
                        <table style={{ ...styles.table, marginTop: '8px' }}>
                          <thead>
                            <tr>
                              <th style={styles.th}>Date</th>
                              <th style={styles.th}>Hours</th>
                            </tr>
                          </thead>
                          <tbody>
                            {logs.map(l => (
                              <tr key={l.id}>
                                <td style={styles.td}>{l.date}</td>
                                <td style={styles.td}>{l.hours}h</td>
                              </tr>
                            ))}
                            <tr>
                              <td style={{ ...styles.td, fontWeight: 700 }}>Total</td>
                              <td style={{ ...styles.td, fontWeight: 700 }}>{totalHoursForTask(task.id).toFixed(1)}h</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                    {logs.length === 0 && <p style={{ color: '#aaa', fontSize: '0.85rem', margin: '8px 0 0' }}>No time logged for this task yet.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right panel: Announcements + Time Logs */}
        <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Announcements panel */}
          <div style={styles.panel}>
            <h3 style={{ marginTop: 0, fontSize: '1rem' }}>📢 Announcements</h3>
            {announcements.length === 0 && <p style={{ color: '#aaa', fontSize: '0.85rem' }}>No announcements.</p>}
            {announcements.slice(0, 5).map(a => (
              <div key={a.id} style={{ ...styles.announcementCard, background: ANNOUNCE_BG[a.type] || '#f6f6f6', borderLeftColor: ANNOUNCE_COLORS[a.type] || '#888' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: '0.9rem', color: ANNOUNCE_COLORS[a.type] }}>{a.title}</strong>
                  <span style={{ ...styles.badge, background: ANNOUNCE_COLORS[a.type], fontSize: '0.7rem' }}>{a.type}</span>
                </div>
                {a.message && <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#555' }}>{a.message}</p>}
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#aaa' }}>
                  {a.createdBy?.fullName || 'Admin'} · {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}
                </p>
              </div>
            ))}
          </div>

          {/* Recent Time Logs panel */}
          <div style={styles.panel}>
            <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Recent Time Logs</h3>
            {timeLogs.length === 0 && <p style={{ color: '#aaa', fontSize: '0.9rem' }}>No logs yet.</p>}
            {timeLogs.slice(0, 10).map(l => (
              <div key={l.id} style={styles.logEntry}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{l.task?.title || '—'}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span style={{ color: '#888', fontSize: '0.78rem' }}>{l.date}</span>
                  <span style={{ color: '#1890ff', fontWeight: 700, fontSize: '0.85rem' }}>{l.hours}h</span>
                </div>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #f0f0f0', marginTop: '8px', paddingTop: '8px', fontWeight: 700, fontSize: '0.9rem' }}>
              This week: {weekHours.toFixed(1)}h &nbsp;·&nbsp; Total: {totalHoursAll.toFixed(1)}h
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '1.5rem', background: '#f5f7fa', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#fff', padding: '1rem 1.5rem', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  avatar: { width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #1890ff, #722ed1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', flexShrink: 0 },
  stats: { display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' },
  statCard: { background: '#fff', padding: '1rem 1.2rem', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '90px', flex: 1 },
  body: { display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' },
  taskSection: { flex: 3, minWidth: '300px' },
  panel: { background: '#fff', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  announcementCard: { borderLeft: '3px solid #1890ff', borderRadius: '4px', padding: '8px 10px', marginBottom: '8px' },
  taskCard: { background: '#fff', borderRadius: '8px', padding: '1rem 1.2rem', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '3px solid #1890ff' },
  taskCardHeader: { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' },
  taskExpanded: { borderTop: '1px solid #f0f0f0', marginTop: '12px', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' },
  logForm: { display: 'flex', flexDirection: 'column', gap: '8px', background: '#f9f9f9', padding: '10px', borderRadius: '6px' },
  logEntry: { padding: '8px', borderBottom: '1px solid #f0f0f0' },
  emptyBox: { background: '#fff', borderRadius: '8px', padding: '2rem', textAlign: 'center', color: '#aaa', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  badge: { color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600 },
  btnGreen: { padding: '8px 14px', background: '#52c41a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
  btnSecondary: { padding: '8px 14px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
  btnDanger: { padding: '8px 14px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
  btnSmall: { padding: '4px 10px', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  btnSmallSecondary: { padding: '4px 10px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  input: { padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th: { background: '#fafafa', padding: '6px 8px', border: '1px solid #ddd', textAlign: 'left' },
  td: { padding: '6px 8px', border: '1px solid #ddd' },
};

export default MyTasks;
