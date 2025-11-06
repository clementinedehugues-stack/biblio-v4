import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function ModeratorRoute() {
  const { user } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  if (user.role === 'moderator') {
    return <Outlet />;
  }

  // Redirect to home if not moderator
  return <Navigate to="/" replace />;
}
