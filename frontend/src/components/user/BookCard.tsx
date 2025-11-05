import { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { normalizePublicUrl } from '@/lib/urls';

export type BookCardBook = {
  id: string;
  title: string;
  author: string;
  cover_image_url?: string | null;
  thumbnail_path?: string | null;
  category?: string | null;
  language?: string | null;
};

interface BookCardProps {
  book: BookCardBook;
  index?: number;
  density?: 'comfortable' | 'compact';
}

const PlaceholderCover = ({ title }: { title: string }) => {
  // Gradient placeholder
  return (
    <div
      className="relative h-48 w-full rounded-xl bg-linear-to-br from-indigo-600/70 to-fuchsia-600/70 flex items-end p-3"
      style={{ filter: 'saturate(0.9)' }}
    >
      <div className="text-primary-foreground text-sm font-medium line-clamp-2 drop-shadow-md">{title}</div>
    </div>
  );
};

function BookCardBase({ book, index = 0, density = 'comfortable' }: BookCardProps) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(book.id);
  // const { t } = useTranslation();
  // const { user } = useAuth();
  // const reading = useReadingProgress(user?.id);
  // const progress = (() => {
  //   const p = reading.get(book.id);
  //   if (!p || !p.pages || !p.page) return 0;
  //   return Math.max(0, Math.min(100, Math.round((p.page / p.pages) * 100)));
  // })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(0.1 * (index % 10), 0.6) }}
      className="group rounded-2xl border border-border bg-card/50 overflow-hidden shadow-sm hover:shadow-md hover:border-border transition-all"
    >
      <div className="relative">
        {book.thumbnail_path || book.cover_image_url ? (
          <img
            src={normalizePublicUrl(book.thumbnail_path) || normalizePublicUrl(book.cover_image_url) || (book.thumbnail_path || book.cover_image_url!)}
            alt={book.title}
            className={`${density === 'compact' ? 'h-40' : 'h-48'} w-full object-cover`}
            loading="lazy"
          />
        ) : (
          <div className={`${density === 'compact' ? 'h-40' : 'h-48'}`}>
            <PlaceholderCover title={book.title} />
          </div>
        )}
        {/* Progress ring removed */}
        <button
          onClick={() => toggle(book.id)}
          className={`absolute right-3 top-3 rounded-full p-2 backdrop-blur bg-background/60 hover:bg-background/80 transition ${fav ? 'text-yellow-500' : 'text-foreground'}`}
          aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star className={`h-5 w-5 ${fav ? 'fill-current' : ''}`} />
        </button>
      </div>
      <div className="p-3">
        <div className="font-semibold line-clamp-1" title={book.title}>{book.title}</div>
        <div className="text-xs text-muted-foreground line-clamp-1">{book.author}</div>
        {density === 'comfortable' && (
          <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
            {book.language && <span className="rounded-full border border-border px-2 py-0.5">{book.language}</span>}
            {book.category && <span className="rounded-full border border-border px-2 py-0.5">{book.category}</span>}
          </div>
        )}
        <div className="mt-3">
          <Link to={`/books/${book.id}`}>
            <Button size={density === 'compact' ? 'sm' : 'sm'} className="rounded-full">Read</Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export const BookCard = memo(BookCardBase);
