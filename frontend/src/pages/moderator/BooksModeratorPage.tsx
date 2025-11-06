import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBooks, type Language } from '@/services/books';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ModeratorLayout from '@/components/moderator/ModeratorLayout';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Upload, Search, ArrowUpDown, ChevronUp, ChevronDown, Eye } from 'lucide-react';

type ModeratorBook = {
  id: string;
  title: string;
  author: string;
  category?: string;
  language?: Language;
  created_at?: string;
  thumbnail_path?: string | null;
};

export default function BooksModeratorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: books = [] } = useQuery<ModeratorBook[]>({ queryKey: ['books'], queryFn: () => getBooks() });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<'title'|'author'|'category'|'created_at'>('created_at');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredBooks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return books;
    return books.filter((b) => [b.title, b.author, b.category]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(term)
    );
  }, [books, searchTerm]);

  const sortedBooks = useMemo(() => {
    const arr = [...filteredBooks];
    arr.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      let va: number | string = '';
      let vb: number | string = '';
      if (sortKey === 'created_at') {
        va = a.created_at ? new Date(a.created_at).getTime() : 0;
        vb = b.created_at ? new Date(b.created_at).getTime() : 0;
      } else if (sortKey === 'title') {
        va = (a.title || '').toLowerCase();
        vb = (b.title || '').toLowerCase();
      } else if (sortKey === 'author') {
        va = (a.author || '').toLowerCase();
        vb = (b.author || '').toLowerCase();
      } else {
        va = (a.category || '').toLowerCase();
        vb = (b.category || '').toLowerCase();
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filteredBooks, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedBooks.length / pageSize));
  const paginatedBooks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedBooks.slice(start, start + pageSize);
  }, [sortedBooks, page]);

  useEffect(() => { setPage(1); }, [searchTerm, sortKey, sortDir]);

  const handleSort = (key: 'title'|'author'|'category'|'created_at') => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'created_at' ? 'desc' : 'asc');
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  const SortIcon = ({ col }: { col: typeof sortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="ml-1 inline h-4 w-4 opacity-40" />;
    return sortDir === 'asc'
      ? <ChevronUp className="ml-1 inline h-4 w-4" />
      : <ChevronDown className="ml-1 inline h-4 w-4" />;
  };

  return (
    <ModeratorLayout>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-indigo-600" />
              {t('moderator.books.title')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('moderator.books.subtitle')}</p>
          </div>
          <Button onClick={() => navigate('/upload')} className="bg-indigo-600 hover:bg-indigo-700">
            <Upload className="mr-2 h-4 w-4" />
            {t('upload_book')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle>{t('moderator.books.all_books')} ({sortedBooks.length})</CardTitle>
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-md border border-input bg-background w-full sm:w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 px-4 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('title')}>
                      {t('title')}
                      <SortIcon col="title" />
                    </th>
                    <th className="pb-3 px-4 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('author')}>
                      {t('author')}
                      <SortIcon col="author" />
                    </th>
                    <th className="pb-3 px-4 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('category')}>
                      {t('category')}
                      <SortIcon col="category" />
                    </th>
                    <th className="pb-3 px-4 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('created_at')}>
                      {t('date')}
                      <SortIcon col="created_at" />
                    </th>
                    <th className="pb-3 px-4 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBooks.map((book) => (
                    <tr key={book.id} className="border-b hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {book.thumbnail_path && (
                            <img
                              src={book.thumbnail_path}
                              alt={book.title}
                              className="h-10 w-8 object-cover rounded"
                            />
                          )}
                          <span className="font-medium">{book.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{book.author}</td>
                      <td className="py-3 px-4">{book.category || '-'}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{formatDate(book.created_at)}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/book/${book.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('view')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t('previous')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t('page')} {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t('next')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModeratorLayout>
  );
}
