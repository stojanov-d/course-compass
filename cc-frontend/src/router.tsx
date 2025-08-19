import { Routes, Route } from 'react-router';
import { lazy, Suspense } from 'react';
import { FallbackLoading } from './components/common/FallbackLoading';

const HomePage = lazy(() => import('./pages/HomePage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const CoursePage = lazy(() => import('./pages/CoursePage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

export const AppRouter = () => {
  return (
    <Suspense fallback={<FallbackLoading />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/course/:courseCode" element={<CoursePage />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Suspense>
  );
};
