import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const parseError = (err) => {
  const data = err?.response?.data;
  if (!data) return 'Cannot reach server.';
  if (typeof data === 'object') return Object.values(data).join(', ');
  return String(data);
};

const STATUS_COLORS = {
  ACTIVE: '#52c41a', ON_HOLD: '#faad14', COMPLETED: '#1890ff', CANCELLED: '#ff4d4f'
};

function ProjectPage() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', clientName: '', startDate: '', endDate: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const role = localStorage.getItem('tt_role');

  useEffect(() => {
    fetchProjects();
    if (role === 'ADMIN') {
      api.get('/admin/users').then(r => setUsers(r.data)).catch(() => {});
    }
  }, []);

  const fetchProjects = () => {
    api.get('/projects').then(r => setProjects(r.data)).catch(() => setError('Failed to load projects.'));
  };

  const fetchAssignments = (projectId) => {
    api.get(`/projects/${projectId}/assignments`)
      .then(r => setAssignments(prev => ({ ...prev, [projectId]: r.data })))
      .catch(() => {});
  };

  const toggleExpand = (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    fetchAssignments(id);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    api.post('/projects', form)
      .then(() => { setShowForm(false); setForm({ name: '', description: '', clientName: '', startDate: '', endDate: '' }); fetchProjects(); })
      .catch(err => setError(parseError(err)))
      .finally(() => setSubmitting(false));
  };

  const handleStatusChange = (id, status) => {
    api.put(`/projects/${id}/status?status=${status}`).then(fetchProjects).catch(err => alert(parseError(err)));
  };

  const handleAssign = (projectId, userId, roleInProject) => {
    if (!userId) return;
    api.post(`/projects/${projectId}/assign?userId=${userId}&roleInProject=${roleInProject}`)
      .then(() => fetchAssignments(projectId))
      .catch(err => alert(parseError(err)));
  };

  const handleRemoveAssignment = (assignmentId, projectId) => {
    api.delete(`/projects/assignments/${assignmentId}`)
      .then(() => fetchAssignments(projectId))
      .catch(err => alert(parseError(err)));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Projects</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowForm(!showForm)} style={styles.btnPrimary}>+ New Project</button>
          <button onClick={() => navigate('/dashboard')} style={styles.btnSecondary}>← Dashboard</button>
          <button onClick={() => { localStorage.clear(); navigate('/'); }} style={styles.btnDanger}>Logout</button>
        </div>
      </div>

      {showForm && (
        <div style={styles.formCard}>
          <h3>Create Project</h3>
          <form onSubmit={handleCreate} style={styles.form}>
            <input placeholder="Project Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={styles.input} />
            <input placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={styles.input} />
            <input placeholder="Client Name" value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})} style={styles.input} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="date" placeholder="Start Date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} style={styles.input} />
              <input type="date" placeholder="End Date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} style={styles.input} />
            </div>
            {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={submitting} style={styles.btnPrimary}>{submitting ? 'Creating...' : 'Create'}</button>
              <button type="button" onClick={() => setShowForm(false)} style={styles.btnSecondary}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {projects.map(p => (
        <div key={p.id} style={styles.projectCard}>
          <div style={styles.projectHeader}>
            <div>
              <strong style={{ fontSize: '1.1rem' }}>{p.name}</strong>
              {p.clientName && <span style={{ color: '#888', marginLeft: '10px' }}>({p.clientName})</span>}
              <p style={{ margin: '4px 0', color: '#666', fontSize: '0.9rem' }}>{p.description}</p>
              <small style={{ color: '#aaa' }}>
                {p.startDate} → {p.endDate || 'ongoing'} | Created by: {p.createdBy?.fullName || '—'}
              </small>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ ...styles.badge, background: STATUS_COLORS[p.status] || '#888' }}>{p.status}</span>
              <select value={p.status} onChange={e => handleStatusChange(p.id, e.target.value)} style={styles.select}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="ON_HOLD">ON_HOLD</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
              <button onClick={() => toggleExpand(p.id)} style={styles.btnSecondary}>
                {expandedId === p.id ? 'Hide Team' : 'View Team'}
              </button>
            </div>
          </div>

          {expandedId === p.id && (
            <div style={styles.teamSection}>
              <h4>Team Members</h4>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>Name</th><th style={styles.th}>Username</th><th style={styles.th}>Role in Project</th><th style={styles.th}></th></tr></thead>
                <tbody>
                  {(assignments[p.id] || []).map(a => (
                    <tr key={a.id}>
                      <td style={styles.td}>{a.user?.fullName}</td>
                      <td style={styles.td}>{a.user?.username}</td>
                      <td style={styles.td}>{a.roleInProject}</td>
                      <td style={styles.td}>
                        <button onClick={() => handleRemoveAssignment(a.id, p.id)} style={styles.btnSmallDanger}>Remove</button>
                      </td>
                    </tr>
                  ))}
                  {(assignments[p.id] || []).length === 0 && (
                    <tr><td colSpan={4} style={{ ...styles.td, color: '#aaa' }}>No members assigned</td></tr>
                  )}
                </tbody>
              </table>

              {role === 'ADMIN' && users.length > 0 && (
                <AssignForm users={users} onAssign={(uid, rip) => handleAssign(p.id, uid, rip)} />
              )}
            </div>
          )}
        </div>
      ))}

      {projects.length === 0 && !error && <p>No projects yet. Create one!</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

function AssignForm({ users, onAssign }) {
  const [userId, setUserId] = useState('');
  const [roleInProject, setRoleInProject] = useState('EMPLOYEE');
  return (
    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
      <select value={userId} onChange={e => setUserId(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}>
        <option value="">— Select user —</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.fullName || u.username} ({u.role})</option>)}
      </select>
      <select value={roleInProject} onChange={e => setRoleInProject(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}>
        <option value="EMPLOYEE">Employee</option>
        <option value="TEAM_LEAD">Team Lead</option>
        <option value="PROJECT_MANAGER">Project Manager</option>
      </select>
      <button onClick={() => onAssign(userId, roleInProject)} style={{ padding: '6px 14px', background: '#52c41a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Assign
      </button>
    </div>
  );
}

const styles = {
  container: { padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  formCard: { background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem', maxWidth: '600px' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem', flex: 1 },
  projectCard: { border: '1px solid #e8e8e8', borderRadius: '8px', padding: '1.2rem', marginBottom: '1rem', background: '#fff' },
  projectHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' },
  teamSection: { marginTop: '1rem', borderTop: '1px solid #f0f0f0', paddingTop: '1rem' },
  badge: { color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', whiteSpace: 'nowrap' },
  select: { padding: '4px', borderRadius: '4px', border: '1px solid #ccc' },
  btnPrimary: { padding: '8px 16px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  btnSecondary: { padding: '8px 16px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' },
  btnDanger: { padding: '8px 16px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  btnSmallDanger: { padding: '3px 10px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '8px' },
  th: { background: '#fafafa', padding: '8px', border: '1px solid #ddd', textAlign: 'left', fontSize: '0.85rem' },
  td: { padding: '8px', border: '1px solid #ddd', fontSize: '0.9rem' },
};

export default ProjectPage;
