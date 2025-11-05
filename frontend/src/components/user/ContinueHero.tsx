import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BookCardBook } from '@/components/user/BookCard';
import type { ReadingProgress } from '@/hooks/useReadingProgress';

const pagesPerMinuteFallback = 1.5;

type ContinueHeroProps = {
  book: BookCardBook;
  progress: ReadingProgress;
  heading: string;
  resumeLabel: string;
  progressLabel?: string;
};

const estimateMinutesLeft = (progress: ReadingProgress) => {
  if (!progress.page || !progress.pages) return null;
  const pagesLeft = Math.max(progress.pages - progress.page, 0);
  return Math.ceil(pagesLeft / pagesPerMinuteFallback);
};

export default function ContinueHero({ book, progress, heading, resumeLabel, progressLabel }: ContinueHeroProps) {
  const percent = progress.page && progress.pages ? Math.round((progress.page / progress.pages) * 100) : 0;
  const eta = estimateMinutesLeft(progress);
  const baselineLabel = (() => {
    const bits: string[] = [];
    if (progress.page) bits.push(`p.${progress.page}`);
    if (progress.pages) bits.push(`/${progress.pages}`);
    if (eta) bits.push(` • ~${eta} min`);
    return bits.join('');
  })();
  const label = progressLabel ?? baselineLabel;

  return (
    <section>
      <div className="relative overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm p-5 md:p-6">
        <div className="absolute inset-0 pointer-events-none bg-linear-to-br from-primary/10 via-transparent to-transparent" />
        <div className="relative flex items-center gap-5">
          <div className="h-16 w-12 md:h-20 md:w-16 rounded-md bg-muted shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm text-muted-foreground">{heading}</div>
            <div className="truncate font-semibold text-xl md:text-2xl">{book.title}</div>
            {book.author && <div className="text-xs text-muted-foreground">{book.author}</div>}

            <div className="mt-3 flex items-center gap-3">
              <div className="min-w-[180px] md:min-w-60">
                <div className="relative h-2 rounded-full bg-muted/60">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all"
                    style={{ width: `${percent}%` }}
                    aria-hidden="true"
                  />
                  <span className="sr-only">{percent}%</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">{label}</div>
            </div>
          </div>

          <Link to={`/reader/${book.id}`} className="shrink-0">
            <Button className="rounded-full shadow-md">
              {resumeLabel} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
