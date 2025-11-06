import { useAuth } from './hooks/useAuth';
import { Navigate, Outlet } from 'react-router-dom';

export function AdminRoute() {
    const { user, token } = useAuth();

    if (!token) {
        return <Navigate to="/login" />;
    }

    if (user && user.role === 'admin') {
        return <Outlet />;
    }

    // Redirect to home if not admin
    return <Navigate to="/" />;
}
