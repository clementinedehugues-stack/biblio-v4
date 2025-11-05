import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBook } from '@/services/books';
import { PdfViewer } from '@/components/common/PdfViewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Fullscreen, Minimize } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

export default function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: book, isLoading, isError } = useQuery({
    queryKey: ['book', id],
    queryFn: () => getBook(id as string),
    enabled: !!id,
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className={`min-h-screen bg-gray-100 dark:bg-gray-900 text-foreground ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to={book ? `/books/${book.id}` : '/'}>
            <Button variant="ghost" className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">{t('reader.back_to_details')}</span>
            </Button>
          </Link>
          <div className="text-center min-w-0">
            <h1 className="text-lg font-semibold truncate">{book?.title}</h1>
          </div>
          <Button onClick={toggleFullscreen} variant="ghost" size="icon">
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Fullscreen className="h-5 w-5" />}
          </Button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading && <div className="text-center text-muted-foreground py-10">{t('reader.loading')}</div>}
        {isError && <div className="text-center text-destructive bg-destructive/10 p-4 rounded-lg">{t('reader.error')}</div>}
        {book && book.has_document && (
          <div className="rounded-xl overflow-hidden border shadow-lg">
            <PdfViewer bookId={book.id} streamPath={book.stream_endpoint ?? undefined} />
          </div>
        )}
        {book && !book.has_document && (
          <div className="rounded-xl border-2 border-dashed border-border p-8 text-center text-muted-foreground bg-card">
            {t('reader.unavailable')}
          </div>
        )}
      </main>
    </div>
  );
}
