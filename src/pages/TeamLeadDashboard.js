import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const STATUS_COLORS = { TODO: '#faad14', IN_PROGRESS: '#1890ff', DONE: '#52c41a' };
const PRIORITY_COLORS = { HIGH: '#ff4d4f', MEDIUM: '#faad14', LOW: '#52c41a' };

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
  const [quickTask, setQuickTask] = useState({ title: '', description: '', priority: 'MEDIUM', dueDate: '', assignedToId: '', status: 'TODO' });
  const [taskMsg, setTaskMsg] = useState('');
  const [taskErr, setTaskErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const fullName = localStorage.getItem('tt_fullName') || '';

  useEffect(() => {
    Promise.all([
      api.get('/tasks/team-summary'),
      api.get('/tasks'),
      api.get('/tasks/assignable-users'),
      api.get('/announcements'),
    ]).then(([summaryRes, tasksRes, empRes, annRes]) => {
      setTeam(summaryRes.data);
      setAllTasks(tasksRes.data);
      setEmployees(empRes.data);
      setAnnouncements(annRes.data.slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
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
    }).then(res => {
      const taskId = res.data.id;
      const assignPromise = quickTask.assignedToId
        ? api.put(`/tasks/${taskId}/assign?userId=${quickTask.assignedToId}`)
        : Promise.resolve();
      return assignPromise;
    }).then(() => {
      setTaskMsg('✓ Task created successfully!');
      setQuickTask({ title: '', description: '', priority: 'MEDIUM', dueDate: '', assignedToId: '', status: 'TODO' });
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
          <div style={{ ...styles.avatar, background: avatarBg(fullName) }}>{getInitials(fullName)}</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Team Lead Dashboard</h2>
            <p style={{ margin: '2px 0 0', color: '#888', fontSize: '0.85rem' }}>Welcome, <strong>{fullName}</strong></p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/tasks')} style={styles.btnPrimary}>📋 All Tasks</button>
          <button onClick={() => navigate('/add-task')} style={{ ...styles.btnPrimary, background: '#52c41a' }}>+ New Task</button>
          <button onClick={() => navigate('/time-logs')} style={{ ...styles.btnPrimary, background: '#722ed1' }}>⏱ Time Logs</button>
          <button onClick={() => navigate('/change-password')} style={styles.btnSecondary}>🔑</button>
          <button onClick={() => navigate('/profile')} style={styles.btnSecondary}>👤</button>
          <button onClick={() => { localStorage.clear(); navigate('/'); }} style={styles.btnDanger}>Logout</button>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={styles.stats}>
        <div style={styles.statCard}>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: '#1890ff' }}>{team.length}</span>
          <span style={styles.statLabel}>Team Members</span>
        </div>
        <div style={styles.statCard}>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: '#faad14' }}>{totalActive}</span>
          <span style={styles.statLabel}>Active Tasks</span>
        </div>
        <div style={styles.statCard}>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: '#52c41a' }}>{totalDone}</span>
          <span style={styles.statLabel}>Completed</span>
        </div>
        <div style={styles.statCard}>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: '#ff4d4f' }}>{totalOverdue}</span>
          <span style={styles.statLabel}>Overdue</span>
        </div>
        <div style={styles.statCard}>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: '#fa8c16' }}>{atRiskTasks.length - totalOverdue}</span>
          <span style={styles.statLabel}>Due Soon (≤3d)</span>
        </div>
      </div>

      <div style={styles.body}>
        {/* Left: Team Overview + Quick Task */}
        <div style={{ flex: 3, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Quick Task Creator */}
          <div style={styles.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>⚡ Quick Assign Task</h3>
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
                  <select value={quickTask.assignedToId} onChange={e => setQuickTask(f => ({ ...f, assignedToId: e.target.value }))} style={styles.input}>
                    <option value="">— Assign to —</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.fullName || emp.username}</option>)}
                  </select>
                  <button type="submit" disabled={submitting} style={{ ...styles.btnPrimary, whiteSpace: 'nowrap' }}>
                    {submitting ? 'Saving...' : '✓ Create'}
                  </button>
                </div>
                {taskMsg && <p style={{ color: '#52c41a', margin: '4px 0 0', fontSize: '0.85rem' }}>{taskMsg}</p>}
                {taskErr && <p style={{ color: '#ff4d4f', margin: '4px 0 0', fontSize: '0.85rem' }}>{taskErr}</p>}
              </form>
            )}
          </div>

          {/* Team Overview */}
          <div style={styles.panel}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem' }}>👥 Team Overview</h3>
            {loading && <p style={{ color: '#aaa' }}>Loading...</p>}
            {!loading && team.length === 0 && <p style={{ color: '#aaa' }}>No employees found.</p>}
            {team.map(emp => {
              const level = workloadLevel(emp);
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
                      </div>
                      <span style={{ ...styles.badge, background: level.color, fontSize: '0.72rem' }}>{level.label}</span>
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
                                </div>
                              </div>
                            );
                          })
                      }
                      <button
                        onClick={() => {
                          setShowQuickTask(true);
                          setQuickTask(f => ({ ...f, assignedToId: String(emp.id) }));
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
                      {t.assignedTo?.fullName || 'Unassigned'}
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

          {/* Announcements */}
          {announcements.length > 0 && (
            <div style={styles.panel}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>📢 Announcements</h3>
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
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '1.5rem', background: '#f0f2f5', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', flexWrap: 'wrap', gap: '10px' },
  avatar: { width: '44px', height: '44px', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', flexShrink: 0 },
  stats: { display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' },
  statCard: { background: '#fff', padding: '1rem 1.2rem', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '90px', flex: 1 },
  statLabel: { color: '#888', fontSize: '0.82rem', marginTop: '2px' },
  body: { display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' },
  panel: { background: '#fff', borderRadius: '8px', padding: '1.2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  memberCard: { borderLeft: '4px solid #1890ff', borderRadius: '6px', padding: '12px 14px', marginBottom: '10px', cursor: 'pointer' },
  memberHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' },
  miniStats: { display: 'flex', gap: '12px', fontSize: '0.85rem' },
  taskRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f0f0', gap: '8px' },
  riskCard: { borderLeft: '3px solid #ff4d4f', background: '#fafafa', borderRadius: '4px', padding: '8px 10px', marginBottom: '8px' },
  quickForm: { display: 'flex', flexDirection: 'column', gap: '8px' },
  formRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  badge: { color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600 },
  btnPrimary: { padding: '8px 14px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
  btnSecondary: { padding: '8px 14px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
  btnDanger: { padding: '8px 14px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
  btnSmall: { padding: '5px 12px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.82rem' },
  input: { padding: '7px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.88rem', minWidth: '120px' },
};

export default TeamLeadDashboard;
