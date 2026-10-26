import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function PrivateRoute({ children, roles }) {
  const { isAuthenticated, hasRole, loading } = useAuth(); const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Checking your session…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles?.length && !hasRole(...roles)) return <Navigate to="/" replace />;
  return children;
}
