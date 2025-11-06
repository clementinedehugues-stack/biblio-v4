import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBook, getBooks } from '@/services/books';
import UserLayout from '@/components/layout/UserLayout';
import { PdfViewer } from '@/components/common/PdfViewer';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addComment, listComments, type CommentRead } from '@/services/comments';
import { useState } from 'react';
import { Star as StarIcon, BookMarked, BookOpen, BookCheck, Library } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useReadingStatus } from '@/hooks/useReadingStatus';
import { useShelves } from '@/hooks/useShelves';

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getReadingStatus, setReadingStatus } = useReadingStatus();
  const { shelves, addBookToShelf, removeBookFromShelf, getShelvesForBook } = useShelves();
  const [showShelfMenu, setShowShelfMenu] = useState(false);

  const qc = useQueryClient();
  const { data: book, isLoading, isError } = useQuery({
    queryKey: ['book', id],
    queryFn: () => getBook(id as string),
    enabled: !!id,
    retry: false, // avoid spamming 404s when book does not exist
    refetchOnWindowFocus: false,
  });

  type RelatedBook = { id: string; title: string; author: string };
  const { data: related = [] } = useQuery<RelatedBook[]>({
    queryKey: ['related', id],
    queryFn: async () => {
      if (!book) return [] as RelatedBook[];
      const list = await getBooks({ category: book.category, author: undefined, language: undefined });
      return (list as RelatedBook[]).filter((x) => x.id !== book.id).slice(0, 6);
    },
    enabled: !!id && !!book,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: comments = [] } = useQuery<CommentRead[]>({
    queryKey: ['comments', id],
    queryFn: () => listComments(id as string),
    enabled: !!id && !!book,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [rating, setRating] = useState<number | ''>('');
  const [content, setContent] = useState('');
  const { t } = useTranslation();
  const addCommentMut = useMutation({
    mutationFn: () => addComment(id as string, { rating: rating === '' ? null : rating, content: content || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comments', id] }); setRating(''); setContent(''); },
  });

  return (
    <UserLayout>
      <div className="p-4 sm:p-6 md:p-8">
        {isLoading && <div className="text-center py-10 text-muted-foreground">{t('book.loading')}</div>}
        {isError && (
          <div className="text-center py-10 text-destructive bg-destructive/10 p-4 rounded-lg space-y-3">
            <div>{t('book.error') || 'Livre introuvable ou supprimé.'}</div>
            <div>
              <Button onClick={() => navigate('/')} variant="outline">{t('back_home') || 'Retour à l\'accueil'}</Button>
            </div>
          </div>
        )}
        {book && (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <header className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{book.title}</h1>
                  <p className="text-lg text-muted-foreground mt-1">{book.author}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    {book.category && (
                      <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md">{book.category}</span>
                    )}
                    {book.language && (
                      <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md">{book.language}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 space-y-2">
                  <Link to={`/reader/${book.id}`}>
                    <Button size="lg" className="rounded-full shadow-md w-full" disabled={!book.has_document}>
                      {t('book.read_now')}
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Reading Status Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={getReadingStatus(book.id)?.status === 'to_read' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReadingStatus(book.id, 'to_read')}
                  className="flex items-center gap-2"
                >
                  <BookMarked className="h-4 w-4" />
                  {t('library.to_read')}
                </Button>
                <Button
                  variant={getReadingStatus(book.id)?.status === 'reading' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReadingStatus(book.id, 'reading')}
                  className="flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  {t('library.reading')}
                </Button>
                <Button
                  variant={getReadingStatus(book.id)?.status === 'finished' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReadingStatus(book.id, 'finished')}
                  className="flex items-center gap-2"
                >
                  <BookCheck className="h-4 w-4" />
                  {t('library.finished')}
                </Button>
                
                {/* Shelf management */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowShelfMenu(!showShelfMenu)}
                    className="flex items-center gap-2"
                  >
                    <Library className="h-4 w-4" />
                    {t('library.add_to_shelf')} ({getShelvesForBook(book.id).length})
                  </Button>
                  {showShelfMenu && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-background border rounded-lg shadow-lg p-2 z-10">
                      {shelves.length === 0 ? (
                        <div className="text-sm text-muted-foreground p-2">{t('library.no_shelves')}</div>
                      ) : (
                        shelves.map((shelf) => {
                          const isInShelf = shelf.bookIds.includes(book.id);
                          return (
                            <button
                              key={shelf.id}
                              onClick={() => {
                                if (isInShelf) {
                                  removeBookFromShelf(shelf.id, book.id);
                                } else {
                                  addBookToShelf(shelf.id, book.id);
                                }
                              }}
                              className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm flex items-center justify-between"
                            >
                              <span>{shelf.name}</span>
                              {isInShelf && <BookCheck className="h-4 w-4 text-green-500" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* PDF Viewer or Placeholder */}
            {book.has_document ? (
              <div className="rounded-xl overflow-hidden border shadow-inner">
                <PdfViewer bookId={book.id} streamPath={book.stream_endpoint ?? undefined} />
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-border p-8 text-center text-muted-foreground bg-card">
                {t('book.document_unavailable')}
              </div>
            )}

            {/* Related Books */}
            {related.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">{t('related_in_category')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {related.map((r) => (
                    <a
                      key={r.id}
                      href={`/books/${r.id}`}
                      className="block p-4 rounded-xl border bg-card hover:bg-accent hover:shadow-lg transition-all duration-200"
                    >
                      <div className="font-semibold">{r.title}</div>
                      <div className="text-sm text-muted-foreground">{r.author}</div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Comments Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">{t('comments')}</h2>
              
              {/* New Comment Form */}
              <div className="bg-card border rounded-xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">{t('rating_label')}</span>
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const active = typeof rating === 'number' ? i < rating : false;
                      return (
                        <button key={i} onClick={() => setRating(i + 1)} className="p-1 text-muted-foreground hover:text-yellow-500 transition-colors" aria-label={`Note ${i + 1}`}>
                          <StarIcon className={`h-6 w-6 ${active ? 'text-yellow-400 fill-current' : ''}`} />
                        </button>
                      );
                    })}
                  </div>
                  {typeof rating === 'number' && (
                    <Button variant="ghost" size="sm" onClick={() => setRating('')}>{t('clear')}</Button>
                  )}
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  placeholder={t('your_comment')}
                  className="w-full rounded-md p-2 bg-background border"
                />
                <div className="flex justify-end">
                  <Button onClick={() => addCommentMut.mutate()} disabled={addCommentMut.isPending}>
                    {addCommentMut.isPending ? t('saving') : t('publish')}
                  </Button>
                </div>
              </div>

              {/* Existing Comments */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground bg-card border rounded-lg">{t('no_comments_yet')}</div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="p-4 border rounded-xl bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">{c.username}</div>
                        <div className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
                      </div>
                      {typeof c.rating === 'number' && (
                        <div className="flex items-center gap-1 text-yellow-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <StarIcon key={i} className={`h-4 w-4 ${i < (c.rating || 0) ? 'fill-current' : ''}`} />
                          ))}
                        </div>
                      )}
                      {c.content && <p className="mt-2 whitespace-pre-wrap text-card-foreground/90">{c.content}</p>}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
