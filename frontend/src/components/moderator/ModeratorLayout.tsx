import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import {
  LayoutDashboard,
  BookOpen,
  Tags,
  Menu,
  LogOut,
  User as UserIcon,
  Library,
} from 'lucide-react';

type ActiveKey = 'dashboard' | 'books' | 'categories';

export function ModeratorLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [active, setActive] = useState<ActiveKey>('dashboard');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (saved) {
      document.documentElement.classList.toggle('dark', saved === 'dark');
    }
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/moderator/books')) setActive('books');
    else if (path.startsWith('/moderator/categories')) setActive('categories');
    else setActive('dashboard');
  }, [location.pathname]);

  const navItems = [
    { key: 'dashboard' as const, label: t('moderator.dashboard.title'), icon: LayoutDashboard, path: '/moderator' },
    { key: 'books' as const, label: t('moderator.books.title'), icon: BookOpen, path: '/moderator/books' },
    { key: 'categories' as const, label: t('moderator.categories.title'), icon: Tags, path: '/moderator/categories' },
  ];

  const handleItemClick = (path: string, key: ActiveKey) => {
    setActive(key);
    navigate(path);
    setMobileNavOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <Library className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('moderator.title')}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('moderator.subtitle')}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = active === item.key;
              return (
                <Button
                  key={item.key}
                  variant={isActive ? 'default' : 'ghost'}
                  className={`w-full justify-start gap-3 ${
                    isActive
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => handleItemClick(item.path, item.key)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                <UserIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {currentUser?.username}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{currentUser?.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Button variant="ghost" size="sm" onClick={handleLogout} className="flex-1">
                <LogOut className="h-4 w-4 mr-2" />
                {t('logout')}
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Library className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t('moderator.title')}</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileNavOpen && (
          <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-xl">
            <nav className="px-2 py-3 space-y-1">
              {navItems.map((item) => {
                const isActive = active === item.key;
                return (
                  <Button
                    key={item.key}
                    variant={isActive ? 'default' : 'ghost'}
                    className={`w-full justify-start gap-3 ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                    onClick={() => handleItemClick(item.path, item.key)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <Button variant="ghost" size="sm" onClick={handleLogout} className="flex-1">
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('logout')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto md:mt-0 mt-14">
        {children}
      </main>
    </div>
  );
}

export default ModeratorLayout;
