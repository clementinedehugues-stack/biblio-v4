import { Link, useLocation } from 'react-router-dom';
import { BookOpenText, Home, Library, User, Grid3X3 } from 'lucide-react';

export default function MobileBottomNav() {
  const location = useLocation();
  const items = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/books', label: 'Books', icon: BookOpenText },
    { to: '/library', label: 'Library', icon: Library },
    { to: '/categories', label: 'Categories', icon: Grid3X3 },
    { to: '/account', label: 'Account', icon: User },
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-border bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/80">
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
          return (
            <li key={to}>
              <Link
                to={to}
                aria-label={label}
                className={`flex flex-col items-center gap-1 py-2 text-xs ${active ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                <Icon className={`h-5 w-5 ${active ? '' : 'opacity-80'}`} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
