import UserLayout from '@/components/layout/UserLayout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ChangePasswordForm } from '@/components/user/ChangePasswordForm';
import { useTranslation } from 'react-i18next';

export default function AccountPage() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <UserLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card/50 p-4">
            <h1 className="text-2xl font-bold">{t('account')}</h1>
            <p className="text-muted-foreground mt-1">{t('manage_account')}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-2">
            <div className="font-semibold">{t('profile')}</div>
            <div className="text-sm text-muted-foreground">{t('username')}: {user?.username}</div>
            <div className="text-sm text-muted-foreground">{t('role')}: {user?.role}</div>
            <div className="pt-2">
              <Button variant="outline" onClick={logout}>{t('logout')}</Button>
            </div>
          </div>
          <ChangePasswordForm />
        </div>
        <aside className="space-y-3">
          <div className="rounded-2xl border border-border bg-card/50 p-4">
            <div className="font-semibold">{t('tips')}</div>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
              <li>{t('tip_keyboard')}</li>
              <li>{t('tip_zoom')}</li>
              <li>{t('tip_progress')}</li>
            </ul>
          </div>
        </aside>
      </div>
    </UserLayout>
  );
}
