import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Menu, Globe, LogOut, BookOpenText, Home, Moon, Sun, Library, Grid3X3, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { getBook } from '@/services/books';

function ThemeToggleIcon() {
  const [mode, setMode] = useState<'light'|'dark'| 'system'>(() => (localStorage.getItem('theme') as 'light'|'dark'|'system' | null) || 'system');

  // compute current dark state based on mode + system
  const computeDark = (m: 'light'|'dark'|'system') => {
    if (m === 'system') return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return m === 'dark';
  };
  const isDark = computeDark(mode);
  const Icon = isDark ? Moon : Sun;

  // apply theme with a short transition
  const applyTheme = (m: 'light'|'dark'|'system') => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    const resolvedDark = computeDark(m);
    root.classList.toggle('dark', resolvedDark);
    window.setTimeout(() => root.classList.remove('theme-transition'), 250);
  };

  const cycle = () => {
    const next = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    setMode(next);
    localStorage.setItem('theme', next);
    applyTheme(next);
  };

  // react to system changes when in system mode
  useEffect(() => {
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = () => {
      const stored = (localStorage.getItem('theme') as 'light'|'dark'|'system' | null) || 'system';
      if (stored === 'system') {
        const root = document.documentElement;
        root.classList.add('theme-transition');
        root.classList.toggle('dark', mq.matches);
        window.setTimeout(() => root.classList.remove('theme-transition'), 250);
      }
    };
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" title="Theme" onClick={cycle}>
      <Icon className="h-5 w-5" />
    </Button>
  );
}

export function UserHeader() {
  const { user, logout } = useAuth();
  const { i18n, t } = useTranslation();
  const [drawer, setDrawer] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState<string>(localStorage.getItem('filters.query') || '');
  const [last, setLast] = useState<{ id: string; page?: number; pages?: number; at: number } | null>(null);

  // Read latest reading progress from localStorage
  useEffect(() => {
    if (!user?.id) { setLast(null); return; }
    const prefix = `progress:${user.id}:`;
    let best: { id: string; page?: number; pages?: number; at: number } | null = null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const id = key.substring(prefix.length);
      try {
        const { page, pages, at } = JSON.parse(localStorage.getItem(key) || '{}');
        if (typeof at === 'number') {
          if (!best || at > best.at) best = { id, page, pages, at };
        }
      } catch { /* ignore */ }
    }
    setLast(best);
  }, [user?.id]);

  // Also listen to storage updates (e.g., when reading in another tab)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!user?.id) return;
      if (e.key && e.key.startsWith(`progress:${user.id}:`)) {
        // Recompute latest
        const prefix = `progress:${user.id}:`;
        let best: { id: string; page?: number; pages?: number; at: number } | null = null;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key || !key.startsWith(prefix)) continue;
          const id = key.substring(prefix.length);
          try {
            const { page, pages, at } = JSON.parse(localStorage.getItem(key) || '{}');
            if (typeof at === 'number') {
              if (!best || at > best.at) best = { id, page, pages, at };
            }
          } catch {/* ignore */}
        }
        setLast(best);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [user?.id]);

  const { data: lastBook } = useQuery({
    queryKey: ['continue-reading', last?.id],
    enabled: !!last?.id,
    queryFn: () => getBook(last!.id),
  });

  const NavLink = ({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) => {
    const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
    return (
      <Link to={to} className={`inline-flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground'}`}>
        <Icon className="h-4 w-4" />
        <span className="hidden md:inline">{label}</span>
      </Link>
    );
  };

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query) localStorage.setItem('filters.query', query); else localStorage.removeItem('filters.query');
    const url = new URL(window.location.href);
    url.searchParams.set('q', query);
    navigate(`/books?q=${encodeURIComponent(query)}`);
  };

  return (
  <header className="sticky top-0 z-40 w-full bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/80 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setDrawer(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/" className="font-semibold tracking-tight">BIBLIO</Link>
          <nav className="ml-2 hidden md:flex items-center gap-2">
            <NavLink to="/" icon={Home} label={(t('home') as string) || 'Home'} />
            <NavLink to="/books" icon={BookOpenText} label={(t('books') as string) || 'Books'} />
            <NavLink to="/library" icon={Library} label={(t('my_library') as string) || 'My Library'} />
            <NavLink to="/categories" icon={Grid3X3} label={(t('categories') as string) || 'Categories'} />
          </nav>
        </div>

  <div className="flex items-center gap-1">
          {/* Quick search */}
          <form onSubmit={onSubmitSearch} className="hidden sm:flex items-center gap-2 mr-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('search_books') as string}
                className="pl-8 h-9 w-56 rounded-full bg-input/20 border-input placeholder:text-muted-foreground"
              />
            </div>
          </form>
          {/* Language under globe icon */}
          <div className="relative">
            <Button variant="ghost" size="icon" aria-label={t('language') as string} onClick={() => setLangOpen((v) => !v)}>
              <Globe className="h-5 w-5" />
            </Button>
            {langOpen && (
              <div className="absolute right-0 mt-2 w-28 rounded-md border bg-background p-1 shadow-lg border-border">
                {['en','fr'].map((lng) => (
                  <button key={lng} className={`w-full text-left px-2 py-1 rounded hover:bg-accent hover:text-accent-foreground ${i18n.language === lng ? 'font-medium' : ''}`} onClick={() => { i18n.changeLanguage(lng); setLangOpen(false); }}>
                    {lng.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Theme toggle icon only */}
          <ThemeToggleIcon />
          {/* User dropdown */}
          <div className="relative">
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-background hover:bg-accent hover:text-accent-foreground"
              aria-label={t('account') as string}
              onClick={() => setUserOpen((o) => !o)}
            >
              <span className="text-sm font-medium">
                {user?.username ? user.username.slice(0, 1).toUpperCase() : '?'}
              </span>
            </button>
            {userOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-md border bg-background p-1 shadow-lg">
                <Link to="/account" className="block rounded px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground">{t('account') as string}</Link>
                <Link to="/library" className="block rounded px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground">{t('my_library') as string}</Link>
                <button onClick={logout} className="w-full text-left rounded px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2">
                  <LogOut className="h-4 w-4" /> {t('logout') as string}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer for mobile nav */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-background p-4 shadow-xl border-r border-border">
            <div className="mb-4 font-semibold">{t('navigation')}</div>
            <div className="flex flex-col gap-2">
              <Link to="/" onClick={() => setDrawer(false)} className={`inline-flex items-center gap-2 px-3 py-2 rounded-md ${location.pathname === '/' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground'}`}>
                <Home className="h-4 w-4" /> {t('home')}
              </Link>
              <Link to="/books" onClick={() => setDrawer(false)} className={`inline-flex items-center gap-2 px-3 py-2 rounded-md ${location.pathname.startsWith('/books') ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground'}`}>
                <BookOpenText className="h-4 w-4" /> {t('books')}
              </Link>
              <Link to="/library" onClick={() => setDrawer(false)} className={`inline-flex items-center gap-2 px-3 py-2 rounded-md ${location.pathname.startsWith('/library') ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground'}`}>
                <Library className="h-4 w-4" /> {t('my_library')}
              </Link>
              <Link to="/categories" onClick={() => setDrawer(false)} className={`inline-flex items-center gap-2 px-3 py-2 rounded-md ${location.pathname.startsWith('/categories') ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground'}`}>
                <Grid3X3 className="h-4 w-4" /> {t('categories')}
              </Link>
              {/* Account link removed from drawer; accessible from avatar menu */}
            </div>
          </div>
        </div>
      )}
      {/* Continue reading strip */}
      {last && lastBook && (
        <div className="border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2 text-xs text-muted-foreground flex items-center gap-2">
            <span>{t('continue_reading') || 'Continue reading'}:</span>
            <Link to={`/reader/${last.id}`} className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 hover:bg-accent/80 transition text-accent-foreground">
              <span>{lastBook.title}</span>
              {typeof last.page === 'number' && (
                <span>• p.{last.page}{typeof last.pages === 'number' ? `/${last.pages}` : ''}</span>
              )}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default UserHeader;
