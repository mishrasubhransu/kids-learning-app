import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="h-full bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex flex-col items-center justify-center gap-4"
        role="status"
      >
        <div className="text-6xl motion-safe:animate-bounce" aria-hidden="true">
          🎈
        </div>
        <div className="text-2xl font-semibold text-gray-600">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
