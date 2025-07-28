import { Routes, Route } from 'react-router';
import HomePage from './pages/HomePage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import CoursePage from './pages/CoursePage';
import AdminDashboard from './pages/AdminDashboard';

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/course/:courseCode" element={<CoursePage />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
};
