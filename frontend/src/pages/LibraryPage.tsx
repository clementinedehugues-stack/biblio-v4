import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import UserLayout from '@/components/layout/UserLayout';
import { getBooks } from '@/services/books';
import { BookCard, type BookCardBook } from '@/components/user/BookCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useFavorites } from '@/hooks/useFavorites';
import { useTranslation } from 'react-i18next';

export default function LibraryPage() {
  const { favorites } = useFavorites();
  const { t } = useTranslation();
  const density = (localStorage.getItem('ui.density') as 'comfortable'|'compact') || 'comfortable';

  const { data, isLoading } = useQuery({
    queryKey: ['books', 'library'],
    queryFn: async () => await getBooks(),
  });

  const favBooks = useMemo(() => {
    const set = new Set(favorites);
    return ((data as BookCardBook[]) || []).filter((b) => set.has(b.id));
  }, [favorites, data]);

  return (
    <UserLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('my_library')}</h1>
          <div className="text-sm text-muted-foreground">{favBooks.length} {t('items')}</div>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card/50 p-3">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="mt-3 h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {favBooks.map((b: BookCardBook, idx: number) => (
              <BookCard key={b.id} book={b} index={idx} density={density} />
            ))}
            {favBooks.length === 0 && (
              <div className="col-span-full text-muted-foreground">{t('no_favorites_yet')}</div>
            )}
          </div>
        )}
      </div>
    </UserLayout>
  );
}
