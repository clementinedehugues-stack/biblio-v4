import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function Sidebar() {
  const { user } = useAuth();
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  const isAdmin = user?.role === 'admin';

  return (
    <nav>
      <ul>
        <li className="mb-2"><Link to="/" className="hover:text-custom-red p-2 block">Dashboard</Link></li>
        <li className="mb-2"><Link to="/books" className="hover:text-custom-red p-2 block">Books</Link></li>
        {isAdminOrModerator && (
          <li className="mb-2"><Link to="/upload" className="hover:text-custom-red p-2 block">Upload</Link></li>
        )}
        {isAdmin && (
          <>
            <li className="mb-2"><Link to="/admin" className="hover:text-custom-red p-2 block">Admin Dashboard</Link></li>
            <li className="mb-2"><Link to="/admin/categories" className="hover:text-custom-red p-2 block">Categories</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
}
