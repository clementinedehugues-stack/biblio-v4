import UserHeader from './UserHeader';
import MobileBottomNav from './MobileBottomNav';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <UserHeader />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}
