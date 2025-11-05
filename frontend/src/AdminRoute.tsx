import { useAuth } from './hooks/useAuth';
import { Navigate, Outlet } from 'react-router-dom';

export function AdminRoute() {
    const { user, token } = useAuth();

    if (!token) {
        return <Navigate to="/login" />;
    }

    if (user && (user.role === 'admin' || user.role === 'moderator')) {
        return <Outlet />;
    }

    // Redirect to home if not admin/moderator, or while user is loading
    return <Navigate to="/" />;
}
