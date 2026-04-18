import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const STATUS_COLORS = { TODO: '#faad14', IN_PROGRESS: '#1890ff', DONE: '#52c41a' };
const PRIORITY_COLORS = { HIGH: '#ff4d4f', MEDIUM: '#faad14', LOW: '#52c41a' };
const ENV_COLORS = { DEV: '#722ed1', TEST: '#fa8c16', PRE: '#1890ff', PRO: '#52c41a' };

const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

const avatarBg = (name = '') => {
  const colors = ['#1890ff', '#722ed1', '#13c2c2', '#52c41a', '#fa8c16', '#eb2f96'];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
};

const getDueDateLabel = (dueDate) => {
  if (!dueDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((new Date(dueDate) - today) / 86400000);
  if (diff < 0) return { label: `Overdue ${Math.abs(diff)}d`, color: '#ff4d4f' };
  if (diff === 0) return { label: 'Due today', color: '#ff4d4f' };
  if (diff <= 3) return { label: `Due in ${diff}d`, color: '#fa8c16' };
  return { label: `Due ${dueDate}`, color: '#aaa' };
};

const workloadLevel = (emp) => {
  if (emp.extensionRequested > 0) return { label: 'Extension Req.', color: '#722ed1', bg: '#f9f0ff' };
  if (emp.onHold > 0) return { label: 'On Hold', color: '#fa8c16', bg: '#fff7e6' };
  if (emp.overdue > 0) return { label: 'At Risk', color: '#ff4d4f', bg: '#fff2f0' };
  if (emp.inProgress >= 3) return { label: 'Overloaded', color: '#fa8c16', bg: '#fff7e6' };
  if (emp.totalTasks - emp.done === 0) return { label: 'Available', color: '#52c41a', bg: '#f6ffed' };
  return { label: 'On Track', color: '#1890ff', bg: '#e6f7ff' };
};

function TeamLeadDashboard() {
  const [team, setTeam] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedMember, setExpandedMember] = useState(null);
  const [showQuickTask, setShowQuickTask] = useState(false);
  const [quickTask, setQuickTask] = useState({ title: '', description: '', priority: 'MEDIUM', dueDate: '', status: 'TODO', maxHours: '' });
  const [quickTaskAssignees, setQuickTaskAssignees] = useState([]);
  const [taskMsg, setTaskMsg] = useState('');
  const [taskErr, setTaskErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annForm, setAnnForm] = useState({ title: '', message: '', type: 'INFO' });
  const [annSubmitting, setAnnSubmitting] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(null); // { rows, weekLabel }
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [showLogMyHours, setShowLogMyHours] = useState(false);
  const [tlLogForm, setTlLogForm] = useState({ taskId: '', hours: '', date: new Date().toISOString().slice(0, 10), planviewProject: '', macroFase: '', billable: true, workType: 'Project' });
  const [myLogs, setMyLogs] = useState([]);
  const [tlLogMsg, setTlLogMsg] = useState('');
  const [tlLogErr, setTlLogErr] = useState('');
  const [tlLogSubmitting, setTlLogSubmitting] = useState(false);
  const [dailySummaries, setDailySummaries] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [onLeaveTodayIds, setOnLeaveTodayIds] = useState(new Set());
  const navigate = useNavigate();
  const fullName = localStorage.getItem('tt_fullName') || '';

  const fetchLeaveRequests = () => {
    Promise.allSettled([
      api.get('/leave-requests'),
      api.get('/leave-requests/on-leave-today'),
    ]).then(([lrRes, onLeaveRes]) => {
      if (lrRes.status === 'fulfilled') setLeaveRequests(lrRes.value.data);
      if (onLeaveRes.status === 'fulfilled') setOnLeaveTodayIds(new Set(onLeaveRes.value.data));
    });
  };

  useEffect(() => {
    Promise.allSettled([
      api.get('/tasks/team-summary'),
      api.get('/tasks'),
      api.get('/tasks/assignable-users'),
      api.get('/announcements'),
      api.get('/time-logs/my'),
      api.get('/daily-summaries'),
      api.get('/leave-requests'),
      api.get('/leave-requests/on-leave-today'),
    ]).then(([summaryRes, tasksRes, empRes, annRes, myLogsRes, dsRes, lrRes, onLeaveRes]) => {
      if (summaryRes.status === 'fulfilled') setTeam(summaryRes.value.data);
      if (tasksRes.status === 'fulfilled') setAllTasks(tasksRes.value.data);
      if (empRes.status === 'fulfilled') setEmployees(empRes.value.data);
      if (annRes.status === 'fulfilled') setAnnouncements(annRes.value.data.slice(0, 5));
      if (myLogsRes.status === 'fulfilled') setMyLogs(myLogsRes.value.data.slice(0, 10));
      if (dsRes.status === 'fulfilled') setDailySummaries(dsRes.value.data);
      if (lrRes.status === 'fulfilled') setLeaveRequests(lrRes.value.data);
      if (onLeaveRes.status === 'fulfilled') setOnLeaveTodayIds(new Set(onLeaveRes.value.data));
    }).finally(() => setLoading(false));

    // Auto-refresh leave requests every 30 seconds
    const interval = setInterval(fetchLeaveRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickTask = (e) => {
    e.preventDefault();
    setTaskErr(''); setTaskMsg(''); setSubmitting(true);
    api.post('/tasks', {
      title: quickTask.title,
      description: quickTask.description,
      priority: quickTask.priority,
      dueDate: quickTask.dueDate || null,
      status: 'TODO',
      maxHours: quickTask.maxHours ? parseFloat(quickTask.maxHours) : null,
    }).then(res => {
      const taskId = res.data.id;
      const assignPromise = quickTaskAssignees.length > 0
        ? api.put(`/tasks/${taskId}/assign`, quickTaskAssignees)
        : Promise.resolve();
      return assignPromise;
    }).then(() => {
      setTaskMsg('✓ Task created successfully!');
      setQuickTask({ title: '', description: '', priority: 'MEDIUM', dueDate: '', status: 'TODO', maxHours: '' });
      setQuickTaskAssignees([]);
      // Refresh team summary
      return Promise.all([api.get('/tasks/team-summary'), api.get('/tasks')]);
    }).then(([summaryRes, tasksRes]) => {
      setTeam(summaryRes.data);
      setAllTasks(tasksRes.data);
    }).catch(err => {
      const data = err?.response?.data;
      setTaskErr(data?.error || typeof data === 'string' ? data : 'Failed to create task.');
    }).finally(() => setSubmitting(false));
  };

  const openWeeklyReport = () => {
    setWeeklyLoading(true);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    api.get('/time-logs').then(res => {
      const weekLogs = res.data.filter(l => {
        const d = new Date(l.date);
        return d >= weekStart && d <= weekEnd;
      });
      const rowMap = new Map();
      weekLogs.forEach(l => {
        // Group by user + task + planviewProject + macroFase so each project/phase is a separate row
        const key = `${l.user?.id}-${l.task?.id}-${l.planviewProject || ''}-${l.macroFase || ''}`;
        if (!rowMap.has(key)) {
          rowMap.set(key, {
            resourceName: l.user?.fullName || l.user?.username || '',
            activity: l.task?.title || '',
            planviewProject: l.planviewProject || l.task?.planviewProject || '',
            macroFase: l.macroFase || l.task?.macroFase || '',
            hours: 0,
            billableStatus: l.billable !== false ? 'Billable' : 'Non-Billable',
            workType: l.workType || l.task?.workType || 'Project',
          });
        }
        rowMap.get(key).hours += l.hours || 0;
      });
      const rows = Array.from(rowMap.values());
      const wkLabel = `${weekStart.toLocaleDateString('en-GB')} – ${weekEnd.toLocaleDateString('en-GB')}`;
      setWeeklyReport({ rows, weekStart, weekLabel: wkLabel });
    }).catch(() => alert('Failed to load time logs.'))
      .finally(() => setWeeklyLoading(false));
  };

  const downloadWeeklyReport = () => {
    if (!weeklyReport) return;
    const { rows, weekStart } = weeklyReport;
    const header = ['Resource Name', 'Activity', 'Planview Project', 'Macro Fase', 'Hours', 'Billable Status', 'Project/Maintenance'];
    const csvRows = rows.map(r => [
      `"${r.resourceName}"`, `"${r.activity}"`, `"${r.planviewProject}"`,
      `"${r.macroFase}"`, r.hours, r.billableStatus, r.workType,
    ]);
    const tsv = [header, ...csvRows].map(r => r.join('\t')).join('\n');
    const blob = new Blob([tsv], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-report-${weekStart.toISOString().slice(0, 10)}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportWeeklyReport = openWeeklyReport;

  const handlePostAnnouncement = (e) => {
    e.preventDefault();
    setAnnSubmitting(true);
    api.post('/announcements', annForm)
      .then(res => {
        setAnnouncements(prev => [res.data, ...prev]);
        setAnnForm({ title: '', message: '', type: 'INFO' });
        setShowAnnForm(false);
      })
      .catch(() => alert('Failed to post announcement.'))
      .finally(() => setAnnSubmitting(false));
  };

  const handleLogMyHours = (e) => {
    e.preventDefault();
    if (!tlLogForm.taskId) { setTlLogErr('Please select a task.'); return; }
    setTlLogErr(''); setTlLogMsg(''); setTlLogSubmitting(true);
    const body = {
      hours: parseFloat(tlLogForm.hours),
      date: tlLogForm.date,
      planviewProject: tlLogForm.planviewProject || null,
      macroFase: tlLogForm.macroFase || null,
      billable: tlLogForm.billable,
      workType: tlLogForm.workType,
    };
    api.post(`/time-logs?taskId=${tlLogForm.taskId}`, body)
      .then(res => {
        setTlLogMsg('✓ Hours logged successfully!');
        setMyLogs(prev => [res.data, ...prev].slice(0, 10));
        setTlLogForm(f => ({ ...f, hours: '', planviewProject: '', macroFase: '' }));
      })
      .catch(() => setTlLogErr('Failed to save. Please check the task and try again.'))
      .finally(() => setTlLogSubmitting(false));
  };

  const deleteMyLog = (logId) => {
    api.delete(`/time-logs/my/${logId}`)
      .then(() => setMyLogs(prev => prev.filter(l => l.id !== logId)))
      .catch(() => alert('Failed to delete.'));
  };

  const reviewLeave = (id, approve, rejectReason) => {
    const params = `approve=${approve}${rejectReason ? `&rejectReason=${encodeURIComponent(rejectReason)}` : ''}`;
    api.put(`/leave-requests/${id}/review?${params}`)
      .then(res => {
        setLeaveRequests(prev => prev.map(lr => lr.id === id ? res.data : lr));
        if (approve) {
          api.get('/leave-requests/on-leave-today')
            .then(r => setOnLeaveTodayIds(new Set(r.data)))
            .catch(() => {});
        }
      })
      .catch(() => alert('Failed to review leave request.'));
  };

  const reviewExtension = (taskId, approve) => {
    const msg = approve
      ? 'Approve this extension request? The employee will be notified.'
      : 'Reject this extension request? The employee will be notified.';
    if (!window.confirm(msg)) return;
    api.put(`/tasks/${taskId}/extension-review?approve=${approve}`)
      .then(res => {
        setAllTasks(prev => prev.map(t => t.id === taskId ? res.data : t));
        // Refresh team summary to update badges
        api.get('/tasks/team-summary').then(r => setTeam(r.data)).catch(() => {});
      })
      .catch(() => alert('Failed to review extension request.'));
  };

  // Deadline risks: tasks not done, with due date within 3 days or overdue
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const atRiskTasks = allTasks.filter(t => {
    if (!t.dueDate || t.status === 'DONE') return false;
    const diff = Math.ceil((new Date(t.dueDate) - today) / 86400000);
    return diff <= 3;
  }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const totalActive = allTasks.filter(t => t.status !== 'DONE').length;
  const totalDone = allTasks.filter(t => t.status === 'DONE').length;
  const totalOverdue = atRiskTasks.filter(t => new Date(t.dueDate) < today).length;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={styles.avatar}>{getInitials(fullName)}</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>Team Lead Dashboard</h2>
            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>Welcome, <strong style={{ color: '#a78bfa' }}>{fullName}</strong></p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/tasks')} style={styles.btnPrimary}>📋 All Tasks</button>
          <button onClick={() => navigate('/add-task')} style={{ ...styles.btnPrimary, background: 'linear-gradient(135deg,#10b981,#059669)' }}>+ New Task</button>
          <button onClick={() => navigate('/time-logs')} style={{ ...styles.btnPrimary, background: 'linear-gradient(135deg,#13c2c2,#0891b2)' }}>⏱ Time Logs</button>
          <button onClick={exportWeeklyReport} style={{ ...styles.btnPrimary, background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>📅 Weekly Report</button>
          <button onClick={() => navigate('/change-password')} style={styles.btnSecondary}>🔑</button>
          <button onClick={() => navigate('/profile')} style={styles.btnSecondary}>👤</button>
          <button onClick={() => { localStorage.clear(); navigate('/'); }} style={styles.btnDanger}>Logout</button>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={styles.stats}>
        <div style={{ ...styles.statCard, borderTop: '3px solid #7c3aed' }}>
          <span style={{ fontSize: '1rem', marginBottom: '4px' }}>👥</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#7c3aed', lineHeight: 1 }}>{team.length}</span>
          <span style={styles.statLabel}>Team Members</span>
        </div>
        <div style={{ ...styles.statCard, borderTop: '3px solid #faad14' }}>
          <span style={{ fontSize: '1rem', marginBottom: '4px' }}>⚡</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#faad14', lineHeight: 1 }}>{totalActive}</span>
          <span style={styles.statLabel}>Active Tasks</span>
        </div>
        <div style={{ ...styles.statCard, borderTop: '3px solid #10b981' }}>
          <span style={{ fontSize: '1rem', marginBottom: '4px' }}>✅</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{totalDone}</span>
          <span style={styles.statLabel}>Completed</span>
        </div>
        <div style={{ ...styles.statCard, borderTop: '3px solid #ef4444', background: totalOverdue > 0 ? '#fff5f5' : '#fff' }}>
          <span style={{ fontSize: '1rem', marginBottom: '4px' }}>⚠️</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{totalOverdue}</span>
          <span style={styles.statLabel}>Overdue</span>
        </div>
        <div style={{ ...styles.statCard, borderTop: '3px solid #fa8c16' }}>
          <span style={{ fontSize: '1rem', marginBottom: '4px' }}>⏰</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#fa8c16', lineHeight: 1 }}>{atRiskTasks.length - totalOverdue}</span>
          <span style={styles.statLabel}>Due Soon (≤3d)</span>
        </div>
      </div>

      <div style={styles.body}>
        {/* Left: Team Overview + Quick Task */}
        <div style={{ flex: 3, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Quick Task Creator */}
          <div style={styles.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1a1535', borderLeft: '3px solid #7c3aed', paddingLeft: '8px' }}>⚡ Quick Assign Task</h3>
              <button onClick={() => { setShowQuickTask(f => !f); setTaskMsg(''); setTaskErr(''); }} style={styles.btnSmall}>
                {showQuickTask ? 'Cancel' : '+ Create & Assign'}
              </button>
            </div>
            {showQuickTask && (
              <form onSubmit={handleQuickTask} style={styles.quickForm}>
                <div style={styles.formRow}>
                  <input placeholder="Task title *" value={quickTask.title}
                    onChange={e => setQuickTask(f => ({ ...f, title: e.target.value }))}
                    required style={{ ...styles.input, flex: 2 }} />
                  <select value={quickTask.priority} onChange={e => setQuickTask(f => ({ ...f, priority: e.target.value }))} style={styles.input}>
                    <option value="HIGH">🔴 HIGH</option>
                    <option value="MEDIUM">🟡 MEDIUM</option>
                    <option value="LOW">🟢 LOW</option>
                  </select>
                  <input type="date" value={quickTask.dueDate}
                    onChange={e => setQuickTask(f => ({ ...f, dueDate: e.target.value }))}
                    style={styles.input} />
                </div>
                <div style={styles.formRow}>
                  <input placeholder="Description (optional)" value={quickTask.description}
                    onChange={e => setQuickTask(f => ({ ...f, description: e.target.value }))}
                    style={{ ...styles.input, flex: 2 }} />
                  <input
                    type="number" min="0" step="0.5" placeholder="Max Hours"
                    value={quickTask.maxHours}
                    onChange={e => setQuickTask(f => ({ ...f, maxHours: e.target.value }))}
                    style={{ ...styles.input, width: '110px' }}
                    title="Maximum hours budget for this task"
                  />
                  <button type="submit" disabled={submitting} style={{ ...styles.btnPrimary, whiteSpace: 'nowrap' }}>
                    {submitting ? 'Saving...' : '✓ Create'}
                  </button>
                </div>
                <div style={styles.formRow}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.82rem', color: '#555', display: 'block', marginBottom: '4px' }}>Assign To (select one or more)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {employees.map(emp => (
                        <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', cursor: 'pointer', background: quickTaskAssignees.includes(emp.id) ? '#e6f7ff' : '#f5f5f5', border: `1px solid ${quickTaskAssignees.includes(emp.id) ? '#1890ff' : '#ddd'}`, borderRadius: '4px', padding: '3px 8px' }}>
                          <input
                            type="checkbox"
                            checked={quickTaskAssignees.includes(emp.id)}
                            onChange={e => setQuickTaskAssignees(prev =>
                              e.target.checked ? [...prev, emp.id] : prev.filter(id => id !== emp.id)
                            )}
                            style={{ margin: 0 }}
                          />
                          {emp.fullName?.split(' ')[0] || emp.username}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                {taskMsg && <p style={{ color: '#52c41a', margin: '4px 0 0', fontSize: '0.85rem' }}>{taskMsg}</p>}
                {taskErr && <p style={{ color: '#ff4d4f', margin: '4px 0 0', fontSize: '0.85rem' }}>{taskErr}</p>}
              </form>
            )}
          </div>

          {/* Log My Hours */}
          <div style={styles.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>⏱ Log My Hours</h3>
              <button onClick={() => { setShowLogMyHours(f => !f); setTlLogMsg(''); setTlLogErr(''); }} style={styles.btnSmall}>
                {showLogMyHours ? 'Cancel' : '+ Log Hours'}
              </button>
            </div>
            {showLogMyHours && (
              <form onSubmit={handleLogMyHours} style={styles.quickForm}>
                <div style={styles.formRow}>
                  <select value={tlLogForm.taskId} onChange={e => setTlLogForm(f => ({ ...f, taskId: e.target.value }))} style={{ ...styles.input, flex: 2 }} required>
                    <option value="">— Select Task —</option>
                    {allTasks.filter(t => t.status !== 'DONE').map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                  <input type="number" min="0.5" max="24" step="0.5" placeholder="Hours *" required
                    value={tlLogForm.hours} onChange={e => setTlLogForm(f => ({ ...f, hours: e.target.value }))}
                    style={{ ...styles.input, width: '90px' }} />
                  <input type="date" value={tlLogForm.date}
                    onChange={e => setTlLogForm(f => ({ ...f, date: e.target.value }))}
                    required style={styles.input} />
                </div>
                <div style={styles.formRow}>
                  <input placeholder="Planview Project" value={tlLogForm.planviewProject}
                    onChange={e => setTlLogForm(f => ({ ...f, planviewProject: e.target.value }))}
                    style={{ ...styles.input, flex: 1 }} />
                  <input placeholder="Macro Fase" value={tlLogForm.macroFase}
                    onChange={e => setTlLogForm(f => ({ ...f, macroFase: e.target.value }))}
                    style={{ ...styles.input, flex: 1 }} />
                  <select value={tlLogForm.workType} onChange={e => setTlLogForm(f => ({ ...f, workType: e.target.value }))} style={styles.input}>
                    <option value="Project">Project</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Support">Support</option>
                    <option value="Meeting">Meeting</option>
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={tlLogForm.billable} onChange={e => setTlLogForm(f => ({ ...f, billable: e.target.checked }))} />
                    Billable
                  </label>
                  <button type="submit" disabled={tlLogSubmitting} style={{ ...styles.btnPrimary, whiteSpace: 'nowrap' }}>
                    {tlLogSubmitting ? 'Saving...' : '✓ Log'}
                  </button>
                </div>
                {tlLogMsg && <p style={{ color: '#52c41a', margin: '4px 0 0', fontSize: '0.85rem' }}>{tlLogMsg}</p>}
                {tlLogErr && <p style={{ color: '#ff4d4f', margin: '4px 0 0', fontSize: '0.85rem' }}>{tlLogErr}</p>}
              </form>
            )}
            {myLogs.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginTop: showLogMyHours ? '12px' : 0 }}>
                <thead>
                  <tr style={{ background: '#f0f2f5' }}>
                    {['Date', 'Task', 'Hours', 'Project', ''].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #e8e8e8', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myLogs.map(l => (
                    <tr key={l.id}>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' }}>{l.date}</td>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.task?.title || '—'}</td>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', fontWeight: 700, color: '#1890ff' }}>{l.hours}h</td>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', color: '#888', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.planviewProject || '—'}</td>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0' }}>
                        <button onClick={() => deleteMyLog(l.id)} style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }} title="Delete">🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {myLogs.length === 0 && !showLogMyHours && <p style={{ color: '#aaa', fontSize: '0.85rem', margin: 0 }}>No personal time logs yet.</p>}
          </div>

          {/* Team Overview */}
          <div style={styles.panel}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem' }}>👥 Team Overview</h3>
            {loading && <p style={{ color: '#aaa' }}>Loading...</p>}
            {!loading && team.length === 0 && <p style={{ color: '#aaa' }}>No employees found.</p>}
            {team.map(emp => {
              const level = workloadLevel(emp);
              const isOnLeave = onLeaveTodayIds.has(emp.id);
              const isExpanded = expandedMember === emp.id;
              return (
                <div key={emp.id} style={{ ...styles.memberCard, background: level.bg, borderLeftColor: level.color }}>
                  <div style={styles.memberHeader} onClick={() => setExpandedMember(isExpanded ? null : emp.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ ...styles.avatar, width: '36px', height: '36px', fontSize: '0.85rem', background: avatarBg(emp.fullName || '') }}>
                        {getInitials(emp.fullName || '')}
                      </div>
                      <div>
                        <strong>{emp.fullName || emp.username}</strong>
                        <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#888' }}>{emp.email || emp.username}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={styles.miniStats}>
                        <span title="To Do" style={{ color: '#faad14' }}>📋 {emp.todo}</span>
                        <span title="In Progress" style={{ color: '#1890ff' }}>▶ {emp.inProgress}</span>
                        <span title="Done" style={{ color: '#52c41a' }}>✓ {emp.done}</span>
                        {emp.overdue > 0 && <span title="Overdue" style={{ color: '#ff4d4f', fontWeight: 700 }}>⚠ {emp.overdue}</span>}
                        {emp.onHold > 0 && <span title="On Hold" style={{ color: '#fa8c16', fontWeight: 700 }}>⏸ {emp.onHold}</span>}
                        {emp.extensionRequested > 0 && <span title="Extension Requested" style={{ color: '#722ed1', fontWeight: 700 }}>🚩 {emp.extensionRequested}</span>}
                      </div>
                      <span style={{ ...styles.badge, background: level.color, fontSize: '0.72rem' }}>{level.label}</span>
                      {isOnLeave && <span style={{ ...styles.badge, background: '#13c2c2', fontSize: '0.72rem' }}>🏖 On Leave</span>}
                      <span style={{ color: '#aaa', fontSize: '0.9rem' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      {emp.activeTasks.length === 0
                        ? <p style={{ color: '#aaa', fontSize: '0.85rem', margin: 0 }}>No active tasks.</p>
                        : emp.activeTasks.map(t => {
                            const due = getDueDateLabel(t.dueDate);
                            return (
                              <div key={t.id} style={styles.taskRow}>
                                <div style={{ flex: 1 }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{t.title}</span>
                                  {due && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: due.color, fontWeight: 600 }}>{due.label}</span>}
                                </div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span style={{ ...styles.badge, background: STATUS_COLORS[t.status] || '#888', fontSize: '0.72rem' }}>
                                    {t.status.replace('_', ' ')}
                                  </span>
                                  {t.priority && t.priority !== '—' && (
                                    <span style={{ ...styles.badge, background: PRIORITY_COLORS[t.priority] || '#888', fontSize: '0.72rem' }}>
                                      {t.priority}
                                    </span>
                                  )}
                                  {t.environment && (
                                    <span style={{ ...styles.badge, background: ENV_COLORS[t.environment] || '#888', fontSize: '0.72rem' }}>
                                      {t.environment}
                                    </span>
                                  )}
                                  {t.onHold && (
                                    <span style={{ ...styles.badge, background: '#fa8c16', fontSize: '0.72rem' }}>
                                      ⏸ ON HOLD
                                    </span>
                                  )}
                                  {t.extensionRequested && (
                                    <>
                                      <span style={{
                                        ...styles.badge, fontSize: '0.72rem',
                                        background:
                                          t.extensionStatus === 'APPROVED' ? '#52c41a'
                                          : t.extensionStatus === 'REJECTED' ? '#ff4d4f'
                                          : '#722ed1'
                                      }}>
                                        {t.extensionStatus === 'APPROVED' ? '✅ EXT. APPROVED'
                                          : t.extensionStatus === 'REJECTED' ? '❌ EXT. REJECTED'
                                          : '🕐 EXT. PENDING'}
                                      </span>
                                      {(!t.extensionStatus || t.extensionStatus === 'PENDING') && (
                                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                          <button
                                            onClick={() => reviewExtension(t.id, true)}
                                            style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: '4px', border: 'none', background: '#52c41a', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                                            ✓ Approve
                                          </button>
                                          <button
                                            onClick={() => reviewExtension(t.id, false)}
                                            style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: '4px', border: 'none', background: '#ff4d4f', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                                            ✕ Reject
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })
                      }
                      <button
                        onClick={() => {
                          setShowQuickTask(true);
                          setQuickTaskAssignees([emp.id]);
                          setTaskMsg(''); setTaskErr('');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        style={{ ...styles.btnSmall, marginTop: '10px', background: '#1890ff' }}>
                        + Assign Task to {emp.fullName?.split(' ')[0]}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Deadline Risks + Announcements */}
        <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Deadline Risk Panel */}
          <div style={styles.panel}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>🚨 Deadline Risks</h3>
            {atRiskTasks.length === 0 && <p style={{ color: '#52c41a', fontSize: '0.85rem' }}>✓ No tasks at risk.</p>}
            {atRiskTasks.map(t => {
              const due = getDueDateLabel(t.dueDate);
              return (
                <div key={t.id} style={{ ...styles.riskCard, borderLeftColor: due?.color || '#888' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{t.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#888' }}>
                      {t.assignees && t.assignees.length > 0
                        ? t.assignees.map(u => u.fullName || u.username).join(', ')
                        : 'Unassigned'}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: due?.color, fontWeight: 700 }}>{due?.label}</span>
                  </div>
                  <span style={{ ...styles.badge, background: STATUS_COLORS[t.status] || '#888', fontSize: '0.7rem', marginTop: '4px', display: 'inline-block' }}>
                    {t.status?.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Leave Requests Panel */}
          <div style={styles.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>🏖 Leave Requests</h3>
              <button onClick={fetchLeaveRequests} style={{ ...styles.btnSmall, background: '#1890ff', fontSize: '0.75rem', padding: '3px 10px' }}>↻ Refresh</button>
            </div>
            {leaveRequests.length === 0 && <p style={{ color: '#aaa', fontSize: '0.85rem', margin: 0 }}>No leave requests.</p>}
            {leaveRequests.map(lr => {
              const statusColor = lr.status === 'APPROVED' ? '#52c41a' : lr.status === 'REJECTED' ? '#ff4d4f' : '#faad14';
              const typeIcons = { CASUAL: '🌴', EARNED: '📋', EDUCATION: '🎓', MARRIAGE: '💍', PATERNITY: '👶', WELLNESS: '💚' };
              const typeLabels = { CASUAL: 'Casual', EARNED: 'Earned', EDUCATION: 'Education', MARRIAGE: 'Marriage', PATERNITY: 'Paternity', WELLNESS: 'Wellness' };
              return (
                <div key={lr.id} style={{ ...styles.riskCard, borderLeftColor: statusColor, marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '4px' }}>
                    <div>
                      <strong style={{ fontSize: '0.88rem' }}>{lr.employeeName}</strong>
                      <span style={{ marginLeft: '6px', fontSize: '0.78rem', color: '#888' }}>
                        {typeIcons[lr.leaveType] || '📅'} {typeLabels[lr.leaveType] || lr.leaveType}
                      </span>
                    </div>
                    <span style={{ ...styles.badge, background: statusColor, fontSize: '0.7rem' }}>{lr.status}</span>
                  </div>
                  <p style={{ margin: '3px 0', fontSize: '0.8rem', color: '#555' }}>
                    {lr.startDate} → {lr.endDate}
                  </p>
                  {lr.reason && <p style={{ margin: '2px 0', fontSize: '0.78rem', color: '#888', fontStyle: 'italic' }}>{lr.reason}</p>}
                  {lr.status === 'REJECTED' && lr.rejectReason && (
                    <p style={{ margin: '2px 0', fontSize: '0.75rem', color: '#ff4d4f' }}>Reason: {lr.rejectReason}</p>
                  )}
                  {lr.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <button onClick={() => reviewLeave(lr.id, true, null)}
                        style={{ ...styles.btnSmall, background: '#52c41a', fontSize: '0.78rem', padding: '3px 10px' }}>
                        ✓ Approve
                      </button>
                      <button onClick={() => {
                        const reason = window.prompt('Reason for rejection (optional):');
                        if (reason !== null) reviewLeave(lr.id, false, reason || null);
                      }} style={{ ...styles.btnSmall, background: '#ff4d4f', fontSize: '0.78rem', padding: '3px 10px' }}>
                        ✕ Reject
                      </button>
                    </div>
                  )}
                  {lr.reviewerName && (
                    <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#aaa' }}>
                      Reviewed by {lr.reviewerName}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* EOD Summaries */}
          <div style={styles.panel}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>📋 End-of-Day Summaries</h3>
            {dailySummaries.length === 0 && <p style={{ color: '#aaa', fontSize: '0.85rem', margin: 0 }}>No summaries submitted yet.</p>}
            {dailySummaries.slice(0, 15).map(ds => (
              <div key={ds.id} style={{ borderLeft: '3px solid #1890ff', background: '#f6f8fa', borderRadius: '4px', padding: '8px 10px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#222' }}>{ds.authorName}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#aaa' }}>{ds.summaryDate}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#555', lineHeight: '1.4' }}>{ds.content}</p>
              </div>
            ))}
          </div>

          {/* Announcements */}
          <div style={styles.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>📢 Announcements</h3>
              <button onClick={() => setShowAnnForm(f => !f)} style={styles.btnSmall}>
                {showAnnForm ? 'Cancel' : '+ Post'}
              </button>
            </div>
            {showAnnForm && (
              <form onSubmit={handlePostAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                <input placeholder="Title *" value={annForm.title} onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))} required style={styles.input} />
                <textarea placeholder="Message (optional)" value={annForm.message} onChange={e => setAnnForm(f => ({ ...f, message: e.target.value }))} rows={2} style={{ ...styles.input, resize: 'vertical' }} />
                <select value={annForm.type} onChange={e => setAnnForm(f => ({ ...f, type: e.target.value }))} style={styles.input}>
                  <option value="INFO">INFO</option>
                  <option value="WARNING">WARNING</option>
                  <option value="URGENT">URGENT</option>
                </select>
                <button type="submit" disabled={annSubmitting} style={{ ...styles.btnSmall, background: '#52c41a', alignSelf: 'flex-start' }}>
                  {annSubmitting ? 'Posting...' : '✓ Post Announcement'}
                </button>
              </form>
            )}
            {announcements.length === 0 && !showAnnForm && <p style={{ color: '#aaa', fontSize: '0.85rem', margin: 0 }}>No announcements yet.</p>}
            {announcements.map(a => (
              <div key={a.id} style={{ ...styles.riskCard, borderLeftColor: { INFO: '#1890ff', WARNING: '#faad14', URGENT: '#ff4d4f' }[a.type] || '#888', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: '0.88rem' }}>{a.title}</strong>
                  <button
                    onClick={() => api.delete(`/announcements/${a.id}`).then(() => setAnnouncements(prev => prev.filter(x => x.id !== a.id))).catch(() => alert('Cannot delete'))}
                    style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '0.9rem', padding: '0 0 0 8px' }}
                    title="Delete announcement"
                  >🗑</button>
                </div>
                {a.message && <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#555' }}>{a.message}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Report Modal */}
      {weeklyLoading && (
        <div style={modalStyles.overlay}>
          <div style={{ color: '#fff', fontSize: '1.1rem' }}>Loading time logs...</div>
        </div>
      )}
      {weeklyReport && (
        <div style={modalStyles.overlay} onClick={() => setWeeklyReport(null)}>
          <div style={modalStyles.box} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0 }}>📅 Weekly Report</h3>
                <p style={{ margin: '2px 0 0', color: '#888', fontSize: '0.85rem' }}>{weeklyReport.weekLabel}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={downloadWeeklyReport} style={{ ...styles.btnPrimary, background: '#13c2c2' }}>⬇ Download .tsv</button>
                <button onClick={() => setWeeklyReport(null)} style={styles.btnSecondary}>✕ Close</button>
              </div>
            </div>
            {weeklyReport.rows.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>No time logs found for this week.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f0f2f5' }}>
                      {['Resource Name', 'Activity', 'Planview Project', 'Macro Fase', 'Hours', 'Billable Status', 'Project/Maintenance'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #e8e8e8', whiteSpace: 'nowrap', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyReport.rows.map((r, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={modalStyles.td}>{r.resourceName}</td>
                        <td style={modalStyles.td}>{r.activity}</td>
                        <td style={modalStyles.td}>{r.planviewProject || <span style={{ color: '#bbb' }}>—</span>}</td>
                        <td style={modalStyles.td}>{r.macroFase || <span style={{ color: '#bbb' }}>—</span>}</td>
                        <td style={{ ...modalStyles.td, fontWeight: 700, color: '#1890ff' }}>{r.hours}</td>
                        <td style={modalStyles.td}>
                          <span style={{ color: r.billableStatus === 'Billable' ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>{r.billableStatus}</span>
                        </td>
                        <td style={modalStyles.td}>{r.workType}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f0f2f5' }}>
                      <td colSpan={4} style={{ ...modalStyles.td, fontWeight: 700, textAlign: 'right' }}>Total Hours:</td>
                      <td style={{ ...modalStyles.td, fontWeight: 700, color: '#1890ff' }}>
                        {weeklyReport.rows.reduce((sum, r) => sum + r.hours, 0)}
                      </td>
                      <td colSpan={2} style={modalStyles.td} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const modalStyles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  box: { background: '#fff', borderRadius: '10px', padding: '1.5rem', width: '100%', maxWidth: '950px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
  td: { padding: '8px 12px', borderBottom: '1px solid #f0f0f0', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
};

const styles = {
  page: { background: '#f0f1f5', minHeight: '100vh', padding: '0 0 2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, #0d0b1f 0%, #1a1535 100%)', padding: '0.85rem 1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(124,58,237,0.3)', boxShadow: '0 2px 12px rgba(0,0,0,0.25)', flexWrap: 'wrap', gap: '10px' },
  avatar: { width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.95rem', flexShrink: 0 },
  stats: { display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap', padding: '0 1.5rem' },
  statCard: { background: '#fff', padding: '1rem 1rem 0.9rem', borderRadius: '10px', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '90px', flex: 1 },
  statLabel: { color: '#666', fontSize: '0.75rem', marginTop: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  body: { display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap', padding: '0 1.5rem' },
  panel: { background: '#fff', borderRadius: '10px', padding: '1.2rem', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' },
  memberCard: { borderLeft: '4px solid #7c3aed', background: '#faf9ff', borderRadius: '8px', padding: '12px 14px', marginBottom: '10px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  memberHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' },
  miniStats: { display: 'flex', gap: '12px', fontSize: '0.85rem' },
  taskRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f0f5', gap: '8px' },
  riskCard: { borderLeft: '3px solid #ef4444', background: '#fff5f5', borderRadius: '6px', padding: '8px 10px', marginBottom: '8px' },
  quickForm: { display: 'flex', flexDirection: 'column', gap: '8px' },
  formRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  badge: { color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600 },
  btnPrimary: { padding: '8px 14px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
  btnSecondary: { padding: '8px 14px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' },
  btnDanger: { padding: '8px 14px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
  btnSmall: { padding: '5px 12px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' },
  input: { padding: '8px 10px', border: '1px solid #e0e0ea', borderRadius: '6px', fontSize: '0.88rem', minWidth: '120px', outline: 'none' },
};

export default TeamLeadDashboard;
