import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const parseError = (err) => {
  const data = err?.response?.data;
  if (!data) return 'Cannot reach server.';
  if (typeof data === 'object') return Object.values(data).join(', ');
  return String(data);
};

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annForm, setAnnForm] = useState({ title: '', message: '', type: 'INFO' });
  const [annSubmitting, setAnnSubmitting] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', fullName: '', email: '', role: 'EMPLOYEE', departmentId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', departmentId: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [resetUserId, setResetUserId] = useState(null);
  const [resetPwd, setResetPwd] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
    api.get('/departments').then(r => setDepartments(r.data)).catch(() => {});
    api.get('/announcements').then(r => setAnnouncements(r.data)).catch(() => {});
  }, []);

  const fetchUsers = () => {
    setLoading(true);
    api.get('/admin/users')
      .then((res) => setUsers(res.data))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    api.post('/admin/users', form)
      .then(() => { setShowForm(false); setForm({ username: '', password: '', fullName: '', email: '', role: 'EMPLOYEE', departmentId: '' }); fetchUsers(); })
      .catch((err) => setError(parseError(err)))
      .finally(() => setSubmitting(false));
  };

  const handleRoleChange = (id, role) => {
    api.put(`/admin/users/${id}/role?role=${role}`)
      .then(() => fetchUsers())
      .catch((err) => alert(parseError(err)));
  };

  const handleDeleteUser = (id, username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    api.delete(`/admin/users/${id}`)
      .then(() => fetchUsers())
      .catch((err) => alert(parseError(err)));
  };

  const handlePostAnnouncement = (e) => {
    e.preventDefault();
    setAnnSubmitting(true);
    api.post('/announcements', annForm)
      .then(res => {
        setAnnouncements(prev => [res.data, ...prev]);
        setAnnForm({ title: '', message: '', type: 'INFO' });
        setShowAnnForm(false);
      })
      .catch(err => alert(parseError(err)))
      .finally(() => setAnnSubmitting(false));
  };

  const handleDeleteAnnouncement = (id) => {
    api.delete(`/announcements/${id}`)
      .then(() => setAnnouncements(prev => prev.filter(a => a.id !== id)))
      .catch(err => alert(parseError(err)));
  };

  const handleLogout = () => { localStorage.clear(); navigate('/'); };

  const handleEditUser = (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    api.put(`/admin/users/${editUser.id}`, {
      fullName: editForm.fullName,
      email: editForm.email,
      departmentId: editForm.departmentId || null,
    }).then(() => { setEditUser(null); fetchUsers(); })
      .catch(err => alert(parseError(err)))
      .finally(() => setEditSubmitting(false));
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    if (resetPwd.length < 6) { alert('Password must be at least 6 characters.'); return; }
    setResetSubmitting(true);
    api.put(`/admin/users/${resetUserId}/password`, { newPassword: resetPwd })
      .then(() => { setResetUserId(null); setResetPwd(''); alert('Password reset successfully.'); })
      .catch(err => alert(parseError(err)))
      .finally(() => setResetSubmitting(false));
  };

  const roleColor = { ADMIN: '#f5222d', TEAM_LEAD: '#1890ff', EMPLOYEE: '#52c41a' };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>👥 User Management</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => navigate('/dashboard')} style={styles.btnSecondary}>← Dashboard</button>
          <button onClick={() => setShowForm(!showForm)} style={styles.btnPrimary}>+ New User</button>
          <button onClick={handleLogout} style={styles.btnDanger}>Logout</button>
        </div>
      </div>
      <div style={{ padding: '0 1.5rem' }}>

      {showForm && (
        <div style={styles.formCard}>
          <h3>Create User</h3>
          <form onSubmit={handleCreate} style={styles.form}>
            <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required style={styles.input} />
            <input placeholder="Password (min 6 chars)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required style={styles.input} />
            <input placeholder="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required style={styles.input} />
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={styles.input} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={styles.input}>
              <option value="EMPLOYEE">Employee</option>
              <option value="TEAM_LEAD">Team Lead</option>
              <option value="ADMIN">Admin</option>
            </select>
            <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} style={styles.input}>
              <option value="">— No Department —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={submitting} style={styles.btnPrimary}>{submitting ? 'Creating...' : 'Create'}</button>
              <button type="button" onClick={() => setShowForm(false)} style={styles.btnSecondary}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading && <p>Loading...</p>}
      {!showForm && !editUser && !resetUserId && error && <p style={{ color: 'red' }}>{error}</p>}

      {editUser && (
        <div style={styles.formCard}>
          <h3 style={{ margin: '0 0 12px' }}>Edit User — <em>{editUser.username}</em></h3>
          <form onSubmit={handleEditUser} style={styles.form}>
            <input placeholder="Full Name" value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} required style={styles.input} />
            <input placeholder="Email" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} style={styles.input} />
            <select value={editForm.departmentId} onChange={e => setEditForm(f => ({ ...f, departmentId: e.target.value }))} style={styles.input}>
              <option value="">— No Department —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={editSubmitting} style={styles.btnPrimary}>{editSubmitting ? 'Saving...' : 'Save Changes'}</button>
              <button type="button" onClick={() => setEditUser(null)} style={styles.btnSecondary}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {resetUserId && (
        <div style={{ ...styles.formCard, maxWidth: '380px' }}>
          <h3 style={{ margin: '0 0 12px' }}>Reset Password — <em>{users.find(u => u.id === resetUserId)?.username}</em></h3>
          <form onSubmit={handleResetPassword} style={styles.form}>
            <input type="password" placeholder="New password (min 6 chars)" value={resetPwd}
              onChange={e => setResetPwd(e.target.value)} required minLength={6} style={styles.input} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={resetSubmitting} style={{ ...styles.btnPrimary, background: '#fa8c16' }}>{resetSubmitting ? 'Resetting...' : 'Reset Password'}</button>
              <button type="button" onClick={() => { setResetUserId(null); setResetPwd(''); }} style={styles.btnSecondary}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Username</th>
            <th style={styles.th}>Full Name</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Department</th>
            <th style={styles.th}>Role</th>
            <th style={styles.th}>Change Role</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={styles.td}>{u.id}</td>
              <td style={styles.td}>{u.username}</td>
              <td style={styles.td}>{u.fullName}</td>
              <td style={styles.td}>{u.email || '—'}</td>
              <td style={styles.td}>{u.department?.name || '—'}</td>
              <td style={styles.td}>
                <span style={{ ...styles.badge, background: roleColor[u.role] || '#888' }}>{u.role}</span>
              </td>
              <td style={styles.td}>
                <select defaultValue={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)} style={styles.select}>
                  <option value="EMPLOYEE">EMPLOYEE</option>
                  <option value="TEAM_LEAD">TEAM_LEAD</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </td>
              <td style={styles.td}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => { setEditUser(u); setEditForm({ fullName: u.fullName || '', email: u.email || '', departmentId: u.department?.id || '' }); setShowForm(false); setResetUserId(null); }}
                    style={{ padding: '4px 8px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    ✏ Edit
                  </button>
                  <button
                    onClick={() => { setResetUserId(u.id); setResetPwd(''); setEditUser(null); setShowForm(false); }}
                    style={{ padding: '4px 8px', background: '#fa8c16', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    🔑 Reset Pwd
                  </button>
                  <button onClick={() => handleDeleteUser(u.id, u.username)} style={{ padding: '4px 8px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    🗑 Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Announcements Section */}
      <div style={{ marginTop: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>📢 Announcements</h3>
          <button onClick={() => setShowAnnForm(f => !f)} style={styles.btnPrimary}>
            {showAnnForm ? 'Cancel' : '+ Post Announcement'}
          </button>
        </div>

        {showAnnForm && (
          <div style={{ ...styles.formCard, maxWidth: '540px' }}>
            <form onSubmit={handlePostAnnouncement} style={styles.form}>
              <input placeholder="Title" value={annForm.title} onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))} required style={styles.input} />
              <textarea placeholder="Message (optional)" value={annForm.message} onChange={e => setAnnForm(f => ({ ...f, message: e.target.value }))} rows={3} style={{ ...styles.input, resize: 'vertical' }} />
              <select value={annForm.type} onChange={e => setAnnForm(f => ({ ...f, type: e.target.value }))} style={styles.input}>
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="URGENT">URGENT</option>
              </select>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" disabled={annSubmitting} style={styles.btnPrimary}>{annSubmitting ? 'Posting...' : 'Post'}</button>
              </div>
            </form>
          </div>
        )}

        {announcements.length === 0 && <p style={{ color: '#aaa' }}>No announcements yet.</p>}
        {announcements.map(a => (
          <div key={a.id} style={{ ...styles.announcementCard, borderLeftColor: { INFO: '#1890ff', WARNING: '#faad14', URGENT: '#ff4d4f' }[a.type] }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong>{a.title}</strong>
                <span style={{ ...styles.badge, background: { INFO: '#1890ff', WARNING: '#faad14', URGENT: '#ff4d4f' }[a.type], marginLeft: '8px', fontSize: '0.75rem' }}>{a.type}</span>
              </div>
              <button onClick={() => handleDeleteAnnouncement(a.id)} style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '1rem' }}>🗑</button>
            </div>
            {a.message && <p style={{ margin: '4px 0 0', color: '#555', fontSize: '0.9rem' }}>{a.message}</p>}
            <p style={{ margin: '4px 0 0', color: '#aaa', fontSize: '0.78rem' }}>
              {a.createdBy?.fullName || 'Admin'} · {a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}
            </p>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '0 0 2rem', background: '#f0f1f5', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, #0d0b1f 0%, #1a1535 100%)', padding: '0.85rem 1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(124,58,237,0.3)', boxShadow: '0 2px 12px rgba(0,0,0,0.25)', flexWrap: 'wrap', gap: '8px' },
  formCard: { background: '#fff', border: 'none', borderRadius: '10px', padding: '1.5rem', marginBottom: '1.5rem', maxWidth: '480px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '9px 12px', borderRadius: '6px', border: '1px solid #e0e0ea', fontSize: '0.95rem', outline: 'none' },
  btnPrimary: { padding: '8px 18px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  btnSecondary: { padding: '8px 16px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer' },
  btnDanger: { padding: '8px 16px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' },
  th: { background: '#1a1535', color: '#fff', padding: '11px 12px', textAlign: 'left', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f0f0f6', fontSize: '0.9rem' },
  badge: { color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 },
  select: { padding: '5px 8px', borderRadius: '6px', border: '1px solid #e0e0ea' },
  announcementCard: { borderLeft: '4px solid #7c3aed', background: '#faf9ff', borderRadius: '6px', padding: '10px 14px', marginBottom: '10px' },
};

export default AdminPage;
