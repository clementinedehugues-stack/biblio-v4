import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { UserHomeCore } from "@/components/user/UserHomeCore";
import UserLayout from "@/components/layout/UserLayout";

export default function HomePage() {
  const { user } = useAuth();
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';

  return (
    // Redirect admins/moderators to the dedicated Admin interface (/admin)
    isAdminOrModerator ? <Navigate to="/admin" replace /> : (
      <UserLayout>
        <UserHomeCore />
      </UserLayout>
    )
  );
}
