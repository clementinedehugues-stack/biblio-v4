import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBooks, updateBook, type Language } from '@/services/books';
import type { BookCreatePayload } from '@/services/books';
import * as BooksService from '@/services/books';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/components/admin/AdminLayout';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Upload, Pencil, Trash2, Search, Loader2, ArrowUpDown, ChevronUp, ChevronDown, X } from 'lucide-react';

type AdminBook = {
  id: string;
  title: string;
  author: string;
  category?: string;
  language?: Language;
  created_at?: string;
  thumbnail_path?: string | null;
};

type Toast = { id: string; type: 'success' | 'error' | 'info'; message: string };

export default function BooksAdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: books = [] } = useQuery<AdminBook[]>({ queryKey: ['books'], queryFn: () => getBooks() });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<'title'|'author'|'category'|'created_at'>('created_at');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Edit modal state
  const [editTarget, setEditTarget] = useState<AdminBook | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; author: string; category: string }>({ title: '', author: '', category: '' });

  // Delete confirm modal state
  const [deleteTarget, setDeleteTarget] = useState<AdminBook | null>(null);

  const pushToast = (payload: Omit<Toast, 'id'>) => {
    const toast = { id: crypto.randomUUID(), ...payload };
    setToasts((t) => [...t, toast]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toast.id)), 2500);
  };

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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => BooksService.deleteBook(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['books'] });
  pushToast({ type: 'success', message: t('book_deleted') });
    },
    onError: () => {
  pushToast({ type: 'error', message: t('book_delete_failed') });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<BookCreatePayload> }) => updateBook(id, patch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['books'] });
  pushToast({ type: 'success', message: t('book_updated') });
      setEditTarget(null);
    },
    onError: () => {
  pushToast({ type: 'error', message: t('book_update_failed') });
    },
  });

  const openEdit = (b: AdminBook) => {
    setEditTarget(b);
    setEditForm({ title: b.title, author: b.author, category: b.category || '' });
  };

  const submitEdit = () => {
    if (!editTarget) return;
    updateMutation.mutate({ id: editTarget.id, patch: { title: editForm.title, author: editForm.author, category: editForm.category } });
  };

  const openDelete = (b: AdminBook) => setDeleteTarget(b);
  const confirmDelete = () => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  return (
    <AdminLayout>
      <section aria-labelledby="books-admin-heading" className="scroll-mt-20">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 id="books-admin-heading" className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> {t('books_management')}
          </h1>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                className="w-full h-9 rounded-md border bg-background pl-8 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1"
                placeholder={t('search_books')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label={t('search_books')}
              />
            </div>
            <Button variant="outline" onClick={() => navigate('/upload')} aria-label={t('go_to_upload')}>
              <Upload className="mr-2 h-4 w-4" /> {t('upload')}
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="hidden">
            <CardTitle>Books</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left border-b border-border">
                    <th className="p-3 font-medium">
                      <button className="inline-flex items-center gap-1 hover:underline" onClick={() => handleSort('title')}>
                        {t('title')}
                        {sortKey !== 'title' ? <ArrowUpDown className="h-3.5 w-3.5" /> : sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </th>
                    <th className="p-3 font-medium">
                      <button className="inline-flex items-center gap-1 hover:underline" onClick={() => handleSort('author')}>
                        {t('author')}
                        {sortKey !== 'author' ? <ArrowUpDown className="h-3.5 w-3.5" /> : sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </th>
                    <th className="p-3 font-medium hidden md:table-cell">
                      <button className="inline-flex items-center gap-1 hover:underline" onClick={() => handleSort('category')}>
                        {t('category')}
                        {sortKey !== 'category' ? <ArrowUpDown className="h-3.5 w-3.5" /> : sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </th>
                    <th className="p-3 font-medium hidden lg:table-cell">
                      <button className="inline-flex items-center gap-1 hover:underline" onClick={() => handleSort('created_at')}>
                        {t('date_added')}
                        {sortKey !== 'created_at' ? <ArrowUpDown className="h-3.5 w-3.5" /> : sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </th>
                    <th className="p-3 font-medium hidden md:table-cell">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBooks.map((b) => (
                    <tr key={b.id} className="border-t transition-colors hover:bg-accent/30">
                      <td className="p-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium flex items-center gap-2">
                            <span>{b.title}</span>
                            <span
                              className={
                                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ' +
                                (b.thumbnail_path
                                  ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-300 bg-emerald-500/10'
                                  : 'border-muted-foreground/20 text-muted-foreground bg-muted/30')
                              }
                              title={b.thumbnail_path ? (t('has_thumbnail') as string) : (t('no_thumbnail') as string)}
                              aria-label={b.thumbnail_path ? (t('has_thumbnail') as string) : (t('no_thumbnail') as string)}
                            >
                              {b.thumbnail_path ? t('thumbnail') : t('no_thumb')}
                            </span>
                          </div>
                          <div className="truncate text-xs text-muted-foreground md:hidden">{b.author}</div>
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell">{b.author}</td>
                      <td className="p-3 hidden md:table-cell">{b.category || '—'}</td>
                      <td className="p-3 hidden lg:table-cell">{formatDate(b.created_at)}</td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="ghost" aria-label={t('edit_book')}
                            onClick={() => openEdit(b)}
                          >
                            <Pencil />
                          </Button>
                          <Button size="icon" variant="ghost" aria-label={t('delete_book')}
                            onClick={() => openDelete(b)} disabled={deleteMutation.isPending && deleteTarget?.id === b.id}
                          >
                            {deleteMutation.isPending && deleteTarget?.id === b.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedBooks.length === 0 && (
                    <tr>
                      <td className="p-6 text-center text-sm text-muted-foreground" colSpan={5}>
                        {t('no_results')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {sortedBooks.length > pageSize && (
          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {t('pagination_range', {
                from: (page - 1) * pageSize + 1,
                to: Math.min(page * pageSize, sortedBooks.length),
                total: sortedBooks.length,
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                {t('prev')}
              </Button>
              <span className="text-sm">{page} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                {t('next')}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditTarget(null)} />
          <div className="relative w-full max-w-md rounded-lg border bg-background p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('edit_book')}</h2>
              <button className="p-1 rounded hover:bg-muted" onClick={() => setEditTarget(null)} aria-label={t('close')}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">{t('title')}</label>
                <input className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm">{t('author')}</label>
                <input className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={editForm.author} onChange={(e) => setEditForm((f) => ({ ...f, author: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm">{t('category')}</label>
                <input className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditTarget(null)} disabled={updateMutation.isPending}>
                {t('cancel')}
              </Button>
              <Button onClick={submitEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-md rounded-lg border bg-background p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('confirm_delete')}</h2>
              <button className="p-1 rounded hover:bg-muted" onClick={() => setDeleteTarget(null)} aria-label={t('close')}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('confirm_delete_book')}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
                {t('cancel')}
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('delete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="pointer-events-none fixed right-4 top-16 z-50 flex flex-col gap-2">
        {toasts.map((tst) => (
          <div
            key={tst.id}
            className={
              'pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-md transition-all ' +
              (tst.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : tst.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/30 border-red-500/30 text-red-700 dark:text-red-300'
                : 'bg-blue-50 dark:bg-blue-950/30 border-blue-500/30 text-blue-700 dark:text-blue-300')
            }
            role="status"
            aria-live="polite"
          >
            {tst.message}
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
