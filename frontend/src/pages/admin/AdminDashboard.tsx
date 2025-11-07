import { useQuery } from '@tanstack/react-query';
// Aggregated counts (users, books, categories)
// Removed documents counter (replaced by aggregated counts including categories)
import { fetchAdminCounts } from '@/services/adminStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdminLayout from '@/components/admin/AdminLayout';
import { useTranslation } from 'react-i18next';
import { BookOpen, Users, Tags } from 'lucide-react';
import AdminStatsWidgets from '@/components/admin/AdminStatsWidgets';
import Tabs from '@/components/ui/Tabs';
import AdminNotifications from '@/components/admin/AdminNotifications';
import AdminLogs from '@/components/admin/AdminLogs';
import AdminRoles from '@/components/admin/AdminRoles';
import AdminSupport from '@/components/admin/AdminSupport';


export function AdminDashboard() {
  const { t } = useTranslation();

  const { data: counts } = useQuery<{ users: number; books: number; categories: number }>({
    queryKey: ['admin-counts'],
    queryFn: fetchAdminCounts,
  });
  // regenMutation supprimé (maintenance déplacée)

  // No local UI state needed on this page

  // No layout-related effects here

  // No users table or categories on this screen anymore

  // No toasts on this page

  // regenMutation supprimé (maintenance déplacée)

  // StatCard composant local
  const StatCard = ({ label, value, Icon }: { label: string; value: number; Icon: React.ComponentType<{ className?: string }> }) => (
    <Card className="shadow-sm rounded-xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div>
          <div className="text-3xl font-bold tracking-tight">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t('admin.dashboard.updated_now')}</div>
        </div>
      </CardContent>
    </Card>
  );
    return (
      <AdminLayout>
        <div className="p-4 sm:p-6 md:p-8">
          <h1 className="mb-4 text-3xl font-bold tracking-tight">{t('admin.dashboard.title')}</h1>
          <Tabs
            tabs={[
              {
                key: 'stats',
                label: 'Statistiques',
                content: <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard label={t('total_users')} value={counts?.users ?? 0} Icon={Users} />
                    <StatCard label={t('total_books')} value={counts?.books ?? 0} Icon={BookOpen} />
                    <StatCard label={t('total_categories')} value={counts?.categories ?? 0} Icon={Tags} />
                  </div>
                  <AdminStatsWidgets />
                </>
              },
              {
                key: 'notifications',
                label: 'Notifications',
                content: <AdminNotifications />
              },
              {
                key: 'logs',
                label: 'Logs',
                content: <AdminLogs />
              },
              {
                key: 'roles',
                label: 'Rôles & permissions',
                content: <AdminRoles />
              },
              {
                key: 'support',
                label: 'Support',
                content: <AdminSupport />
              },
            ]}
          />
        </div>
      </AdminLayout>
    );
}

export default AdminDashboard;
