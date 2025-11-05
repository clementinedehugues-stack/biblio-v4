import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import type { User as AppUser } from '@/types/user';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Tags,
  Menu,
  LogOut,
  User as UserIcon,
  Library,
} from 'lucide-react';

type ActiveKey = 'dashboard' | 'content' | 'users' | 'categories' | 'settings';

export function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [active, setActive] = useState<ActiveKey>('dashboard');

  // Theme toggle handler (currently unused in UI)
  // const toggleTheme = () => {
  //   const next = theme === 'light' ? 'dark' : 'light';
  //   setTheme(next);
  //   document.documentElement.classList.toggle('dark', next === 'dark');
  //   localStorage.setItem('theme', next);
  // };

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (saved) {
      document.documentElement.classList.toggle('dark', saved === 'dark');
    }
  }, []);

  useEffect(() => {
    const path = location.pathname;
    const hash = location.hash;
    if (path.startsWith('/admin/users')) setActive('users');
    else if (path.startsWith('/admin/categories')) setActive('categories');
    else if (path.startsWith('/admin/books') || path.startsWith('/upload')) setActive('content');
    else if (path.startsWith('/books')) setActive('content');
    else if (path.startsWith('/admin')) {
      if (hash === '#settings') setActive('settings');
      else setActive('dashboard');
    }
  }, [location.pathname, location.hash]);

  const userInitials = () => {
    const u = currentUser as (AppUser | null);
    const name = (u?.full_name || u?.username || 'U') as string;
    return name
      .split(' ')
      .map((p: string) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const navItems: { key: ActiveKey; href: string; label: string; icon: React.ElementType }[] = [
    { key: 'dashboard', href: '/admin', label: t('dashboard'), icon: LayoutDashboard },
    { key: 'content', href: '/admin/books', label: t('content'), icon: BookOpen },
    { key: 'users', href: '/admin/users', label: t('users'), icon: Users },
    { key: 'categories', href: '/admin/categories', label: t('categories'), icon: Tags },
  ];

  // Note: Inline nav items are rendered below; extracted NavItem component removed due to unused warning

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-background sm:flex">
        <div className="flex h-16 items-center border-b px-6">
          <a href="/" className="flex items-center gap-2 font-semibold">
            <Library className="h-6 w-6" />
            <span>{t('main_site')}</span>
          </a>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                active === item.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.href);
                setActive(item.key);
              }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto p-4">
          <div className="flex items-center gap-2 rounded-lg p-2 text-sm font-medium text-muted-foreground">
            <UserIcon className="h-5 w-5" />
            <span className="flex-1 truncate">{currentUser?.username || 'Admin'}</span>
            <Button variant="outline" size="sm" onClick={logout} aria-label={t('logout')}>
              <LogOut className="mr-1" /> {t('logout')}
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" className="sm:hidden" onClick={() => setMobileNavOpen(true)}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">{t('open_menu')}</span>
            </Button>
            <a href="/" className="flex items-center gap-2 font-semibold sm:hidden">
              <Library className="h-6 w-6" />
              <span className="sr-only">{t('main_site')}</span>
            </a>
          </div>

          <div className="flex items-center gap-4">
            {/* Language switcher restored */}
            <LanguageSwitcher />
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                {currentUser ? userInitials() : <UserIcon className="h-4 w-4" />}
              </div>
              <span className="hidden sm:inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-blue-600 border-blue-600/30 bg-blue-600/10">
                {t('role_admin')}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={logout} aria-label={t('logout')}>
              <LogOut className="mr-1" /> {t('logout')}
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:px-6 sm:py-0">{children}</main>
      </div>

      {/* Mobile Nav */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 flex sm:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNavOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-col bg-background">
            <div className="flex h-16 items-center border-b px-6">
              <a href="/" className="flex items-center gap-2 font-semibold">
                <Library className="h-6 w-6" />
                <span>{t('main_site')}</span>
              </a>
            </div>
            <nav className="flex-1 space-y-1 p-4">
              {navItems.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                    active === item.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.href);
                    setMobileNavOpen(false);
                  }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-auto border-t p-4">
              <div className="flex items-center gap-2 rounded-lg p-2 text-sm font-medium text-muted-foreground">
                <UserIcon className="h-5 w-5" />
                <span className="flex-1 truncate">{currentUser?.username || 'Admin'}</span>
                <Button variant="outline" size="sm" onClick={logout} aria-label={t('logout')}>
                  <LogOut className="mr-1" /> {t('logout')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminLayout;