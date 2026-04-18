import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

const ROLE_LABEL = { ADMIN: 'Admin', TEAM_LEAD: 'Team Lead', EMPLOYEE: 'Employee' };
const ROLE_COLOR = { ADMIN: '#f5222d', TEAM_LEAD: '#1890ff', EMPLOYEE: '#52c41a' };

function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [timeLogs, setTimeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const role = localStorage.getItem('tt_role');

  const backPath = role === 'EMPLOYEE' ? '/my-tasks' : role === 'TEAM_LEAD' ? '/tl-dashboard' : '/dashboard';

  useEffect(() => {
    const profileReq = api.get('/admin/users/me');
    const logsReq = role === 'EMPLOYEE'
      ? api.get('/time-logs/my')
      : Promise.resolve({ data: [] });

    Promise.all([profileReq, logsReq])
      .then(([profRes, logRes]) => {
        setProfile(profRes.data);
        setTimeLogs(logRes.data);
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.page}><p>Loading...</p></div>;
  if (error) return <div style={styles.page}><p style={{ color: 'red' }}>{error}</p></div>;
  if (!profile) return null;

  const initials = getInitials(profile.fullName || '');
  const roleColor = ROLE_COLOR[profile.role] || '#888';
  const roleLabel = ROLE_LABEL[profile.role] || profile.role;

  const totalHours = timeLogs.reduce((s, l) => s + (l.hours || 0), 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthHours = timeLogs
    .filter(l => l.date && l.date.startsWith(thisMonth))
    .reduce((s, l) => s + (l.hours || 0), 0);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate(backPath)} style={styles.btnSecondary}>← Back</button>
        <button onClick={() => navigate('/change-password')} style={styles.btnPrimary}>🔑 Change Password</button>
      </div>

      <div style={styles.card}>
        {/* Avatar + Name */}
        <div style={styles.avatarSection}>
          <div style={{ ...styles.avatar, background: `linear-gradient(135deg, ${roleColor}, #722ed1)` }}>
            {initials}
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px' }}>{profile.fullName || profile.username}</h2>
            <span style={{ ...styles.badge, background: roleColor }}>{roleLabel}</span>
          </div>
        </div>

        {/* Details grid */}
        <div style={styles.detailsGrid}>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Username</span>
            <span style={styles.detailValue}>{profile.username}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Email</span>
            <span style={styles.detailValue}>{profile.email || '—'}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Department</span>
            <span style={styles.detailValue}>{profile.department?.name || '—'}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Role</span>
            <span style={styles.detailValue}>{roleLabel}</span>
          </div>
        </div>

        {/* Stats (employees only) */}
        {role === 'EMPLOYEE' && (
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1890ff' }}>{timeLogs.length}</span>
              <span style={{ color: '#888', fontSize: '0.85rem' }}>Total Entries</span>
            </div>
            <div style={styles.statCard}>
              <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#722ed1' }}>{totalHours.toFixed(1)}h</span>
              <span style={{ color: '#888', fontSize: '0.85rem' }}>Total Logged</span>
            </div>
            <div style={styles.statCard}>
              <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#13c2c2' }}>{monthHours.toFixed(1)}h</span>
              <span style={{ color: '#888', fontSize: '0.85rem' }}>This Month</span>
            </div>
          </div>
        )}

        {/* Recent activity (employees) */}
        {role === 'EMPLOYEE' && timeLogs.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Recent Time Logs</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Task</th>
                  <th style={styles.th}>Hours</th>
                  <th style={styles.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {timeLogs.slice(0, 10).map(l => (
                  <tr key={l.id}>
                    <td style={styles.td}>{l.task?.title || '—'}</td>
                    <td style={styles.td}>{l.hours}h</td>
                    <td style={styles.td}>{l.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '2rem', background: '#f5f7fa', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  card: { background: '#fff', borderRadius: '8px', padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', maxWidth: '700px' },
  avatarSection: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f0f0f0' },
  avatar: { width: '72px', height: '72px', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.6rem', flexShrink: 0 },
  badge: { display: 'inline-block', color: '#fff', padding: '3px 12px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600 },
  detailsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '1.5rem' },
  detailItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  detailLabel: { fontSize: '0.78rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' },
  detailValue: { fontSize: '0.95rem', fontWeight: 600, color: '#333' },
  statsRow: { display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid #f0f0f0' },
  statCard: { flex: 1, minWidth: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f9f9f9', borderRadius: '8px', padding: '1rem' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
  th: { background: '#fafafa', padding: '8px 10px', border: '1px solid #ddd', textAlign: 'left' },
  td: { padding: '8px 10px', border: '1px solid #ddd' },
  btnPrimary: { padding: '8px 16px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  btnSecondary: { padding: '8px 16px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' },
};

export default ProfilePage;
