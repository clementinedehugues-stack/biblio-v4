import { useQuery } from "@tanstack/react-query";
import { getBooks, type Language } from "@/services/books";
import UserLayout from "@/components/layout/UserLayout";
 
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, Star as StarIcon } from "lucide-react";
import api from "@/services/api";
import { useFavorites } from "@/hooks/useFavorites";
import { useTranslation } from 'react-i18next';
import { BookCard, type BookCardBook } from '@/components/user/BookCard';
import { Skeleton } from '@/components/ui/skeleton';
 

interface Book {
  id: string; // backend uses UUID
  title: string;
  author: string;
  category?: string;
  language?: 'FR' | 'EN';
}

export default function BooksPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const urlQ = new URLSearchParams(location.search).get('q') || '';
  const [searchQuery, setSearchQuery] = useState(urlQ || localStorage.getItem('filters.query') || '');
  const [language, setLanguage] = useState<'' | 'EN' | 'FR'>((localStorage.getItem('filters.language') as 'EN'|'FR') || '');
  const urlCategory = new URLSearchParams(location.search).get('category') || '';
  const [category, setCategory] = useState<string>(urlCategory || ''+(localStorage.getItem('filters.category') || ''));
  const { isFavorite } = useFavorites();
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [density, setDensity] = useState<'comfortable'|'compact'>((localStorage.getItem('ui.density') as 'comfortable'|'compact') || 'comfortable');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Persist filters
  useEffect(() => {
    if (searchQuery) localStorage.setItem('filters.query', searchQuery);
    else localStorage.removeItem('filters.query');
  }, [searchQuery]);
  // Sync URL param when it changes externally
  useEffect(() => {
    if (urlQ !== searchQuery) setSearchQuery(urlQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQ]);
  useEffect(() => {
    if (language) localStorage.setItem('filters.language', language);
    else localStorage.removeItem('filters.language');
  }, [language]);
  useEffect(() => {
    if (category) localStorage.setItem('filters.category', category);
    else localStorage.removeItem('filters.category');
  }, [category]);
  useEffect(() => {
    if (urlCategory !== category) setCategory(urlCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCategory]);
  useEffect(() => {
    localStorage.setItem('ui.density', density);
  }, [density]);
  // Reset pagination on filters
  useEffect(() => { setPage(1); }, [searchQuery, language, category, onlyFavs]);

  const { data: books, isLoading, isError } = useQuery<Book[]>({
    queryKey: ['books', { searchQuery, language, category }],
    queryFn: async () => {
      if (searchQuery) {
        const { data } = await api.get(`/documents/search`, { params: { query: searchQuery } });
        // When searching full-text, optionally filter language/category client-side
        let out = (data as Book[]).filter(b => ((!language || b.language === language) && (!category || b.category === category)));
        if (onlyFavs) out = out.filter(b => isFavorite(b.id));
        return out;
      }
  const langParam: Language | undefined = language === '' ? undefined : (language as Language);
      const catParam = category || undefined;
      const server = await getBooks({ language: langParam, category: catParam });
      return onlyFavs ? (server as Book[]).filter(b => isFavorite(b.id)) : server;
    }
  });

  const visibleBooks = useMemo(() => {
    const list = (books || []) as BookCardBook[];
    return list.slice(0, page * PAGE_SIZE);
  }, [books, page]);

  // Infinite scroll sentinel
  const [sentinelRef, setSentinelRef] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelRef) return;
    const io = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting) {
        if ((books?.length || 0) > visibleBooks.length) {
          setPage((p) => p + 1);
        }
      }
    }, { rootMargin: '200px' });
    io.observe(sentinelRef);
    return () => io.disconnect();
  }, [sentinelRef, books?.length, visibleBooks.length]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    (books || []).forEach(b => { if (b.category) set.add(b.category); });
    return Array.from(set).sort();
  }, [books]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const params = new URLSearchParams(location.search);
    if (query) params.set('q', query); else params.delete('q');
    navigate({ pathname: '/books', search: params.toString() });
  };

  return (
    <UserLayout>
      <div className="p-4 sm:p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t('books')}</h1>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              className="pl-10 h-12 rounded-full text-base"
              placeholder={t('books.search_placeholder')}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <div className="p-3 bg-card border rounded-xl">
            <div className="flex flex-wrap items-center gap-2">
              {([
                { k: '', label: t('all_languages') },
                { k: 'EN', label: t('english') },
                { k: 'FR', label: t('french') },
              ] as const).map((opt) => (
                <button
                  key={String(opt.k)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    String(language) === String(opt.k)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                  onClick={() => setLanguage(opt.k as '' | 'EN' | 'FR')}
                >
                  {opt.label}
                </button>
              ))}
              <div className="h-6 w-px bg-border mx-2" />
              <button
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  onlyFavs
                    ? 'bg-yellow-400/80 text-yellow-900'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                onClick={() => setOnlyFavs(!onlyFavs)}
              >
                <StarIcon className={`h-4 w-4 ${onlyFavs ? 'fill-current' : ''}`} />
                {t('favorites')}
              </button>
              <div className="ml-auto flex items-center gap-1 p-1 bg-secondary rounded-full">
                <button
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    density === 'comfortable' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                  }`}
                  onClick={() => setDensity('comfortable')}
                >
                  {t('books.comfortable')}
                </button>
                <button
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    density === 'compact' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                  }`}
                  onClick={() => setDensity('compact')}
                >
                  {t('books.compact')}
                </button>
              </div>
            </div>
            {categories.length > 0 && (
              <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    category === ''
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                  onClick={() => setCategory('')}
                >
                  {t('all_categories')}
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      category === c
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-3 space-y-2">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        )}
        {isError && (
          <div className="text-destructive bg-destructive/10 p-4 rounded-lg text-center">
            {t('books.loading_error')}
          </div>
        )}
        {!isLoading && books && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {(visibleBooks as BookCardBook[]).map((b, idx) => (
                <BookCard key={`${b.id}-${idx}`} book={b} index={idx} density={density} />
              ))}
            </div>
            {books.length === 0 && (
              <div className="col-span-full text-muted-foreground text-center py-10">
                {t('none_found')}
              </div>
            )}
          </>
        )}
        {!isLoading && books && visibleBooks.length < books.length && (
          <div className="mt-6 flex justify-center">
            <Button onClick={() => setPage((p) => p + 1)} variant="outline" className="rounded-full">
              {t('books.show_more')}
            </Button>
          </div>
        )}
        <div ref={setSentinelRef} className="h-1 w-full" />
      </div>
    </UserLayout>
  );
}
