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
const ENV_COLORS = { DEV: '#722ed1', TEST: '#fa8c16', PRE: '#1890ff', PRO: '#52c41a' };
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
  const [planviewProject, setPlanviewProject] = useState('');
  const [macroFase, setMacroFase] = useState('');
  const [billable, setBillable] = useState('true');
  const [workType, setWorkType] = useState('Project');
  const [planviewMissing, setPlanviewMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editForm, setEditForm] = useState({ hours: '', date: '', planviewProject: '', macroFase: '', billable: 'true', workType: 'Project' });
  const [taskComments, setTaskComments] = useState({});       // taskId -> comment[]
  const [commentInputs, setCommentInputs] = useState({});     // taskId -> string
  const [showHoldInput, setShowHoldInput] = useState({});     // taskId -> bool
  const [holdReasonInputs, setHoldReasonInputs] = useState({}); // taskId -> string
  const [showExtInput, setShowExtInput] = useState({});       // taskId -> bool
  const [extReasonInputs, setExtReasonInputs] = useState({}); // taskId -> string
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [eodContent, setEodContent] = useState('');
  const [eodDate, setEodDate] = useState(new Date().toISOString().split('T')[0]);
  const [eodMsg, setEodMsg] = useState('');
  const [eodErr, setEodErr] = useState('');
  const [eodSubmitting, setEodSubmitting] = useState(false);
  // Leave requests
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', leaveType: 'CASUAL', reason: '' });
  const [leaveMsg, setLeaveMsg] = useState('');
  const [leaveErr, setLeaveErr] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const fullName = localStorage.getItem('tt_fullName') || '';
  const initials = getInitials(fullName);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    Promise.allSettled([
      api.get('/tasks/my'),
      api.get('/time-logs/my'),
      api.get('/announcements'),
      api.get('/leave-requests/my'),
      api.get('/notifications/my'),
    ]).then(([taskRes, logRes, annRes, leaveRes, notifRes]) => {
      if (taskRes.status === 'fulfilled') setTasks(taskRes.value.data);
      if (logRes.status === 'fulfilled') setTimeLogs(logRes.value.data);
      if (annRes.status === 'fulfilled') setAnnouncements(annRes.value.data);
      if (leaveRes.status === 'fulfilled') setLeaveRequests(leaveRes.value.data);
      if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.data);
    }).finally(() => setLoading(false));
  }, []);

  const updateStatus = (task, newStatus) => {
    const label = newStatus === 'IN_PROGRESS' ? 'In Progress' : newStatus === 'DONE' ? 'Done' : newStatus;
    const msg = task.status === 'DONE' && newStatus === 'IN_PROGRESS'
      ? `Reopen "${task.title}" as In Progress?`
      : `Mark "${task.title}" as ${label}?`;
    if (!window.confirm(msg)) return;
    api.put(`/tasks/${task.id}/status?status=${newStatus}`)
      .then(res => setTasks(prev => prev.map(t => t.id === task.id ? res.data : t)))
      .catch(err => alert(parseError(err)));
  };

  const updateEnvironment = (task, env) => {
    api.put(`/tasks/${task.id}/environment?environment=${encodeURIComponent(env)}`)
      .then(res => setTasks(prev => prev.map(t => t.id === task.id ? res.data : t)))
      .catch(err => alert(parseError(err)));
  };

  const loadComments = (taskId) => {
    api.get(`/tasks/${taskId}/comments`)
      .then(res => setTaskComments(prev => ({ ...prev, [taskId]: res.data })))
      .catch(() => {});
  };

  const addComment = (taskId) => {
    const text = (commentInputs[taskId] || '').trim();
    if (!text) return;
    api.post(`/tasks/${taskId}/comments`, { content: text })
      .then(res => {
        setTaskComments(prev => ({ ...prev, [taskId]: [res.data, ...(prev[taskId] || [])] }));
        setCommentInputs(prev => ({ ...prev, [taskId]: '' }));
      })
      .catch(err => alert(parseError(err)));
  };

  const updateHold = (task, onHold, reason) => {
    const params = `onHold=${onHold}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`;
    api.put(`/tasks/${task.id}/hold?${params}`)
      .then(res => {
        setTasks(prev => prev.map(t => t.id === task.id ? res.data : t));
        setShowHoldInput(prev => ({ ...prev, [task.id]: false }));
        setHoldReasonInputs(prev => ({ ...prev, [task.id]: '' }));
      })
      .catch(err => alert(parseError(err)));
  };

  const requestExtension = (task, requested, reason) => {
    const params = `requested=${requested}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`;
    api.put(`/tasks/${task.id}/extension?${params}`)
      .then(res => {
        setTasks(prev => prev.map(t => t.id === task.id ? res.data : t));
        setShowExtInput(prev => ({ ...prev, [task.id]: false }));
        setExtReasonInputs(prev => ({ ...prev, [task.id]: '' }));
      })
      .catch(err => alert(parseError(err)));
  };

  const submitLeave = () => {
    if (!leaveForm.startDate || !leaveForm.endDate) return;
    setLeaveSubmitting(true); setLeaveErr(''); setLeaveMsg('');
    api.post('/leave-requests', leaveForm)
      .then(res => {
        setLeaveMsg('✓ Leave request submitted!');
        setLeaveRequests(prev => [res.data, ...prev]);
        setLeaveForm({ startDate: '', endDate: '', leaveType: 'CASUAL', reason: '' });
        setShowLeaveForm(false);
      })
      .catch(err => setLeaveErr(parseError(err)))
      .finally(() => setLeaveSubmitting(false));
  };

  const submitEod = () => {
    if (!eodContent.trim()) return;
    setEodSubmitting(true); setEodErr(''); setEodMsg('');
    api.post('/daily-summaries', { content: eodContent.trim(), date: eodDate })
      .then(() => {
        setEodMsg('✓ End-of-day summary saved!');
        setEodContent('');
      })
      .catch(err => setEodErr(parseError(err)))
      .finally(() => setEodSubmitting(false));
  };

  const nextStatus = (current) => {
    const idx = STATUS_FLOW.indexOf(current);
    return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  };

  const handleLogTime = (e) => {
    e.preventDefault();
    setLogErr(''); setLogMsg(''); setSubmitting(true);
    api.post(`/time-logs?taskId=${logForm.taskId}`, {
      hours: Number(logForm.hours),
      date: logForm.date,
      planviewProject: planviewProject || null,
      macroFase: macroFase || null,
      billable: billable === 'true',
      workType,
    })
      .then(res => {
        setTimeLogs(prev => [res.data, ...prev]);
        setLogMsg(`✓ ${logForm.hours}h logged successfully!`);
        setLogForm(f => ({ ...f, hours: '' }));
        setPlanviewMissing(false);
      })
      .catch(err => setLogErr(parseError(err)))
      .finally(() => setSubmitting(false));
  };

  const startEditLog = (log) => {
    setEditingLogId(log.id);
    setEditForm({
      hours: String(log.hours),
      date: log.date,
      planviewProject: log.planviewProject || '',
      macroFase: log.macroFase || '',
      billable: log.billable !== false ? 'true' : 'false',
      workType: log.workType || 'Project',
    });
  };

  const handleEditLog = (logId) => {
    api.put(`/time-logs/my/${logId}`, {
      hours: Number(editForm.hours),
      date: editForm.date,
      planviewProject: editForm.planviewProject || null,
      macroFase: editForm.macroFase || null,
      billable: editForm.billable === 'true',
      workType: editForm.workType,
    })
      .then(res => {
        setTimeLogs(prev => prev.map(l => l.id === logId ? res.data : l));
        setEditingLogId(null);
      })
      .catch(err => alert(parseError(err)));
  };

  const handleDeleteLog = (logId) => {
    if (!window.confirm('Delete this time log entry?')) return;
    api.delete(`/time-logs/my/${logId}`)
      .then(() => setTimeLogs(prev => prev.filter(l => l.id !== logId)))
      .catch(err => alert(parseError(err)));
  };

  const logsForTask = (taskId) => timeLogs.filter(l => l.task?.id === taskId);
  const totalHoursForTask = (taskId) => logsForTask(taskId).reduce((s, l) => s + (l.hours || 0), 0);
  const totalHoursAll = timeLogs.reduce((s, l) => s + (l.hours || 0), 0);
  const weekStart = startOfThisWeek();
  const weekHours = timeLogs
    .filter(l => l.date && new Date(l.date) >= weekStart)
    .reduce((s, l) => s + (l.hours || 0), 0);

  // Week summary: Mon–Sun hours per day
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayStr = new Date().toISOString().split('T')[0];
  const weekDayHours = weekDays.map(d => {
    const ds = d.toISOString().split('T')[0];
    return timeLogs.filter(l => l.date === ds).reduce((s, l) => s + (l.hours || 0), 0);
  });

  // Hours progress bar renderer
  const hoursProgressBar = (logged, max) => {
    if (!max || max <= 0) return null;
    const pct = Math.min((logged / max) * 100, 100);
    const barColor = pct >= 100 ? '#ff4d4f' : pct >= 80 ? '#fa8c16' : '#52c41a';
    const filled = Math.round(pct / 10);
    return (
      <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', color: '#888' }}>Budget:</span>
        <span style={{ fontSize: '0.78rem', fontWeight: pct >= 80 ? 700 : 400, color: pct >= 80 ? barColor : '#555' }}>
          {logged.toFixed(1)}h / {max}h
        </span>
        <div style={{ display: 'flex', gap: '2px' }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{ width: '8px', height: '8px', borderRadius: '1px', background: i < filled ? barColor : '#e0e0e0' }} />
          ))}
        </div>
        {pct >= 100 && <span style={{ color: '#ff4d4f', fontSize: '0.72rem', fontWeight: 700 }}>OVER BUDGET</span>}
        {pct >= 80 && pct < 100 && <span style={{ color: '#fa8c16', fontSize: '0.72rem', fontWeight: 700 }}>⚠ Near limit</span>}
      </div>
    );
  };

  const todoCount = tasks.filter(t => t.status === 'TODO').length;
  const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const doneCount = tasks.filter(t => t.status === 'DONE').length;
  const overdueCount = tasks.filter(t => {
    if (!t.dueDate || t.status === 'DONE') return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(t.dueDate) < today;
  }).length;

  // Monthly summary
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthHours = timeLogs
    .filter(l => l.date && new Date(l.date) >= monthStart)
    .reduce((s, l) => s + (l.hours || 0), 0);
  const MONTH_TARGET = 160;

  // Completion rate
  const completionRate = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  // Filter/search
  const filteredTasks = tasks.filter(t => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesSearch = !searchQuery.trim() || t.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={styles.avatar}>{initials}</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>My Workspace</h2>
            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>Welcome back, <strong style={{ color: '#a78bfa' }}>{fullName}</strong></p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setNotifOpen(o => !o)}
              style={{ ...styles.btnSecondary, position: 'relative', padding: '6px 12px', fontWeight: 600, background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  background: '#ff4d4f', color: '#fff', borderRadius: '50%',
                  fontSize: '0.65rem', fontWeight: 700, minWidth: '18px', height: '18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px'
                }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
            {notifOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '110%', zIndex: 999,
                background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.13)', width: '340px', maxHeight: '420px',
                overflow: 'hidden', display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>🔔 Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={() => {
                      api.put('/notifications/read-all').then(() => setNotifications(prev => prev.map(n => ({ ...n, read: true }))));
                    }} style={{ fontSize: '0.75rem', color: '#1890ff', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {notifications.length === 0 && (
                    <p style={{ padding: '20px', color: '#aaa', textAlign: 'center', margin: 0, fontSize: '0.85rem' }}>No notifications yet.</p>
                  )}
                  {notifications.map(n => (
                    <div key={n.id} onClick={() => {
                      if (!n.read) api.put(`/notifications/${n.id}/read`).then(() =>
                        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
                      );
                    }} style={{
                      padding: '10px 16px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer',
                      background: n.read ? '#fff' : '#f0f7ff',
                      display: 'flex', gap: '10px', alignItems: 'flex-start'
                    }}>
                      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>
                        {n.type === 'TASK_ASSIGNED' ? '📋'
                          : n.type === 'EXTENSION_APPROVED' ? '✅'
                          : n.type === 'EXTENSION_REJECTED' ? '❌'
                          : n.type === 'LEAVE_APPROVED' ? '🏖'
                          : n.type === 'LEAVE_REJECTED' ? '🚫'
                          : '🔔'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#333', lineHeight: 1.4 }}>{n.message}</p>
                        <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: '#aaa' }}>
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!n.read && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#1890ff', flexShrink: 0, marginTop: '4px' }} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={() => navigate('/profile')} style={{ ...styles.btnSecondary, background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>👤 Profile</button>
          <button onClick={() => navigate('/change-password')} style={{ ...styles.btnSecondary, background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>🔑 Change Password</button>
          <button onClick={() => { localStorage.clear(); navigate('/'); }} style={{ ...styles.btnDanger, background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>Logout</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ padding: '0 1.5rem' }}>
      <div style={styles.stats}>
        {/* To Do */}
        <div style={{ ...styles.statCard, borderTop: '3px solid #faad14' }}>
          <span style={{ fontSize: '1.1rem', marginBottom: '4px' }}>📋</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#faad14', lineHeight: 1 }}>{todoCount}</span>
          <span style={{ color: '#666', fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>To Do</span>
        </div>
        {/* In Progress */}
        <div style={{ ...styles.statCard, borderTop: '3px solid #1890ff' }}>
          <span style={{ fontSize: '1.1rem', marginBottom: '4px' }}>⚡</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#1890ff', lineHeight: 1 }}>{inProgressCount}</span>
          <span style={{ color: '#666', fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In Progress</span>
        </div>
        {/* Done */}
        <div style={{ ...styles.statCard, borderTop: '3px solid #52c41a' }}>
          <span style={{ fontSize: '1.1rem', marginBottom: '4px' }}>✅</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#52c41a', lineHeight: 1 }}>{doneCount}</span>
          <span style={{ color: '#666', fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Done</span>
        </div>
        {/* Overdue — only shown when > 0 */}
        {overdueCount > 0 && (
          <div style={{ ...styles.statCard, borderTop: '3px solid #ff4d4f', background: '#fff5f5' }}>
            <span style={{ fontSize: '1.1rem', marginBottom: '4px' }}>⚠️</span>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#ff4d4f', lineHeight: 1 }}>{overdueCount}</span>
            <span style={{ color: '#666', fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overdue</span>
          </div>
        )}
        {/* This Week */}
        <div style={{ ...styles.statCard, borderTop: '3px solid #7c3aed' }}>
          <span style={{ fontSize: '1.1rem', marginBottom: '4px' }}>📅</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#7c3aed', lineHeight: 1 }}>{weekHours.toFixed(1)}<span style={{ fontSize: '1rem' }}>h</span></span>
          <span style={{ color: '#666', fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>This Week</span>
        </div>
        {/* Total Logged */}
        <div style={{ ...styles.statCard, borderTop: '3px solid #13c2c2' }}>
          <span style={{ fontSize: '1.1rem', marginBottom: '4px' }}>⏱️</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#13c2c2', lineHeight: 1 }}>{totalHoursAll.toFixed(1)}<span style={{ fontSize: '1rem' }}>h</span></span>
          <span style={{ color: '#666', fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Logged</span>
        </div>
        {/* This Month */}
        <div style={{ ...styles.statCard, borderTop: `3px solid ${monthHours >= MONTH_TARGET ? '#52c41a' : '#1890ff'}` }}>
          <span style={{ fontSize: '1.1rem', marginBottom: '4px' }}>🗓️</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: monthHours >= MONTH_TARGET ? '#52c41a' : '#1890ff', lineHeight: 1 }}>{monthHours.toFixed(1)}<span style={{ fontSize: '1rem' }}>h</span></span>
          <span style={{ color: '#666', fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Month / {MONTH_TARGET}h</span>
        </div>
        {/* Completion Rate */}
        <div style={{ ...styles.statCard, borderTop: `3px solid ${completionRate >= 75 ? '#52c41a' : completionRate >= 50 ? '#fa8c16' : '#ff4d4f'}` }}>
          <span style={{ fontSize: '1.1rem', marginBottom: '4px' }}>🎯</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: completionRate >= 75 ? '#52c41a' : completionRate >= 50 ? '#fa8c16' : '#ff4d4f', lineHeight: 1 }}>{completionRate}<span style={{ fontSize: '1rem' }}>%</span></span>
          <span style={{ color: '#666', fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completion</span>
        </div>
      </div>
      </div>

      <div style={{ padding: '0 1.5rem' }}>
      <div style={styles.body}>
        {/* Task Cards */}
        <div style={styles.taskSection}>
          <h3 style={{ marginTop: 0, fontSize: '1rem', fontWeight: 700, color: '#1a1535', letterSpacing: '0.02em', borderLeft: '3px solid #7c3aed', paddingLeft: '10px' }}>My Tasks <span style={{ color: '#7c3aed' }}>({tasks.length})</span></h3>

          {/* Filter & Search */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="🔍 Search tasks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ ...styles.input, flex: '1 1 180px', fontSize: '0.88rem' }}
            />
            {['ALL', 'TODO', 'IN_PROGRESS', 'DONE'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', fontSize: '0.8rem',
                  background: statusFilter === s ? '#1890ff' : '#fff',
                  color: statusFilter === s ? '#fff' : '#333', fontWeight: statusFilter === s ? 700 : 400 }}>
                {s === 'ALL' ? 'All' : s === 'IN_PROGRESS' ? 'In Progress' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#555', marginBottom: '8px' }}>📅 My Week</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {weekDays.map((d, i) => {
                const ds = d.toISOString().split('T')[0];
                const h = weekDayHours[i];
                const isToday = ds === todayStr;
                const dayColor = h === 0 ? '#bbb' : h >= 8 ? '#52c41a' : h >= 4 ? '#1890ff' : '#fa8c16';
                return (
                  <div key={i} style={{ flex: '1 1 46px', textAlign: 'center', background: isToday ? '#f3eeff' : '#fafafa', border: `1px solid ${isToday ? '#7c3aed' : '#eee'}`, borderRadius: '6px', padding: '6px 4px' }}>
                    <div style={{ fontSize: '0.72rem', color: isToday ? '#7c3aed' : '#888', fontWeight: isToday ? 700 : 400 }}>{DAY_LABELS[i]}</div>
                    <div style={{ fontSize: '0.7rem', color: '#bbb', marginBottom: '2px' }}>{d.getDate()}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: dayColor }}>{h > 0 ? `${h.toFixed(1)}h` : '—'}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overdue banner */}
          {tasks.some(t => t.dueDate && t.status !== 'DONE' && new Date(t.dueDate) < Object.assign(new Date(), { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 })) && (() => {
            const today2 = new Date(); today2.setHours(0,0,0,0);
            const ov = tasks.filter(t => t.dueDate && t.status !== 'DONE' && new Date(t.dueDate) < today2);
            return (
              <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                <div>
                  <strong style={{ color: '#cf1322', fontSize: '0.9rem' }}>{ov.length} overdue task{ov.length > 1 ? 's' : ''}</strong>
                  <span style={{ color: '#cf1322', fontSize: '0.85rem' }}> — {ov.map(t => `"${t.title}"`).join(', ')}. Reopen or update status.</span>
                </div>
              </div>
            );
          })()}
          {loading && <p>Loading...</p>}
          {!loading && tasks.length === 0 && (
            <div style={styles.emptyBox}>No tasks assigned yet. Check back later!</div>
          )}
          {!loading && tasks.length > 0 && filteredTasks.length === 0 && (
            <div style={styles.emptyBox}>No tasks match your filter.</div>
          )}
          {filteredTasks.map(task => {
            const next = nextStatus(task.status);
            const logs = logsForTask(task.id);
            const isExpanded = expandedTask === task.id;
            const cardBorder = getCardBorder(task);
            return (
              <div key={task.id} style={{ ...styles.taskCard, borderLeftColor: cardBorder, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                <div style={styles.taskCardHeader}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1rem', color: '#1a1535' }}>{task.title}</strong>
                      <span style={{ ...styles.badge, background: STATUS_COLORS[task.status] || '#888' }}>{task.status?.replace('_', ' ')}</span>
                      {task.priority && <span style={{ ...styles.badge, background: PRIORITY_COLORS[task.priority] || '#888' }}>{task.priority}</span>}
                      {task.environment && (
                        <span style={{ ...styles.badge, background: ENV_COLORS[task.environment] || '#888' }}>
                          {task.environment}
                        </span>
                      )}
                      {task.onHold && (
                        <span style={{ ...styles.badge, background: '#fa8c16' }}>⏸ ON HOLD</span>
                      )}
                      {task.extensionRequested && (
                        <span style={{
                          ...styles.badge,
                          background:
                            task.extensionStatus === 'APPROVED' ? '#52c41a'
                            : task.extensionStatus === 'REJECTED' ? '#ff4d4f'
                            : '#722ed1'
                        }}>
                          {task.extensionStatus === 'APPROVED' ? '✅ EXT. APPROVED'
                            : task.extensionStatus === 'REJECTED' ? '❌ EXT. REJECTED'
                            : '🕐 EXT. PENDING'}
                        </span>
                      )}
                      {task.dueDate && (
                        <span style={{ fontSize: '0.8rem', ...getDueDateStyle(task.dueDate) }}>
                          {dueDateLabel(task.dueDate)}
                        </span>
                      )}
                    </div>
                    {task.description && <p style={{ margin: '6px 0 0', color: '#555', fontSize: '0.88rem', lineHeight: 1.5 }}>{task.description}</p>}
                    {task.onHold && task.holdReason && (
                      <p style={{ margin: '4px 0 0', color: '#fa8c16', fontSize: '0.82rem', fontStyle: 'italic' }}>
                        ⏸ On Hold: {task.holdReason}
                      </p>
                    )}
                    {task.extensionRequested && task.extensionReason && (
                      <p style={{ margin: '4px 0 0', fontSize: '0.82rem', fontStyle: 'italic',
                        color: task.extensionStatus === 'APPROVED' ? '#52c41a'
                          : task.extensionStatus === 'REJECTED' ? '#ff4d4f'
                          : '#722ed1' }}>
                        🕐 Extension: {task.extensionReason}
                        {task.extensionStatus === 'APPROVED' && ' — APPROVED by TL'}
                        {task.extensionStatus === 'REJECTED' && ' — REJECTED by TL'}
                      </p>
                    )}
                    <p style={{ margin: '4px 0 0', color: '#999', fontSize: '0.79rem' }}>
                      👤 {task.createdBy?.fullName || '—'} &nbsp;·&nbsp; ⏱ {totalHoursForTask(task.id).toFixed(1)}h logged
                    </p>
                    {hoursProgressBar(totalHoursForTask(task.id), task.maxHours)}
                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#888' }}>Environment:</span>
                      <select
                        value={task.environment || ''}
                        onChange={e => updateEnvironment(task, e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ccc', background: '#fafafa', cursor: 'pointer' }}
                      >
                        <option value="">— Not set —</option>
                        <option value="DEV">DEV</option>
                        <option value="TEST">TEST</option>
                        <option value="PRE">PRE</option>
                        <option value="PRO">PRO</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexShrink: 0, flexWrap: 'wrap' }}>
                    {next && (
                      <button onClick={() => updateStatus(task, next)} style={{ ...styles.btnSmall, background: STATUS_COLORS[next] }}>
                        → {next.replace('_', ' ')}
                      </button>
                    )}
                    {task.status === 'DONE' && (
                      <button onClick={() => updateStatus(task, 'IN_PROGRESS')} style={{ ...styles.btnSmall, background: '#fa8c16' }}>
                        ↩ Reopen
                      </button>
                    )}
                    {task.onHold ? (
                      <button onClick={() => updateHold(task, false, null)} style={{ ...styles.btnSmall, background: '#52c41a' }}>
                        ▶ Remove Hold
                      </button>
                    ) : (
                      <button onClick={() => setShowHoldInput(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                        style={{ ...styles.btnSmall, background: '#fa8c16' }}>
                        ⏸ On Hold
                      </button>
                    )}
                    {task.extensionRequested && task.extensionStatus === 'PENDING' ? (
                      <button onClick={() => requestExtension(task, false, null)} style={{ ...styles.btnSmall, background: '#52c41a' }}>
                        ✓ Cancel Extension
                      </button>
                    ) : (
                      task.maxHours && totalHoursForTask(task.id) >= task.maxHours * 0.8 && !task.extensionRequested && (
                        <button onClick={() => setShowExtInput(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                          style={{ ...styles.btnSmall, background: '#722ed1' }}>
                          🚩 Request Extension
                        </button>
                      )
                    )}
                    <button onClick={() => {
                      setExpandedTask(isExpanded ? null : task.id);
                      setLogForm(f => ({ ...f, taskId: task.id }));
                      setLogMsg(''); setLogErr('');
                      if (!isExpanded) {
                        // Pre-fill planview from task defaults (employee can change per-day)
                        setPlanviewProject(task.planviewProject || '');
                        setMacroFase(task.macroFase || '');
                        setBillable(task.billable !== false ? 'true' : 'false');
                        setWorkType(task.workType || 'Project');
                        setPlanviewMissing(!task.planviewProject || !task.macroFase);
                        loadComments(task.id);
                      }
                    }} style={styles.btnSmallSecondary}>
                      {isExpanded ? 'Close' : 'Log Time'}
                    </button>
                  </div>
                </div>

                {/* Hold reason input */}
                {showHoldInput[task.id] && !task.onHold && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', padding: '8px 10px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.82rem', color: '#d46b08', whiteSpace: 'nowrap' }}>Hold reason:</span>
                    <input
                      value={holdReasonInputs[task.id] || ''}
                      onChange={e => setHoldReasonInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                      placeholder="e.g. waiting on DB access from infra team"
                      style={{ ...styles.input, flex: 1, fontSize: '0.85rem', padding: '4px 8px' }}
                    />
                    <button onClick={() => updateHold(task, true, holdReasonInputs[task.id])}
                      style={{ ...styles.btnSmall, background: '#fa8c16', whiteSpace: 'nowrap' }}>
                      Confirm Hold
                    </button>
                    <button onClick={() => setShowHoldInput(prev => ({ ...prev, [task.id]: false }))}
                      style={styles.btnSmallSecondary}>Cancel</button>
                  </div>
                )}

                {/* Extension reason input */}
                {showExtInput[task.id] && !task.extensionRequested && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', padding: '8px 10px', background: '#f9f0ff', border: '1px solid #d3adf7', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.82rem', color: '#531dab', whiteSpace: 'nowrap' }}>Extension reason:</span>
                    <input
                      value={extReasonInputs[task.id] || ''}
                      onChange={e => setExtReasonInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                      placeholder="e.g. scope increased, need 3 more days"
                      style={{ ...styles.input, flex: 1, fontSize: '0.85rem', padding: '4px 8px' }}
                    />
                    <button onClick={() => requestExtension(task, true, extReasonInputs[task.id])}
                      style={{ ...styles.btnSmall, background: '#722ed1', whiteSpace: 'nowrap' }}>
                      Send Request
                    </button>
                    <button onClick={() => setShowExtInput(prev => ({ ...prev, [task.id]: false }))}
                      style={styles.btnSmallSecondary}>Cancel</button>
                  </div>
                )}

                {isExpanded && (
                  <div style={styles.taskExpanded}>
                    {/* Log time inline */}
                    <form onSubmit={handleLogTime} style={styles.logForm}>
                      <strong style={{ fontSize: '0.9rem' }}>Log time for this task</strong>

                      {/* Planview fields — always editable */}
                      <div style={{ background: planviewMissing ? '#fffbe6' : '#f6ffed', border: `1px solid ${planviewMissing ? '#ffe58f' : '#b7eb8f'}`, borderRadius: '6px', padding: '10px', marginTop: '8px' }}>
                        <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '0.8rem', color: planviewMissing ? '#7c5500' : '#237804' }}>
                          {planviewMissing ? '⚠ Planview details missing — please fill in' : '📋 Planview / Reporting Info'}
                        </p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ fontSize: '0.78rem', color: '#555' }}>Planview Project <span style={{ color: '#ff4d4f' }}>*</span></label>
                            <input type="text" value={planviewProject} onChange={e => setPlanviewProject(e.target.value)}
                              placeholder="e.g. 0023299 - Name Detection"
                              required style={{ ...styles.input, fontSize: '0.85rem', padding: '4px 8px' }} />
                          </div>
                          <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ fontSize: '0.78rem', color: '#555' }}>Macro Fase <span style={{ color: '#ff4d4f' }}>*</span></label>
                            <input type="text" value={macroFase} onChange={e => setMacroFase(e.target.value)}
                              placeholder="e.g. 1-Name Detection"
                              required style={{ ...styles.input, fontSize: '0.85rem', padding: '4px 8px' }} />
                          </div>
                          <div style={{ flex: '0 1 130px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ fontSize: '0.78rem', color: '#555' }}>Billable</label>
                            <select value={billable} onChange={e => setBillable(e.target.value)} style={{ ...styles.input, fontSize: '0.85rem', padding: '4px 8px' }}>
                              <option value="true">Billable</option>
                              <option value="false">Non-Billable</option>
                            </select>
                          </div>
                          <div style={{ flex: '0 1 130px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ fontSize: '0.78rem', color: '#555' }}>Type</label>
                            <select value={workType} onChange={e => setWorkType(e.target.value)} style={{ ...styles.input, fontSize: '0.85rem', padding: '4px 8px' }}>
                              <option value="Project">Project</option>
                              <option value="Maintenance">Maintenance</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
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
                              <th style={styles.th}>Planview Project</th>
                              <th style={styles.th}>Macro Fase</th>
                              <th style={styles.th}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {logs.map(l => (
                              <tr key={l.id}>
                                {editingLogId === l.id ? (
                                  <>
                                    <td style={styles.td}>
                                      <input type="date" value={editForm.date}
                                        onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                                        style={{ ...styles.input, width: '120px', padding: '2px 4px' }} />
                                    </td>
                                    <td style={styles.td}>
                                      <input type="number" value={editForm.hours} min="0.01" step="any"
                                        onChange={e => setEditForm(f => ({ ...f, hours: e.target.value }))}
                                        style={{ ...styles.input, width: '70px', padding: '2px 4px' }} />
                                    </td>
                                    <td style={styles.td}>
                                      <input type="text" value={editForm.planviewProject}
                                        onChange={e => setEditForm(f => ({ ...f, planviewProject: e.target.value }))}
                                        placeholder="Planview Project"
                                        style={{ ...styles.input, width: '140px', padding: '2px 4px' }} />
                                    </td>
                                    <td style={styles.td}>
                                      <input type="text" value={editForm.macroFase}
                                        onChange={e => setEditForm(f => ({ ...f, macroFase: e.target.value }))}
                                        placeholder="Macro Fase"
                                        style={{ ...styles.input, width: '120px', padding: '2px 4px' }} />
                                    </td>
                                    <td style={styles.td}>
                                      <button onClick={() => handleEditLog(l.id)} style={{ ...styles.btnSmall, background: '#52c41a', marginRight: '4px' }}>Save</button>
                                      <button onClick={() => setEditingLogId(null)} style={styles.btnSmallSecondary}>Cancel</button>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td style={styles.td}>{l.date}</td>
                                    <td style={styles.td}>{l.hours}h</td>
                                    <td style={{ ...styles.td, fontSize: '0.8rem', color: l.planviewProject ? '#222' : '#bbb' }}>{l.planviewProject || '—'}</td>
                                    <td style={{ ...styles.td, fontSize: '0.8rem', color: l.macroFase ? '#222' : '#bbb' }}>{l.macroFase || '—'}</td>
                                    <td style={styles.td}>
                                      <button onClick={() => startEditLog(l)} style={{ ...styles.btnSmall, background: '#1890ff', marginRight: '4px' }}>Edit</button>
                                      <button onClick={() => handleDeleteLog(l.id)} style={{ ...styles.btnSmall, background: '#ff4d4f' }}>Del</button>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                            <tr>
                              <td style={{ ...styles.td, fontWeight: 700 }}>Total</td>
                              <td style={{ ...styles.td, fontWeight: 700 }}>{totalHoursForTask(task.id).toFixed(1)}h</td>
                              <td style={styles.td}></td>
                              <td style={styles.td}></td>
                              <td style={styles.td}></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                    {logs.length === 0 && <p style={{ color: '#aaa', fontSize: '0.85rem', margin: '8px 0 0' }}>No time logged for this task yet.</p>}

                    {/* Comments / Notes section */}
                    <div>
                      <strong style={{ fontSize: '0.9rem', color: '#555' }}>💬 Notes / Comments</strong>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                        <input
                          value={commentInputs[task.id] || ''}
                          onChange={e => setCommentInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && addComment(task.id)}
                          placeholder='Add a note, e.g. "Reopened — client requested fix on validation"'
                          style={{ ...styles.input, flex: 1, fontSize: '0.85rem', padding: '5px 8px' }}
                        />
                        <button onClick={() => addComment(task.id)} style={{ ...styles.btnSmall, background: '#1890ff', whiteSpace: 'nowrap' }}>
                          + Add
                        </button>
                      </div>
                      {(taskComments[task.id] || []).length === 0
                        ? <p style={{ color: '#bbb', fontSize: '0.82rem', margin: '6px 0 0' }}>No notes yet.</p>
                        : (taskComments[task.id] || []).map(c => (
                          <div key={c.id} style={{ marginTop: '6px', padding: '6px 10px', background: '#f3eeff', borderLeft: '3px solid #7c3aed', borderRadius: '4px' }}>
                            <div style={{ fontSize: '0.85rem', color: '#222' }}>{c.content}</div>
                            <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: '2px' }}>
                              {c.authorName} · {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right panel: Announcements + Time Logs */}
        <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Hours vs Estimate panel */}
          {tasks.some(t => t.maxHours) && (
            <div style={styles.panel}>
              <h3 style={{ marginTop: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1a1535', borderLeft: '3px solid #13c2c2', paddingLeft: '8px' }}>📈 Hours vs Estimate</h3>
              <table style={{ ...styles.table, fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th style={styles.th}>Task</th>
                    <th style={styles.th}>Logged</th>
                    <th style={styles.th}>Budget</th>
                    <th style={styles.th}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.filter(t => t.maxHours).map(t => {
                    const logged = totalHoursForTask(t.id);
                    const pct = Math.round((logged / t.maxHours) * 100);
                    const color = pct >= 100 ? '#ff4d4f' : pct >= 80 ? '#fa8c16' : '#52c41a';
                    return (
                      <tr key={t.id}>
                        <td style={styles.td}>{t.title}</td>
                        <td style={{ ...styles.td, fontWeight: 700 }}>{logged.toFixed(1)}h</td>
                        <td style={styles.td}>{t.maxHours}h</td>
                        <td style={{ ...styles.td, color, fontWeight: 700 }}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Leave Plan panel */}
          <div style={styles.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1a1535', borderLeft: '3px solid #52c41a', paddingLeft: '8px' }}>🏖 Leave Plan</h3>
              <button onClick={() => { setShowLeaveForm(f => !f); setLeaveMsg(''); setLeaveErr(''); }}
                style={{ ...styles.btnSmall, background: '#1890ff' }}>
                {showLeaveForm ? 'Cancel' : '+ Request Leave'}
              </button>
            </div>

            {showLeaveForm && (
              <div style={{ background: '#f0f7ff', border: '1px solid #91caff', borderRadius: '6px', padding: '10px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '1 1 120px' }}>
                    <label style={{ fontSize: '0.78rem', color: '#555' }}>From</label>
                    <input type="date" value={leaveForm.startDate}
                      onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))}
                      style={{ ...styles.input, fontSize: '0.85rem', padding: '4px 8px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '1 1 120px' }}>
                    <label style={{ fontSize: '0.78rem', color: '#555' }}>To</label>
                    <input type="date" value={leaveForm.endDate}
                      onChange={e => setLeaveForm(f => ({ ...f, endDate: e.target.value }))}
                      style={{ ...styles.input, fontSize: '0.85rem', padding: '4px 8px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '1 1 110px' }}>
                    <label style={{ fontSize: '0.78rem', color: '#555' }}>Type</label>
                    <select value={leaveForm.leaveType} onChange={e => setLeaveForm(f => ({ ...f, leaveType: e.target.value }))}
                      style={{ ...styles.input, fontSize: '0.85rem', padding: '4px 8px' }}>
                      <option value="CASUAL">IND Casual Time Off Plan</option>
                      <option value="EARNED">IND Earned Time Off Plan</option>
                      <option value="EDUCATION">IND Education Time Off Plan</option>
                      <option value="MARRIAGE">IND Marriage Time Off Plan</option>
                      <option value="PATERNITY">IND Paternity Time Off</option>
                      <option value="WELLNESS">IND Wellness Time Off Plan</option>
                    </select>
                  </div>
                </div>
                <textarea value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Reason (optional)"
                  rows={2}
                  style={{ ...styles.input, width: '100%', resize: 'vertical', fontSize: '0.85rem', boxSizing: 'border-box', marginBottom: '8px' }} />
                <button onClick={submitLeave} disabled={leaveSubmitting || !leaveForm.startDate || !leaveForm.endDate}
                  style={{ ...styles.btnGreen, width: '100%' }}>
                  {leaveSubmitting ? 'Submitting...' : '📤 Submit Leave Request'}
                </button>
                {leaveMsg && <p style={{ color: '#52c41a', margin: '6px 0 0', fontSize: '0.85rem' }}>{leaveMsg}</p>}
                {leaveErr && <p style={{ color: '#ff4d4f', margin: '6px 0 0', fontSize: '0.85rem' }}>{leaveErr}</p>}
              </div>
            )}

            {leaveRequests.length === 0 && !showLeaveForm && (
              <p style={{ color: '#aaa', fontSize: '0.85rem' }}>No leave requests yet.</p>
            )}
            {leaveRequests.map(lr => {
              const statusColor = lr.status === 'APPROVED' ? '#52c41a' : lr.status === 'REJECTED' ? '#ff4d4f' : '#faad14';
              const typeIcons = { CASUAL: '🌴', EARNED: '📋', EDUCATION: '🎓', MARRIAGE: '💍', PATERNITY: '👶', WELLNESS: '💚' };
              const typeLabels = { CASUAL: 'Casual', EARNED: 'Earned', EDUCATION: 'Education', MARRIAGE: 'Marriage', PATERNITY: 'Paternity', WELLNESS: 'Wellness' };
              return (
                <div key={lr.id} style={{ padding: '8px 10px', marginBottom: '6px', background: '#fafafa', borderLeft: `3px solid ${statusColor}`, borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {typeIcons[lr.leaveType] || '📅'} {typeLabels[lr.leaveType] || lr.leaveType} · {lr.startDate} → {lr.endDate}
                    </span>
                    <span style={{ ...styles.badge, background: statusColor }}>{lr.status}</span>
                  </div>
                  {lr.reason && <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#666' }}>{lr.reason}</p>}
                  {lr.status === 'REJECTED' && lr.rejectReason && (
                    <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#ff4d4f' }}>Rejected: {lr.rejectReason}</p>
                  )}
                  <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#aaa' }}>
                    {lr.reviewerName ? `Reviewed by ${lr.reviewerName}` : 'Awaiting review'} · {lr.createdAt ? new Date(lr.createdAt).toLocaleDateString() : ''}
                  </p>
                </div>
              );
            })}
          </div>

          {/* End-of-Day Summary */}
          <div style={styles.panel}>
            <h3 style={{ marginTop: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1a1535', borderLeft: '3px solid #faad14', paddingLeft: '8px' }}>📋 End-of-Day Summary</h3>
            <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: '#888' }}>Write what you worked on today — your Team Lead will see this.</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <input type="date" value={eodDate} onChange={e => setEodDate(e.target.value)}
                style={{ ...styles.input, fontSize: '0.85rem', flex: '0 1 140px' }} />
            </div>
            <textarea
              value={eodContent}
              onChange={e => setEodContent(e.target.value)}
              placeholder="e.g. Fixed login validation bug, reviewed PR #42, attended sprint meeting"
              rows={4}
              style={{ ...styles.input, width: '100%', resize: 'vertical', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
            <button onClick={submitEod} disabled={eodSubmitting || !eodContent.trim()}
              style={{ ...styles.btnGreen, marginTop: '8px', width: '100%' }}>
              {eodSubmitting ? 'Saving...' : '📤 Submit Summary'}
            </button>
            {eodMsg && <p style={{ color: '#52c41a', margin: '6px 0 0', fontSize: '0.85rem' }}>{eodMsg}</p>}
            {eodErr && <p style={{ color: '#ff4d4f', margin: '6px 0 0', fontSize: '0.85rem' }}>{eodErr}</p>}
          </div>

          {/* Announcements panel */}
          <div style={styles.panel}>
            <h3 style={{ marginTop: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1a1535', borderLeft: '3px solid #7c3aed', paddingLeft: '8px' }}>📢 Announcements</h3>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1a1535', borderLeft: '3px solid #1890ff', paddingLeft: '8px' }}>Recent Time Logs</h3>
              <button onClick={() => navigate('/my-time-logs')} style={{ ...styles.btnSmallSecondary, fontSize: '0.78rem' }}>View All →</button>
            </div>
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
    </div>
  );
}

const styles = {
  page: { padding: '0 0 1.5rem', background: '#f0f1f5', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'linear-gradient(90deg, #0d0b1f 0%, #1a1535 100%)', padding: '0.85rem 1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(124,58,237,0.3)' },
  avatar: { width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.95rem', flexShrink: 0 },
  stats: { display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' },
  statCard: { background: '#fff', padding: '1rem 1rem 0.9rem', borderRadius: '8px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '90px', flex: 1 },
  body: { display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' },
  taskSection: { flex: 3, minWidth: '300px' },
  panel: { background: '#fff', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  announcementCard: { borderLeft: '3px solid #1890ff', borderRadius: '4px', padding: '8px 10px', marginBottom: '8px' },
  taskCard: { background: '#fff', borderRadius: '8px', padding: '1rem 1.2rem', marginBottom: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', borderLeft: '4px solid #1890ff' },
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
