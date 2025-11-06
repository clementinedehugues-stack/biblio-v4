import { useQuery } from '@tanstack/react-query';
import { getBooks } from '@/services/books';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ModeratorLayout from '@/components/moderator/ModeratorLayout';
import { useTranslation } from 'react-i18next';
import { BookOpen, Tags } from 'lucide-react';

type ModeratorBook = { id: string };

export function ModeratorDashboard() {
  const { t } = useTranslation();

  const { data: books } = useQuery<ModeratorBook[]>({ queryKey: ['books'], queryFn: () => getBooks() });

  const StatCard = ({ label, value, Icon }: { label: string; value: number; Icon: React.ComponentType<{ className?: string }> }) => (
    <Card className="shadow-sm rounded-xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div>
          <div className="text-3xl font-bold tracking-tight">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t('moderator.dashboard.updated_now')}</div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <ModeratorLayout>
      <div className="p-4 sm:p-6 md:p-8">
        <h1 className="mb-6 text-3xl font-bold tracking-tight">{t('moderator.dashboard.title')}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatCard label={t('moderator.total_books')} value={books?.length || 0} Icon={BookOpen} />
          <StatCard label={t('moderator.total_categories')} value={0} Icon={Tags} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('moderator.dashboard.welcome')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('moderator.dashboard.description')}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-green-500" />
                <span>{t('moderator.dashboard.can_add_books')}</span>
              </li>
              <li className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-green-500" />
                <span>{t('moderator.dashboard.can_create_categories')}</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </ModeratorLayout>
  );
}

export default ModeratorDashboard;
