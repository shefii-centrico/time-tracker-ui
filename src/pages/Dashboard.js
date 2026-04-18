import React from 'react';
import { useNavigate } from 'react-router-dom';

const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

const ROLE_BADGE = {
  ADMIN: { label: 'Admin', color: '#ef4444' },
  TEAM_LEAD: { label: 'Team Lead', color: '#7c3aed' },
  EMPLOYEE: { label: 'Employee', color: '#10b981' },
};

function Dashboard() {
  const role = localStorage.getItem('tt_role');
  const fullName = localStorage.getItem('tt_fullName') || '';
  const navigate = useNavigate();
  const initials = getInitials(fullName);
  const badge = ROLE_BADGE[role] || { label: role, color: '#888' };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const tiles = {
    ADMIN: [
      { icon: '📋', label: 'All Tasks', path: '/tasks', color: '#7c3aed' },
      { icon: '👥', label: 'Manage Users', path: '/admin/users', color: '#1890ff' },
      { icon: '⏱️', label: 'Time Logs', path: '/time-logs', color: '#13c2c2' },
    ],
    TEAM_LEAD: [
      { icon: '📊', label: 'Dashboard', path: '/tl-dashboard', color: '#7c3aed' },
    ],
    EMPLOYEE: [
      { icon: '📋', label: 'My Tasks', path: '/my-tasks', color: '#7c3aed' },
      { icon: '⏱️', label: 'Log Time', path: '/log-time', color: '#13c2c2' },
    ],
  }[role] || [];

  return (
    <div style={styles.page}>
      {/* Dark branded top bar */}
      <div style={styles.topBar}>
        <div style={styles.wordmark}>
          <span style={{ color: '#a78bfa', fontWeight: 900, fontSize: '1.4rem', fontFamily: 'monospace' }}>{'{  '}</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>centrico</span>
          <span style={{ color: '#ef4444', fontWeight: 900, fontSize: '1.4rem', fontFamily: 'monospace' }}>:</span>
          <span style={{ color: '#a78bfa', fontWeight: 900, fontSize: '1.4rem', fontFamily: 'monospace' }}>{'  }'}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => navigate('/profile')} style={styles.glassBtn}>👤 Profile</button>
          <button onClick={() => navigate('/change-password')} style={styles.glassBtn}>🔑 Password</button>
          <button onClick={handleLogout} style={styles.dangerBtn}>Logout</button>
        </div>
      </div>

      {/* Center card */}
      <div style={styles.center}>
        <div style={styles.card}>
          {/* Avatar */}
          <div style={styles.avatarWrap}>
            <div style={styles.avatar}>{initials}</div>
            <div style={{ marginTop: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#1a1535', fontWeight: 800 }}>Welcome back, {fullName}!</h2>
              <span style={{ ...styles.roleBadge, background: badge.color }}>{badge.label}</span>
            </div>
          </div>

          {/* Tiles */}
          <div style={styles.grid}>
            {tiles.map(t => (
              <button key={t.path} onClick={() => navigate(t.path)}
                style={{ ...styles.tile, '--tile-color': t.color }}
                onMouseEnter={e => { e.currentTarget.style.background = t.color; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = t.color; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#1a1535'; e.currentTarget.style.borderColor = '#e8e8ee'; }}>
                <span style={{ fontSize: '2.2rem' }}>{t.icon}</span>
                <span style={{ fontWeight: 700, fontSize: '0.92rem', marginTop: '6px' }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f0f1f5', display: 'flex', flexDirection: 'column' },
  topBar: { background: 'linear-gradient(90deg, #0d0b1f 0%, #1a1535 100%)', padding: '0.85rem 1.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(124,58,237,0.3)', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' },
  wordmark: { display: 'flex', alignItems: 'center', gap: '2px' },
  glassBtn: { padding: '7px 14px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' },
  dangerBtn: { padding: '7px 16px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  center: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' },
  card: { background: '#fff', borderRadius: '16px', padding: '2.5rem', boxShadow: '0 4px 32px rgba(0,0,0,0.10)', width: '100%', maxWidth: '480px', textAlign: 'center' },
  avatarWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f0f0f6' },
  avatar: { width: '72px', height: '72px', borderRadius: '18px', background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.6rem', boxShadow: '0 4px 16px rgba(124,58,237,0.35)' },
  roleBadge: { display: 'inline-block', color: '#fff', padding: '4px 16px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 700, marginTop: '10px', letterSpacing: '0.04em' },
  grid: { display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center' },
  tile: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '140px', padding: '24px 12px', background: '#fff', border: '1.5px solid #e8e8ee', borderRadius: '12px', cursor: 'pointer', fontSize: '0.9rem', color: '#1a1535', transition: 'all 0.18s ease', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
};

export default Dashboard;
