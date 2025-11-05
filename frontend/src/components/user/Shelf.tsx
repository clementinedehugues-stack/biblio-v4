import { type PropsWithChildren, type ReactNode, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ShelfProps = PropsWithChildren<{
  title: string;
  action?: ReactNode;
  itemWidth?: number;
  className?: string;
}>;

export default function Shelf({ title, action, itemWidth = 260, className, children }: ShelfProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const scrollBy = (direction: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * itemWidth * 2, behavior: 'smooth' });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
        <div className="flex items-center gap-2">
          {action}
          <div className="hidden sm:flex gap-2">
            <Button variant="outline" size="icon" onClick={() => scrollBy(-1)} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => scrollBy(1)} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className={['relative', className].filter(Boolean).join(' ')}>
  <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-linear-to-r from-background to-transparent" />
  <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-linear-to-l from-background to-transparent" />
        <div
          ref={trackRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth px-1 no-scrollbar"
        >
          {children}
        </div>
      </div>
    </section>
  );
}
