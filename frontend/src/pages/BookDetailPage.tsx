import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBook, getBooks } from '@/services/books';
import UserLayout from '@/components/layout/UserLayout';
import { PdfViewer } from '@/components/common/PdfViewer';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addComment, listComments, type CommentRead } from '@/services/comments';
import { useState } from 'react';
import { Star as StarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();

  const qc = useQueryClient();
  const { data: book, isLoading, isError } = useQuery({
    queryKey: ['book', id],
    queryFn: () => getBook(id as string),
    enabled: !!id,
  });

  type RelatedBook = { id: string; title: string; author: string };
  const { data: related = [] } = useQuery<RelatedBook[]>({
    queryKey: ['related', id],
    queryFn: async () => {
      const b = await getBook(id as string);
      const list = await getBooks({ category: b.category, author: undefined, language: undefined });
      return (list as RelatedBook[]).filter((x) => x.id !== b.id).slice(0, 6);
    },
    enabled: !!id,
  });

  const { data: comments = [] } = useQuery<CommentRead[]>({
    queryKey: ['comments', id],
    queryFn: () => listComments(id as string),
    enabled: !!id,
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
        {isError && <div className="text-center py-10 text-destructive bg-destructive/10 p-4 rounded-lg">{t('book.error')}</div>}
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
                <div className="shrink-0">
                  <Link to={`/reader/${book.id}`}>
                    <Button size="lg" className="rounded-full shadow-md" disabled={!book.has_document}>
                      {t('book.read_now')}
                    </Button>
                  </Link>
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
