import { Routes, Route } from 'react-router';
import HomePage from './pages/HomePage';
import AuthCallbackPage from './pages/AuthCallbackPage';

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
    </Routes>
  );
};
