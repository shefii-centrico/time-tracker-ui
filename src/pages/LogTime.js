import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const parseError = (err) => {
  const data = err?.response?.data;
  if (!data) return 'Cannot reach server. Is the backend running?';
  if (typeof data === 'object') return Object.values(data).join(', ');
  return String(data);
};

function LogTime() {
  const [tasks, setTasks] = useState([]);
  const [taskId, setTaskId] = useState('');
  const [hours, setHours] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [planviewProject, setPlanviewProject] = useState('');
  const [macroFase, setMacroFase] = useState('');
  const [billable, setBillable] = useState('true');
  const [workType, setWorkType] = useState('Project');
  const [tlValues, setTlValues] = useState(null); // what TL originally set
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/tasks/my')
      .then((res) => {
        setTasks(res.data);
        if (res.data.length > 0) {
          setTaskId(res.data[0].id);
          loadPlanview(res.data[0]);
        }
      })
      .catch(() => setError('Failed to load tasks.'));
  }, []);

  const loadPlanview = (task) => {
    setPlanviewProject(task.planviewProject || '');
    setMacroFase(task.macroFase || '');
    setBillable(task.billable !== false ? 'true' : 'false');
    setWorkType(task.workType || 'Project');
    setTlValues({
      planviewProject: task.planviewProject || '',
      macroFase: task.macroFase || '',
    });
  };

  const handleTaskChange = (e) => {
    const id = e.target.value;
    setTaskId(id);
    const task = tasks.find(t => String(t.id) === String(id));
    if (task) loadPlanview(task);
  };

  // Show editable form when TL hasn't set values OR employee clicked "override"
  const planviewMissing = !tlValues?.planviewProject || !tlValues?.macroFase;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    api.post(`/time-logs?taskId=${Number(taskId)}`, {
      hours: Number(hours),
      date,
      planviewProject: planviewProject || null,
      macroFase: macroFase || null,
      billable: billable === 'true',
      workType,
    })
      .then(() => {
        setMessage('Time logged successfully!');
        setHours('');
        setTasks(prev => prev.map(t =>
          String(t.id) === String(taskId)
            ? { ...t, planviewProject, macroFase, billable: billable === 'true', workType }
            : t
        ));
        setTlValues({ planviewProject, macroFase });
      })
      .catch((err) => setError(parseError(err)))
      .finally(() => setSubmitting(false));
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f0f0f6' }}>
          <h2 style={{ margin: 0, color: '#1a1535', fontSize: '1.2rem', fontWeight: 800 }}>⏱ Log Time</h2>
          <button type="button" onClick={() => navigate('/my-tasks')} style={{ padding: '6px 14px', border: '1.5px solid #e0e0ea', borderRadius: '6px', background: '#f0fdf4', color: '#059669', fontWeight: 600, cursor: 'pointer' }}>← My Tasks</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label>Task *</label>
            <select
              value={taskId}
              onChange={handleTaskChange}
              required
              style={styles.input}
            >
              {tasks.length === 0 && <option value="">No tasks available</option>}
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.id} — {t.title}{(!t.planviewProject || !t.macroFase) ? ' ⚠ Planview missing' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Planview section — always editable by employee */}
          <div style={planviewMissing ? styles.planviewBox : styles.planviewBoxFilled}>
            <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: '0.85rem', color: planviewMissing ? '#7c5500' : '#237804' }}>
              {planviewMissing ? '⚠ Planview details missing — please fill in below' : '📋 Planview / Reporting Info'}
            </p>
            <div style={styles.field}>
              <label>Planview Project <span style={{ color: '#ff4d4f' }}>*</span></label>
              <input type="text" value={planviewProject} onChange={e => setPlanviewProject(e.target.value)}
                placeholder="e.g. 0023299 - Name Detection - Trasferimenti"
                style={styles.input} required />
            </div>
            <div style={styles.field}>
              <label>Macro Fase <span style={{ color: '#ff4d4f' }}>*</span></label>
              <input type="text" value={macroFase} onChange={e => setMacroFase(e.target.value)}
                placeholder="e.g. 1-Name Detection - Trasferimenti"
                style={styles.input} required />
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ ...styles.field, flex: 1 }}>
                <label>Billable Status</label>
                <select value={billable} onChange={e => setBillable(e.target.value)} style={styles.input}>
                  <option value="true">Billable</option>
                  <option value="false">Non-Billable</option>
                </select>
              </div>
              <div style={{ ...styles.field, flex: 1 }}>
                <label>Project/Maintenance</label>
                <select value={workType} onChange={e => setWorkType(e.target.value)} style={styles.input}>
                  <option value="Project">Project</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
            </div>
          </div>

          <div style={styles.field}>
            <label>Hours *</label>
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
              min={0.01}
              step="any"
              placeholder="e.g. 2.5"
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label>Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          {message && <p style={{ color: 'green' }}>{message}</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" disabled={submitting} style={styles.btnPrimary}>
              {submitting ? 'Logging...' : 'Log Time'}
            </button>
            <button type="button" onClick={() => navigate('/my-tasks')} style={styles.btnSecondary}>← My Tasks</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', padding: '2.5rem', background: '#f0f1f5', minHeight: '100vh' },
  card: { background: '#fff', padding: '2.2rem', borderRadius: '14px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', width: '520px' },
  field: { marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '5px' },
  input: { padding: '9px 12px', borderRadius: '7px', border: '1px solid #e0e0ea', fontSize: '0.95rem', outline: 'none' },
  planviewBox: { background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '8px', padding: '14px', marginBottom: '1rem' },
  planviewBoxFilled: { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '14px', marginBottom: '1rem' },
  planviewNotice: { margin: '0 0 12px', fontSize: '0.85rem', color: '#7c5500', fontWeight: 600 },
  planviewNoticeOk: { margin: '0 0 12px', fontSize: '0.85rem', color: '#15803d', fontWeight: 600 },
  infoRow: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.88rem', flexWrap: 'wrap' },
  infoLabel: { color: '#888', minWidth: '110px', fontWeight: 500 },
  infoValue: { color: '#1a1535', fontWeight: 700 },
  btnPrimary: { padding: '11px 22px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700 },
  btnSecondary: { padding: '11px 22px', background: '#fff', color: '#555', border: '1.5px solid #e0e0ea', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 },
};

export default LogTime;
