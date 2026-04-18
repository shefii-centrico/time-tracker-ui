import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const role = localStorage.getItem('tt_role');

  const handleSubmit = (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    if (newPassword !== confirm) {
      setErr('New passwords do not match.');
      return;
    }
    if (newPassword.length < 4) {
      setErr('New password must be at least 4 characters.');
      return;
    }
    setSubmitting(true);
    api.put('/auth/change-password', { currentPassword, newPassword })
      .then(res => {
        setMsg(res.data.message || 'Password changed successfully!');
        setCurrentPassword(''); setNewPassword(''); setConfirm('');
      })
      .catch(err => {
        const data = err?.response?.data;
        setErr(data?.error || 'Failed to change password.');
      })
      .finally(() => setSubmitting(false));
  };

  const backPath = role === 'EMPLOYEE' ? '/my-tasks' : role === 'TEAM_LEAD' ? '/tl-dashboard' : '/dashboard';

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>🔑 Change Password</span>
        <button onClick={() => navigate(backPath)} style={styles.btnSecondary}>← Back</button>
      </div>
      <div style={styles.center}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1a1535' }}>🔑 Change Password</h2>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="Enter your current password"
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="At least 4 characters"
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Confirm New Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              style={styles.input}
              placeholder="Repeat new password"
            />
          </div>

          {msg && <div style={styles.success}>{msg}</div>}
          {err && <div style={styles.error}>{err}</div>}

          <button type="submit" disabled={submitting} style={styles.btnPrimary}>
            {submitting ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f0f1f5', display: 'flex', flexDirection: 'column' },
  topBar: { background: 'linear-gradient(90deg, #0d0b1f 0%, #1a1535 100%)', padding: '0.85rem 1.5rem', borderBottom: '1px solid rgba(124,58,237,0.3)', boxShadow: '0 2px 12px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  center: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' },
  card: { background: '#fff', borderRadius: '14px', padding: '2.2rem', boxShadow: '0 4px 28px rgba(0,0,0,0.10)', width: '100%', maxWidth: '420px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f0f0f6' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontWeight: 700, fontSize: '0.88rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' },
  input: { padding: '10px 14px', border: '1.5px solid #e0e0ea', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.15s' },
  btnPrimary: { padding: '11px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem' },
  btnSecondary: { padding: '7px 16px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' },
  success: { background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 },
  error: { background: '#fff5f5', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 },
};

export default ChangePassword;
