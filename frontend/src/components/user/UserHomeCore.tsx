import { motion } from 'framer-motion';
import { BookCard, type BookCardBook } from '@/components/user/BookCard';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { getBooks, getBook } from '@/services/books';
import { listCategories } from '@/services/categories';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight } from 'lucide-react';

export function UserHomeCore() {
  const saved = localStorage.getItem('ui.density') as 'comfortable' | 'compact' | null;
  const density: 'comfortable' | 'compact' = saved === 'compact' ? 'compact' : 'comfortable';
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: books, isLoading: booksLoading, isError: booksError } = useQuery({
    queryKey: ['home','books'],
    queryFn: async () => await getBooks(),
  });
  const { data: cats, isLoading: catsLoading, isError: catsError } = useQuery({
    queryKey: ['home','categories'],
    queryFn: async () => await listCategories(),
  });

  const featured = useMemo(() => {
    const list = (books as BookCardBook[] | undefined) || [];
    // Heuristic: take first three; backend can later provide a "featured" flag/order
    return list.slice(0, 3);
  }, [books]);
  const recent = useMemo(() => {
    const list = (books as BookCardBook[] | undefined) || [];
    return list.slice(0, 10);
  }, [books]);
  const categories = useMemo(() => {
    return (cats || []).map(c => ({ name: c.name, count: c.usage_count }));
  }, [cats]);

  // Continue reading: find latest progress for this user
  const latest = useMemo(() => {
    if (!user?.id) return null as null | { bookId: string; page?: number; pages?: number; at: number };
    const prefix = `progress:${user.id}:`;
    let best: { bookId: string; page?: number; pages?: number; at: number } | null = null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const id = key.substring(prefix.length);
      try {
        const { page, pages, at } = JSON.parse(localStorage.getItem(key) || '{}');
        if (typeof at === 'number') {
          if (!best || at > (best.at || 0)) best = { bookId: id, page, pages, at };
        }
      } catch {/* ignore */}
    }
    return best;
  }, [user?.id]);

  const { data: continueBook } = useQuery({
    queryKey: ['home','continue', latest?.bookId],
    enabled: !!latest?.bookId,
    queryFn: () => getBook(latest!.bookId),
  });

  // Recommendations based on the most frequent category in history (fallback: first category by usage)
  const recommendations = useMemo(() => {
    const list = (books as BookCardBook[] | undefined) || [];
    if (!user?.id) return [] as BookCardBook[];
    // Build a quick map from bookId -> category
    const byId = new Map(list.map((b) => [b.id, b] as const));
    const counts: Record<string, number> = {};
    const seenIds = new Set<string>();
    const prefix = `progress:${user.id}:`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const id = key.substring(prefix.length);
      seenIds.add(id);
      const b = byId.get(id);
      if (b?.category) counts[b.category] = (counts[b.category] || 0) + 1;
    }
    let top: string | null = null; let best = 0;
    for (const [cat, n] of Object.entries(counts)) { if (n > best) { top = cat; best = n; } }
    if (!top && categories.length) top = categories[0].name;
    if (!top) return [] as BookCardBook[];
    return list.filter((b) => b.category === top && !seenIds.has(b.id)).slice(0, 6);
  }, [books, categories, user?.id]);

  return (
    <div className="space-y-8 p-4 sm:p-6 md:p-8">
      {/* Continue reading (if any) */}
      {latest && continueBook && (
        <section>
          <div className="rounded-2xl border bg-card text-card-foreground shadow-sm p-4 flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-12 w-12 rounded-lg bg-linear-to-br from-primary/80 to-primary/50 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm text-muted-foreground">{t('home.continue_reading')}</div>
                <div className="truncate font-semibold text-lg">{continueBook.title}</div>
                {typeof latest.page === 'number' && (
                  <div className="text-xs text-muted-foreground">
                    p.{latest.page}
                    {typeof latest.pages === 'number' ? `/${latest.pages}` : ''}
                  </div>
                )}
              </div>
            </div>
            <Link to={`/reader/${latest.bookId}`} className="shrink-0 ml-4">
              <Button className="rounded-full shadow-md">
                {t('home.continue')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Featured row */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t('home.featured')}</h2>
          <Link to="/books">
            <Button variant="outline" className="rounded-full">
              {t('home.see_all')}
            </Button>
          </Link>
        </div>
        {booksLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-card p-4 space-y-3">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : booksError ? (
          <div className="text-destructive text-sm rounded-md bg-destructive/10 p-3">{t('home.featured_error')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((b, idx) => (
              <motion.a
                key={b.id}
                href={`/books/${b.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(0.06 * idx, 0.4) }}
                className="group relative overflow-hidden rounded-2xl border bg-card text-card-foreground p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <div className="absolute inset-0 pointer-events-none bg-linear-to-br from-primary/10 to-transparent" />
                <div className="relative">
                  <div className="text-sm text-muted-foreground">{b.author}</div>
                  <div className="mt-1 text-lg font-semibold">{b.title}</div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    {b.language && <span className="rounded-full border px-2 py-0.5">{b.language}</span>}
                    {b.category && <span className="rounded-full border px-2 py-0.5">{b.category}</span>}
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </section>

      {/* Recent grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t('home.recently_added')}</h2>
        </div>
        {booksLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-3 space-y-2">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : booksError ? (
          <div className="text-destructive text-sm rounded-md bg-destructive/10 p-3">{t('home.recent_error')}</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {recent.map((b, idx) => (
              <BookCard key={b.id} book={b} index={idx} density={density} />
            ))}
          </div>
        )}
      </section>

      {/* Categories carousel */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t('home.browse_by_category')}</h2>
        </div>
        {catsLoading ? (
          <div className="-mx-2 overflow-x-auto no-scrollbar">
            <div className="px-2 inline-flex gap-3 min-w-full">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-28 rounded-full" />
              ))}
            </div>
          </div>
        ) : catsError ? (
          <div className="text-destructive text-sm rounded-md bg-destructive/10 p-3">{t('home.categories_error')}</div>
        ) : (
          <div className="-mx-2 overflow-x-auto custom-scrollbar no-scrollbar">
            <div className="px-2 inline-flex gap-3 min-w-full">
              {categories.map((c, idx) => (
                <motion.a
                  key={c.name}
                  href={`/books?category=${encodeURIComponent(c.name)}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(0.04 * idx, 0.3) }}
                  className="rounded-full border bg-card px-4 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {c.name}
                  <span className="ml-2 text-muted-foreground font-normal">{c.count}</span>
                </motion.a>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Recommendations */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t('home.recommendations')}</h2>
        </div>
        {booksLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-3 space-y-2">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {recommendations.length > 0 ? (
              recommendations.map((b, idx) => (
                <BookCard key={b.id} book={b} index={idx} density={density} />
              ))
            ) : (
              <div className="col-span-full text-muted-foreground bg-card border rounded-lg p-6 text-center">
                {t('home.no_recommendations')}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default UserHomeCore;
