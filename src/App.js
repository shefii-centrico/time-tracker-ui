import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import TaskList from './pages/TaskList';
import AddTask from './pages/AddTask';
import EditTask from './pages/EditTask';
import LogTime from './pages/LogTime';
import TimeLogs from './pages/TimeLogs';
import AdminPage from './pages/AdminPage';
import MyTasks from './pages/MyTasks';
import Dashboard from './pages/Dashboard';
import ProjectPage from './pages/ProjectPage';
import ChangePassword from './pages/ChangePassword';
import TeamLeadDashboard from './pages/TeamLeadDashboard';

function PrivateRoute({ children, roles }) {
  const token = localStorage.getItem('tt_token');
  const role = localStorage.getItem('tt_role');
  if (!token) return <Navigate to="/" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        <Route path="/dashboard" element={<PrivateRoute>{localStorage.getItem('tt_role') === 'EMPLOYEE' ? <Navigate to="/my-tasks" replace /> : localStorage.getItem('tt_role') === 'TEAM_LEAD' ? <Navigate to="/tl-dashboard" replace /> : <Dashboard />}</PrivateRoute>} />

        <Route path="/tl-dashboard" element={<PrivateRoute roles={['TEAM_LEAD', 'ADMIN']}><TeamLeadDashboard /></PrivateRoute>} />

        {/* Admin only */}
        <Route path="/admin/users" element={<PrivateRoute roles={['ADMIN']}><AdminPage /></PrivateRoute>} />

        {/* Admin + Project Manager */}
        <Route path="/projects" element={<PrivateRoute roles={['ADMIN', 'PROJECT_MANAGER']}><ProjectPage /></PrivateRoute>} />

        {/* Team Lead + Admin + PM */}
        <Route path="/tasks" element={<PrivateRoute roles={['TEAM_LEAD', 'ADMIN', 'PROJECT_MANAGER']}><TaskList /></PrivateRoute>} />
        <Route path="/add-task" element={<PrivateRoute roles={['TEAM_LEAD', 'ADMIN', 'PROJECT_MANAGER']}><AddTask /></PrivateRoute>} />
        <Route path="/edit-task/:id" element={<PrivateRoute roles={['TEAM_LEAD', 'ADMIN', 'PROJECT_MANAGER']}><EditTask /></PrivateRoute>} />
        <Route path="/time-logs" element={<PrivateRoute roles={['TEAM_LEAD', 'ADMIN', 'PROJECT_MANAGER']}><TimeLogs /></PrivateRoute>} />

        {/* Employee */}
        <Route path="/my-tasks" element={<PrivateRoute roles={['EMPLOYEE']}><MyTasks /></PrivateRoute>} />
        <Route path="/log-time" element={<PrivateRoute roles={['EMPLOYEE']}><LogTime /></PrivateRoute>} />

        {/* All authenticated users */}
        <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

