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

  const roleColor = { ADMIN: '#f5222d', TEAM_LEAD: '#1890ff', EMPLOYEE: '#52c41a' };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>User Management</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => navigate('/dashboard')} style={styles.btnSecondary}>← Dashboard</button>
          <button onClick={() => setShowForm(!showForm)} style={styles.btnPrimary}>+ New User</button>
          <button onClick={handleLogout} style={styles.btnDanger}>Logout</button>
        </div>
      </div>

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
      {!showForm && error && <p style={{ color: 'red' }}>{error}</p>}

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
                <button onClick={() => handleDeleteUser(u.id, u.username)} style={{ padding: '4px 10px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  🗑 Delete
                </button>
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
  );
}

const styles = {
  container: { padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  formCard: { background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem', maxWidth: '480px' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' },
  btnPrimary: { padding: '8px 16px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  btnSecondary: { padding: '8px 16px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' },
  btnDanger: { padding: '8px 16px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: '#fafafa', padding: '10px', border: '1px solid #ddd', textAlign: 'left' },
  td: { padding: '10px', border: '1px solid #ddd' },
  badge: { color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem' },
  select: { padding: '4px', borderRadius: '4px', border: '1px solid #ccc' },
  announcementCard: { borderLeft: '3px solid #1890ff', background: '#f9f9f9', borderRadius: '4px', padding: '10px 14px', marginBottom: '10px' },
};

export default AdminPage;
