import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// SVG recreation of the Centrico logo curly brace
function CentricoBrace({ size = 48 }) {
  const w = size * 0.55;
  const h = size;
  return (
    <svg width={w} height={h} viewBox="0 0 55 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="braceGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      {/* Custom curly brace path matching Centrico logo */}
      <path
        d="M 42,4
           C 28,4 22,10 22,22
           L 22,48
           C 22,56 16,60 8,60
           C 16,60 22,64 22,72
           L 22,98
           C 22,110 28,116 42,116"
        stroke="url(#braceGrad)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userFocus, setUserFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('tt_token', data.token);
        localStorage.setItem('tt_user', data.username);
        localStorage.setItem('tt_role', data.role);
        localStorage.setItem('tt_fullName', data.fullName || data.username);
        navigate(data.role === 'EMPLOYEE' ? '/my-tasks' : data.role === 'TEAM_LEAD' ? '/tl-dashboard' : '/dashboard');
      } else {
        setError('Invalid username or password.');
      }
    } catch (err) {
      setError('Cannot reach the server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Left branding panel */}
      <div style={styles.leftPanel}>
        <div style={styles.leftTop}>
          {/* Centrico wordmark recreated in CSS */}
          <div style={styles.wordmark}>
            <CentricoBrace size={52} />
            <span style={styles.wordText}>
              centr<span style={styles.slash}>/</span>co
            </span>
            <span style={styles.redColon}>:</span>
          </div>
          <p style={styles.productLabel}>Time Tracker</p>
        </div>

        <div style={styles.leftMid}>
          <p style={styles.tagline}>
            Track time. Manage tasks.<br />Stay on schedule.
          </p>
          <div style={styles.featureList}>
            {[
              'Real-time task management',
              'Team performance insights',
              'Leave & extension tracking',
              'End-of-day summaries',
            ].map((f) => (
              <div key={f} style={styles.featureItem}>
                <span style={styles.featureDot} />
                {f}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.leftFooter}>© 2026 Centrico. All rights reserved.</div>
      </div>

      {/* Right form panel */}
      <div style={styles.rightPanel}>
        <div style={styles.card}>
          {/* Card header */}
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <CentricoBrace size={40} />
            </div>
            <h2 style={styles.cardTitle}>Welcome back</h2>
            <p style={styles.cardSubtitle}>Sign in to your Centrico account</p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={styles.field}>
              <label style={styles.label}>Username</label>
              <div style={{ position: 'relative' }}>
                <span style={styles.inputPrefix}>_</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setUserFocus(true)}
                  onBlur={() => setUserFocus(false)}
                  required
                  placeholder="your.username"
                  style={{ ...styles.input, ...(userFocus ? styles.inputFocus : {}) }}
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <span style={styles.inputPrefix}>*</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPassFocus(true)}
                  onBlur={() => setPassFocus(false)}
                  required
                  placeholder="••••••••"
                  style={{ ...styles.input, ...(passFocus ? styles.inputFocus : {}) }}
                />
              </div>
            </div>

            {error && (
              <div style={styles.errorBox}>
                <span style={{ color: '#ef4444' }}>⚠ </span>{error}
              </div>
            )}

            <button
              type="submit"
              style={{ ...styles.button, ...(loading ? styles.buttonLoading : {}) }}
              disabled={loading}
            >
              {loading ? '⟳  Signing in...' : 'Sign In  →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const PURPLE = '#7c3aed';
const PURPLE_LIGHT = '#a78bfa';
const RED = '#ef4444';
const DARK_BG = '#0d0b1f';
const DARK_CARD = '#13112a';

const styles = {
  page: {
    display: 'flex',
    height: '100vh',
    fontFamily: "'Courier New', 'Fira Code', 'Consolas', monospace",
    overflow: 'hidden',
  },

  /* ── Left panel ── */
  leftPanel: {
    flex: '0 0 44%',
    background: DARK_BG,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '48px 44px 32px',
    color: '#fff',
    borderRight: `1px solid rgba(124,58,237,0.2)`,
  },
  leftTop: {},

  /* Centrico wordmark */
  wordmark: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '10px',
  },

  wordText: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '0.5px',
  },
  slash: {
    color: 'rgba(255,255,255,0.55)',
    fontWeight: 400,
  },
  redColon: {
    fontSize: '2.2rem',
    fontWeight: 700,
    color: RED,
    lineHeight: 1,
    marginLeft: '-2px',
  },
  productLabel: {
    margin: '0 0 0 4px',
    fontSize: '0.78rem',
    color: `${PURPLE_LIGHT}`,
    letterSpacing: '3px',
    textTransform: 'uppercase',
  },

  leftMid: { marginTop: '60px' },
  tagline: {
    margin: '0 0 32px',
    fontSize: '1.15rem',
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 1.7,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  featureList: { display: 'flex', flexDirection: 'column', gap: '14px' },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '0.92rem',
    color: 'rgba(255,255,255,0.75)',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  featureDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_LIGHT})`,
    flexShrink: 0,
  },
  leftFooter: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.25)',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },

  /* ── Right panel ── */
  rightPanel: {
    flex: 1,
    background: '#100e23',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    background: DARK_CARD,
    borderRadius: '16px',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '400px',
    border: `1px solid rgba(124,58,237,0.25)`,
    boxShadow: `0 8px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.1)`,
  },
  cardHeader: { textAlign: 'center', marginBottom: '32px' },
  cardTitle: {
    margin: '0 0 6px',
    fontSize: '1.45rem',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  cardSubtitle: {
    margin: 0,
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },

  field: { marginBottom: '20px' },
  label: {
    display: 'block',
    marginBottom: '7px',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: PURPLE_LIGHT,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  inputPrefix: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: PURPLE,
    fontWeight: 700,
    fontSize: '1rem',
    pointerEvents: 'none',
    lineHeight: 1,
  },
  input: {
    width: '100%',
    padding: '12px 14px 12px 36px',
    fontSize: '0.95rem',
    border: `1.5px solid rgba(124,58,237,0.25)`,
    borderRadius: '10px',
    outline: 'none',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: "'Courier New', monospace",
  },
  inputFocus: {
    borderColor: PURPLE,
    boxShadow: `0 0 0 3px rgba(124,58,237,0.18)`,
    background: 'rgba(124,58,237,0.06)',
  },

  errorBox: {
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '0.85rem',
    color: '#fca5a5',
    marginBottom: '16px',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },

  button: {
    width: '100%',
    padding: '13px',
    background: `linear-gradient(135deg, ${PURPLE}, #5b21b6)`,
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.5px',
    boxShadow: `0 4px 20px rgba(124,58,237,0.4)`,
    transition: 'opacity 0.2s, transform 0.15s',
    marginTop: '8px',
    fontFamily: "'Courier New', monospace",
  },
  buttonLoading: { opacity: 0.6, cursor: 'not-allowed' },
};

export default LoginPage;

