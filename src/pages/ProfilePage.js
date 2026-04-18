import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

const ROLE_LABEL = { ADMIN: 'Admin', TEAM_LEAD: 'Team Lead', EMPLOYEE: 'Employee' };
const ROLE_COLOR = { ADMIN: '#f5222d', TEAM_LEAD: '#1890ff', EMPLOYEE: '#52c41a' };

function ProfilePage() {
  const [timeLogs, setTimeLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const role = localStorage.getItem('tt_role');
  const fullName = localStorage.getItem('tt_fullName') || '';
  const username = localStorage.getItem('tt_user') || '';

  const backPath = role === 'EMPLOYEE' ? '/my-tasks' : role === 'TEAM_LEAD' ? '/tl-dashboard' : '/dashboard';
  const roleColor = ROLE_COLOR[role] || '#888';
  const roleLabel = ROLE_LABEL[role] || role;
  const initials = getInitials(fullName);

  useEffect(() => {
    if (role === 'EMPLOYEE') {
      setLoading(true);
      api.get('/time-logs/my')
        .then(res => setTimeLogs(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  const totalHours = timeLogs.reduce((s, l) => s + (l.hours || 0), 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthHours = timeLogs
    .filter(l => l.date && l.date.startsWith(thisMonth))
    .reduce((s, l) => s + (l.hours || 0), 0);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>👤 My Profile</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => navigate(backPath)} style={styles.btnSecondary}>← Back</button>
          <button onClick={() => navigate('/change-password')} style={styles.btnPrimary}>🔑 Change Password</button>
        </div>
      </div>

      <div style={styles.card}>
        {/* Avatar + Name */}
        <div style={styles.avatarSection}>
          <div style={{ ...styles.avatar, background: `linear-gradient(135deg, ${roleColor}, #722ed1)` }}>
            {initials}
          </div>
          <div>
            <h2 style={{ margin: '0 0 6px' }}>{fullName}</h2>
            <span style={{ ...styles.badge, background: roleColor }}>{roleLabel}</span>
            <p style={{ margin: '8px 0 0', color: '#888', fontSize: '0.85rem' }}>@{username}</p>
          </div>
        </div>

        {/* Employee stats */}
        {role === 'EMPLOYEE' && (
          <>
            {loading && <p style={{ color: '#888' }}>Loading stats...</p>}
            {!loading && (
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

            {timeLogs.length > 0 && (
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
          </>
        )}

        {role !== 'EMPLOYEE' && (
          <p style={{ color: '#888', marginTop: '1rem', fontSize: '0.9rem' }}>
            Use the dashboard to manage tasks, time logs, and team activity.
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '0 0 2rem', background: '#f0f1f5', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, #0d0b1f 0%, #1a1535 100%)', padding: '0.85rem 1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(124,58,237,0.3)', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' },
  card: { background: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 16px rgba(0,0,0,0.09)', maxWidth: '700px', margin: '0 1.5rem' },
  avatarSection: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f0f0f6' },
  avatar: { width: '72px', height: '72px', borderRadius: '18px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.6rem', flexShrink: 0, boxShadow: '0 4px 16px rgba(124,58,237,0.3)' },
  badge: { display: 'inline-block', color: '#fff', padding: '4px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.04em' },
  statsRow: { display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid #f0f0f6' },
  statCard: { flex: 1, minWidth: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8f7ff', borderRadius: '10px', padding: '1rem', borderTop: '3px solid #7c3aed' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
  th: { background: '#1a1535', color: '#fff', padding: '10px 12px', textAlign: 'left', fontSize: '0.79rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '9px 12px', borderBottom: '1px solid #f0f0f6' },
  btnPrimary: { padding: '8px 18px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  btnSecondary: { padding: '8px 16px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer' },
};

export default ProfilePage;
