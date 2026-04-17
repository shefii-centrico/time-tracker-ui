import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import TaskList from './pages/TaskList';
import AddTask from './pages/AddTask';
import EditTask from './pages/EditTask';
import LogTime from './pages/LogTime';
import TimeLogs from './pages/TimeLogs';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('tt_token');
  return token ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/tasks" element={<PrivateRoute><TaskList /></PrivateRoute>} />
        <Route path="/add-task" element={<PrivateRoute><AddTask /></PrivateRoute>} />
        <Route path="/edit-task/:id" element={<PrivateRoute><EditTask /></PrivateRoute>} />
        <Route path="/log-time" element={<PrivateRoute><LogTime /></PrivateRoute>} />
        <Route path="/time-logs" element={<PrivateRoute><TimeLogs /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
