import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

const parseError = (err) => {
  const data = err?.response?.data;
  if (!data) return 'Cannot reach server. Is the backend running?';
  if (typeof data === 'object') return Object.values(data).join(', ');
  return String(data);
};

function EditTask() {
  const { id } = useParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('TODO');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [planviewProject, setPlanviewProject] = useState('');
  const [macroFase, setMacroFase] = useState('');
  const [billable, setBillable] = useState(true);
  const [workType, setWorkType] = useState('Project');
  const [employees, setEmployees] = useState([]);
  const [assignedToIds, setAssignedToIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/tasks/assignable-users').then(res => setEmployees(res.data)).catch(() => {});
    api.get(`/tasks/${id}`)
      .then((res) => {
        const task = res.data;
        setTitle(task.title);
        setDescription(task.description || '');
        setStatus(task.status);
        setPriority(task.priority || 'MEDIUM');
        setDueDate(task.dueDate || '');
        setPlanviewProject(task.planviewProject || '');
        setMacroFase(task.macroFase || '');
        setBillable(task.billable !== false);
        setWorkType(task.workType || 'Project');
        setAssignedToIds((task.assignees || []).map(u => u.id));
        setPlanviewProject(task.planviewProject || '');
        setMacroFase(task.macroFase || '');
        setBillable(task.billable !== false);
        setWorkType(task.workType || 'Project');
      })
      .catch(() => setError('Failed to load task.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    api.put(`/tasks/${id}`, { title, description, status, priority, dueDate: dueDate || null, planviewProject, macroFase, billable, workType })
      .then((res) => api.put(`/tasks/${res.data.id}/assign`, assignedToIds))
      .then(() => navigate('/tasks'))
      .catch((err) => setError(parseError(err)))
      .finally(() => setSubmitting(false));
  };

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f0f0f6' }}>
          <h2 style={{ margin: 0, color: '#1a1535', fontSize: '1.2rem', fontWeight: 800 }}>✏️ Edit Task #{id}</h2>
          <button type="button" onClick={() => navigate('/tasks')} style={{ padding: '6px 14px', border: '1.5px solid #e0e0ea', borderRadius: '6px', background: '#f8f7ff', color: '#7c3aed', fontWeight: 600, cursor: 'pointer' }}>← Back</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.input}>
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="DONE">DONE</option>
            </select>
          </div>
          <div style={styles.field}>
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={styles.input}>
              <option value="HIGH">🔴 HIGH</option>
              <option value="MEDIUM">🟡 MEDIUM</option>
              <option value="LOW">🟢 LOW</option>
            </select>
          </div>
          <div style={styles.field}>
            <label>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={styles.input} />
          </div>
          <div style={{ borderTop: '1px solid #f0f0f0', margin: '12px 0', paddingTop: '12px' }}>
            <p style={{ margin: '0 0 10px', fontWeight: 600, color: '#555', fontSize: '0.9rem' }}>Planview / Billing Info</p>
            <div style={styles.field}>
              <label>Planview Project</label>
              <input type="text" value={planviewProject} onChange={e => setPlanviewProject(e.target.value)} placeholder="e.g. 0023299 - Name Detection" style={styles.input} />
            </div>
            <div style={styles.field}>
              <label>Macro Fase</label>
              <input type="text" value={macroFase} onChange={e => setMacroFase(e.target.value)} placeholder="e.g. 1.4.1 - IT AR - Fastcheck" style={styles.input} />
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={styles.field}>
                <label>Billable Status</label>
                <select value={String(billable)} onChange={e => setBillable(e.target.value === 'true')} style={styles.input}>
                  <option value="true">Billable</option>
                  <option value="false">Non-Billable</option>
                </select>
              </div>
              <div style={styles.field}>
                <label>Project/Maintenance</label>
                <select value={workType} onChange={e => setWorkType(e.target.value)} style={styles.input}>
                  <option value="Project">Project</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
            </div>
          </div>
          {employees.length > 0 && (
            <div style={styles.field}>
              <label>Assignees <span style={{ color: '#aaa', fontWeight: 400 }}>(select one or more)</span></label>
              <div style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '8px', maxHeight: '140px', overflowY: 'auto' }}>
                {employees.map((u) => (
                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 2px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={assignedToIds.includes(u.id)}
                      onChange={e => setAssignedToIds(prev =>
                        e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id)
                      )}
                    />
                    {u.fullName || u.username}
                  </label>
                ))}
              </div>
            </div>
          )}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" disabled={submitting} style={styles.btnPrimary}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => navigate('/tasks')} style={styles.btnSecondary}>Cancel</button>
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
  btnPrimary: { padding: '11px 22px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700 },
  btnSecondary: { padding: '11px 22px', background: '#fff', color: '#555', border: '1.5px solid #e0e0ea', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 },
};

export default EditTask;
