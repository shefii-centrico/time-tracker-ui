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
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={{ margin: 0 }}>🔑 Change Password</h2>
          <button onClick={() => navigate(backPath)} style={styles.btnSecondary}>← Back</button>
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
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' },
  card: { background: '#fff', borderRadius: '10px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.10)', width: '100%', maxWidth: '420px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontWeight: 600, fontSize: '0.9rem', color: '#333' },
  input: { padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.95rem', outline: 'none' },
  btnPrimary: { padding: '10px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' },
  btnSecondary: { padding: '6px 14px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
  success: { background: '#f6ffed', border: '1px solid #b7eb8f', color: '#52c41a', padding: '10px', borderRadius: '6px', fontSize: '0.9rem' },
  error: { background: '#fff2f0', border: '1px solid #ffccc7', color: '#ff4d4f', padding: '10px', borderRadius: '6px', fontSize: '0.9rem' },
};

export default ChangePassword;
