import React from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const role = localStorage.getItem('tt_role');
  const fullName = localStorage.getItem('tt_fullName');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const roleLabel = {
    ADMIN: 'Admin',
    TEAM_LEAD: 'Team Lead',
    PROJECT_MANAGER: 'Project Manager',
    EMPLOYEE: 'Employee'
  }[role] || role;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Welcome, {fullName}!</h2>
        <p style={{ color: '#888' }}>Role: <strong>{roleLabel}</strong></p>
        <div style={styles.grid}>
          {role === 'ADMIN' && (
            <>
              <button onClick={() => navigate('/projects')} style={styles.tile}>
                <span style={styles.icon}>🏦</span><span>Projects</span>
              </button>
              <button onClick={() => navigate('/tasks')} style={styles.tile}>
                <span style={styles.icon}>📋</span><span>All Tasks</span>
              </button>
              <button onClick={() => navigate('/admin/users')} style={styles.tile}>
                <span style={styles.icon}>👥</span><span>Manage Users</span>
              </button>
              <button onClick={() => navigate('/time-logs')} style={styles.tile}>
                <span style={styles.icon}>⏱️</span><span>Time Logs</span>
              </button>
            </>
          )}
          {role === 'PROJECT_MANAGER' && (
            <>
              <button onClick={() => navigate('/projects')} style={styles.tile}>
                <span style={styles.icon}>🏦</span><span>My Projects</span>
              </button>
              <button onClick={() => navigate('/tasks')} style={styles.tile}>
                <span style={styles.icon}>📋</span><span>All Tasks</span>
              </button>
              <button onClick={() => navigate('/add-task')} style={styles.tile}>
                <span style={styles.icon}>➕</span><span>Create Task</span>
              </button>
              <button onClick={() => navigate('/time-logs')} style={styles.tile}>
                <span style={styles.icon}>⏱️</span><span>Time Logs</span>
              </button>
            </>
          )}
          {role === 'EMPLOYEE' && (
            <>
              <button onClick={() => navigate('/my-tasks')} style={styles.tile}>
                <span style={styles.icon}>📋</span><span>My Tasks</span>
              </button>
              <button onClick={() => navigate('/log-time')} style={styles.tile}>
                <span style={styles.icon}>⏱️</span><span>Log Time</span>
              </button>
            </>
          )}
        </div>
        <button onClick={handleLogout} style={styles.logout}>Logout</button>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' },
  card: { background: '#fff', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', minWidth: '380px', textAlign: 'center' },
  grid: { display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', margin: '2rem 0' },
  tile: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '130px', padding: '20px 10px', background: '#f5f5f5', border: '1px solid #e8e8e8', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', transition: 'background 0.2s' },
  icon: { fontSize: '2rem' },
  logout: { padding: '8px 24px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' },
};

export default Dashboard;
