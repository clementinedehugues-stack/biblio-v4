import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import UserLayout from '@/components/layout/UserLayout';
import { getBooks } from '@/services/books';
import { BookCard, type BookCardBook } from '@/components/user/BookCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useFavorites } from '@/hooks/useFavorites';
import { useReadingStatus, type ReadingStatus } from '@/hooks/useReadingStatus';
import { useShelves } from '@/hooks/useShelves';
import { useReadingStats } from '@/hooks/useReadingStats';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  BookMarked, 
  BookOpen, 
  BookCheck, 
  Star, 
  Library, 
  TrendingUp, 
  Calendar,
  Award,
  Plus,
  Download,
  Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';

type ViewFilter = 'all' | ReadingStatus | 'shelf';

export default function LibraryPage() {
  const { favorites } = useFavorites();
  const { statuses, getBooksByStatus } = useReadingStatus();
  const { shelves, createShelf, deleteShelf } = useShelves();
  const stats = useReadingStats();
  const { t } = useTranslation();
  const density = (localStorage.getItem('ui.density') as 'comfortable'|'compact') || 'comfortable';

  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [newShelfName, setNewShelfName] = useState('');
  const [showNewShelf, setShowNewShelf] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['books', 'library'],
    queryFn: async () => await getBooks(),
  });

  // Filter books based on selected view
  const filteredBooks = useMemo(() => {
    const allBooks = (data as BookCardBook[]) || [];
    if (viewFilter === 'all') {
      // Show all books that have any library status
      const bookIdsWithStatus = Object.keys(statuses);
      return allBooks.filter((b) => bookIdsWithStatus.includes(b.id));
    } else if (viewFilter === 'favorites') {
      const favSet = new Set(favorites);
      return allBooks.filter((b) => favSet.has(b.id));
    } else if (viewFilter === 'shelf' && selectedShelfId) {
      const shelf = shelves.find((s) => s.id === selectedShelfId);
      if (!shelf) return [];
      const shelfBookIds = new Set(shelf.bookIds);
      return allBooks.filter((b) => shelfBookIds.has(b.id));
    } else {
      // Filter by reading status
      const bookIds = getBooksByStatus(viewFilter as ReadingStatus);
      const bookIdsSet = new Set(bookIds);
      return allBooks.filter((b) => bookIdsSet.has(b.id));
    }
  }, [viewFilter, selectedShelfId, data, statuses, favorites, shelves, getBooksByStatus]);

  const handleCreateShelf = () => {
    if (!newShelfName.trim()) return;
    createShelf(newShelfName);
    setNewShelfName('');
    setShowNewShelf(false);
  };

  const handleExportLibrary = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      stats,
      statuses,
      shelves,
      favorites,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `library_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Library className="h-8 w-8" />
              {t('my_library')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.totalBooks} {t('items')} • {stats.totalPagesRead} {t('pages_read')}
            </p>
          </div>
          <Button onClick={handleExportLibrary} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('library.export')}
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div 
            className="p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => setViewFilter('to_read')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <BookMarked className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.booksToRead}</div>
                <div className="text-xs text-muted-foreground">{t('library.to_read')}</div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => setViewFilter('reading')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <BookOpen className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.booksReading}</div>
                <div className="text-xs text-muted-foreground">{t('library.reading')}</div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => setViewFilter('finished')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <BookCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.booksFinished}</div>
                <div className="text-xs text-muted-foreground">{t('library.finished')}</div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => setViewFilter('favorites')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{favorites.length}</div>
                <div className="text-xs text-muted-foreground">{t('favorites')}</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Reading Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border bg-linear-to-br from-purple-500/10 to-pink-500/10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">{t('library.reading_streak')}</span>
            </div>
            <div className="text-3xl font-bold">{stats.readingStreak}</div>
            <div className="text-xs text-muted-foreground">{t('library.consecutive_days')}</div>
          </div>

          <div className="p-4 rounded-xl border bg-linear-to-br from-blue-500/10 to-cyan-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">{t('library.this_month')}</span>
            </div>
            <div className="text-3xl font-bold">{stats.thisMonthBooks}</div>
            <div className="text-xs text-muted-foreground">{t('library.books_completed')}</div>
          </div>

          <div className="p-4 rounded-xl border bg-linear-to-br from-green-500/10 to-emerald-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">{t('library.avg_pages')}</span>
            </div>
            <div className="text-3xl font-bold">{stats.averagePagesPerBook}</div>
            <div className="text-xs text-muted-foreground">{t('library.pages_per_book')}</div>
          </div>
        </div>

        {/* Shelves Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t('library.my_shelves')}</h2>
            <Button 
              onClick={() => setShowNewShelf(!showNewShelf)} 
              variant="outline" 
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('library.new_shelf')}
            </Button>
          </div>

          {showNewShelf && (
            <div className="flex gap-2">
              <Input
                value={newShelfName}
                onChange={(e) => setNewShelfName(e.target.value)}
                placeholder={t('library.shelf_name_placeholder')}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateShelf()}
              />
              <Button onClick={handleCreateShelf}>{t('add')}</Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant={viewFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setViewFilter('all'); setSelectedShelfId(null); }}
            >
              {t('library.all_books')}
            </Button>
            {shelves.map((shelf) => (
              <div key={shelf.id} className="relative group">
                <Button
                  variant={viewFilter === 'shelf' && selectedShelfId === shelf.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewFilter('shelf');
                    setSelectedShelfId(shelf.id);
                  }}
                >
                  {shelf.name} ({shelf.bookIds.length})
                </Button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(t('library.confirm_delete_shelf'))) {
                      deleteShelf(shelf.id);
                      if (selectedShelfId === shelf.id) {
                        setViewFilter('all');
                        setSelectedShelfId(null);
                      }
                    }
                  }}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Books Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {viewFilter === 'all' && t('library.all_books')}
              {viewFilter === 'to_read' && t('library.to_read')}
              {viewFilter === 'reading' && t('library.reading')}
              {viewFilter === 'finished' && t('library.finished')}
              {viewFilter === 'favorites' && t('favorites')}
              {viewFilter === 'shelf' && selectedShelfId && shelves.find(s => s.id === selectedShelfId)?.name}
              <span className="ml-2 text-sm text-muted-foreground">({filteredBooks.length})</span>
            </h2>
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
              {filteredBooks.map((b: BookCardBook, idx: number) => (
                <BookCard key={b.id} book={b} index={idx} density={density} />
              ))}
              {filteredBooks.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Library className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{t('library.no_books_in_filter')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
}
