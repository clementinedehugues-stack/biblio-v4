import { Routes, Route, Navigate } from 'react-router-dom';
import { type ReactElement, Suspense, lazy } from 'react';
import { useAuth } from './hooks/useAuth';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { AdminRoute } from './AdminRoute';
import { ModeratorRoute } from './ModeratorRoute';

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const BooksPage = lazy(() => import('./pages/BooksPage'));
const BookDetailPage = lazy(() => import('./pages/BookDetailPage'));
const LibraryPage = lazy(() => import('./pages/LibraryPage'));
const UserCategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const ReaderPage = lazy(() => import('./pages/ReaderPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const CategoriesPage = lazy(() => import('./pages/admin/CategoriesPage'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const BooksAdminPage = lazy(() => import('./pages/admin/BooksAdminPage'));
const ModeratorDashboard = lazy(() => import('./pages/moderator/ModeratorDashboard'));
const BooksModeratorPage = lazy(() => import('./pages/moderator/BooksModeratorPage'));
const CategoriesModeratorPage = lazy(() => import('./pages/moderator/CategoriesModeratorPage'));
const UploadModeratorPage = lazy(() => import('./pages/moderator/UploadModeratorPage'));

function PrivateRoute({ children }: { children: ReactElement }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <HomePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/books"
          element={
            <PrivateRoute>
              <BooksPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/library"
          element={
            <PrivateRoute>
              <LibraryPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <PrivateRoute>
              <UserCategoriesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/account"
          element={
            <PrivateRoute>
              <AccountPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/books/:id"
          element={
            <PrivateRoute>
              <BookDetailPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/reader/:id"
          element={
            <PrivateRoute>
              <ReaderPage />
            </PrivateRoute>
          }
        />
        <Route element={<AdminRoute />}>
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/books" element={<BooksAdminPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/categories" element={<CategoriesPage />} />
        </Route>
        <Route element={<ModeratorRoute />}>
          <Route path="/moderator" element={<ModeratorDashboard />} />
          <Route path="/moderator/books" element={<BooksModeratorPage />} />
          <Route path="/moderator/categories" element={<CategoriesModeratorPage />} />
          <Route path="/moderator/upload" element={<UploadModeratorPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
