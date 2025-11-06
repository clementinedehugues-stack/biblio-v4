import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { UserHomeCore } from "@/components/user/UserHomeCore";
import UserLayout from "@/components/layout/UserLayout";

export default function HomePage() {
  const { user } = useAuth();

  // Redirect based on user role
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  
  if (user?.role === 'moderator') {
    return <Navigate to="/moderator" replace />;
  }

  return (
    <UserLayout>
      <UserHomeCore />
    </UserLayout>
  );
}
