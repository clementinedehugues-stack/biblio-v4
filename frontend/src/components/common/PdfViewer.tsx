import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useAuth } from '@/hooks/useAuth';
// Use a locally bundled worker to avoid CORS issues with unpkg
// Vite: import worker file as URL and assign as workerSrc
// Note: pdfjs-dist v5+ provides ESM worker under build/pdf.worker.min.mjs
// The ?url query tells Vite to return the file URL
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { normalizePublicUrl } from '@/lib/urls';
import { requestBookStreamToken } from '@/services/books';
import { getResolvedApiBaseUrl } from '@/services/api';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc as unknown as string;


interface PdfViewerProps {
  fileUrl?: string | null;
  bookId?: string;
  streamPath?: string | null;
}

export function PdfViewer({ fileUrl, bookId, streamPath }: PdfViewerProps) {
  const apiBaseUrl = useMemo(() => getResolvedApiBaseUrl(), []);
  const directUrl = useMemo(() => {
    if (!fileUrl) return null;
    return normalizePublicUrl(fileUrl) || fileUrl;
  }, [fileUrl]);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadingStream, setLoadingStream] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.25);
  const [fitMode, setFitMode] = useState<'width' | 'page'>(() => (localStorage.getItem('pdf.fit') as 'width' | 'page') || 'width');
  const [continuous, setContinuous] = useState<boolean>(() => {
    const raw = localStorage.getItem('pdf.continuous');
    return raw == null ? true : raw === 'true';
  });
  const [showThumbs, setShowThumbs] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pagesContainerRef = useRef<HTMLDivElement | null>(null);
  // Track which pages are actually visible in the viewport (continuous mode)
  const visiblePagesRef = useRef<Set<number>>(new Set());
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());
  const { user } = useAuth();
  const progressKey = useMemo(() => (user && bookId ? `progress:${user.id}:${bookId}` : undefined), [user, bookId]);
  const activeFileUrl = useMemo(() => directUrl ?? streamUrl ?? undefined, [directUrl, streamUrl]);
  const normalizedFileUrl = useMemo(() => {
    if (!activeFileUrl) return undefined;
    return normalizePublicUrl(activeFileUrl) || activeFileUrl;
  }, [activeFileUrl]);

  useEffect(() => () => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!directUrl) return;
    setStreamUrl(null);
    setStreamError(null);
    setLoadingStream(false);
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, [directUrl]);

  useEffect(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    setStreamUrl(null);
  }, [bookId, streamPath]);

  const fetchStreamUrl = useCallback(async (silent = false) => {
    if (directUrl) return;
    if (!bookId) return;
    if (!streamPath) {
  setStreamUrl(null);
  setStreamError('This book does not have a document available yet.');
      setLoadingStream(false);
      return;
    }
    if (!silent) setLoadingStream(true);
    setStreamError(null);
    try {
      const tokenResponse = await requestBookStreamToken(bookId);
      const endpoint = streamPath || tokenResponse.stream_endpoint;
      if (!endpoint) {
        throw new Error('Aucun endpoint de streaming n\'est disponible');
      }
      const url = new URL(endpoint, apiBaseUrl);
      url.searchParams.set('token', tokenResponse.token);
      setStreamUrl(url.toString());
      const ttlSeconds = tokenResponse.ttl_seconds ?? 60;
      const refreshMs = Math.max(10, ttlSeconds - 5) * 1000;
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = window.setTimeout(() => {
        void fetchStreamUrl(true);
      }, refreshMs);
    } catch (error) {
      console.error('Failed to obtain stream token', error);
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      setStreamUrl(null);
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setStreamError('Your session expired. Please sign in again to open this document.');
      } else if (status === 404) {
        setStreamError('This book does not yet expose an accessible document.');
      } else {
        setStreamError('Unable to load the document right now.');
      }
    } finally {
      if (!silent) setLoadingStream(false);
    }
  }, [apiBaseUrl, bookId, directUrl, streamPath]);

  useEffect(() => {
    if (directUrl) return;
    if (!bookId) return;
    if (!streamPath) {
      setLoadingStream(false);
      setStreamUrl(null);
      setStreamError('This book does not have a document available yet.');
      return;
    }
    setStreamError(null);
    void fetchStreamUrl();
  }, [bookId, directUrl, fetchStreamUrl, streamPath, user?.id]);

  useEffect(() => {
    if (!normalizedFileUrl) {
      setNumPages(null);
      setPageNumber(1);
    }
  }, [normalizedFileUrl]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    // Persist total pages to enrich reading progress for dashboards
    if (progressKey) {
      try {
        const prev = JSON.parse(localStorage.getItem(progressKey) || '{}') as { page?: number; at?: number; pages?: number };
        const payload = { page: prev.page || 1, at: prev.at || Date.now(), pages: numPages };
        localStorage.setItem(progressKey, JSON.stringify(payload));
      } catch {
        localStorage.setItem(progressKey, JSON.stringify({ page: 1, at: Date.now(), pages: numPages }));
      }
    }
  }
  // Restore saved page on mount
  useEffect(() => {
    if (!progressKey) return;
    try {
      const raw = localStorage.getItem(progressKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { page: number };
        if (parsed.page && parsed.page > 0) setPageNumber(parsed.page);
      }
    } catch { /* noop */ }
  }, [progressKey]);

  // Persist page when changed
  useEffect(() => {
    if (!progressKey) return;
    try {
      const prev = JSON.parse(localStorage.getItem(progressKey) || '{}') as { pages?: number };
      localStorage.setItem(progressKey, JSON.stringify({ page: pageNumber, at: Date.now(), pages: prev.pages }));
    } catch {
      localStorage.setItem(progressKey, JSON.stringify({ page: pageNumber, at: Date.now() }));
    }
  }, [pageNumber, progressKey]);

  const goToPrevPage = useCallback(() => setPageNumber((p) => (p - 1 > 0 ? p - 1 : 1)), []);
  const goToNextPage = useCallback(() => setPageNumber((p) => (p + 1 <= (numPages || 0) ? p + 1 : p)), [numPages]);

  // Persist settings
  useEffect(() => { localStorage.setItem('pdf.scale', String(scale)) }, [scale]);
  useEffect(() => { localStorage.setItem('pdf.fit', fitMode) }, [fitMode]);
  useEffect(() => { localStorage.setItem('pdf.continuous', String(continuous)) }, [continuous]);
  useEffect(() => {
    const saved = parseFloat(localStorage.getItem('pdf.scale') || '1.25');
    if (!Number.isNaN(saved)) setScale(saved);
  }, []);

  // Resize: if fitMode is width, adjust scale to container width
  const onResize = useCallback(() => {
    if (fitMode !== 'width' || !containerRef.current) return;
    const w = containerRef.current.clientWidth;
    // 720px is a good base width for a page at scale=1
    const next = Math.max(0.5, Math.min(3, w / 720));
    setScale(next);
  }, [fitMode]);
  useEffect(() => {
    onResize();
    const obs = new ResizeObserver(onResize);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [onResize]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '+' || (e.key === '=' && (e.ctrlKey || e.metaKey))) { setScale((s) => Math.min(3, s + 0.1)); }
      else if (e.key === '-' || (e.key === '_' && (e.ctrlKey || e.metaKey))) { setScale((s) => Math.max(0.5, s - 0.1)); }
      else if (e.key === 'PageDown' || e.key === 'ArrowRight') { goToNextPage(); }
      else if (e.key === 'PageUp' || e.key === 'ArrowLeft') { goToPrevPage(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goToNextPage, goToPrevPage]);

  const Controls = useMemo(() => (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-b bg-card text-card-foreground">
      <button className="px-2 py-1 rounded border hover:bg-accent" onClick={goToPrevPage} disabled={pageNumber <= 1}>Prev</button>
      <div className="text-sm">Page {pageNumber} {numPages ? `of ${numPages}` : ''}</div>
      <button className="px-2 py-1 rounded border hover:bg-accent" onClick={goToNextPage} disabled={!!numPages && pageNumber >= numPages}>Next</button>
      <div className="mx-2 h-6 w-px bg-border" />
      <label className="text-sm">Zoom</label>
      <input
        type="range"
        min={0.5}
        max={3}
        step={0.05}
        value={scale}
        onChange={(e) => setScale(parseFloat(e.target.value))}
        className="w-40 accent-primary"
      />
      <div className="mx-2 h-6 w-px bg-border" />
      <div className="flex items-center gap-1">
        <button
          className={`px-2 py-1 rounded border ${fitMode === 'width' ? 'bg-accent' : 'hover:bg-accent'}`}
          onClick={() => setFitMode('width')}
        >Fit width</button>
        <button
          className={`px-2 py-1 rounded border ${fitMode === 'page' ? 'bg-accent' : 'hover:bg-accent'}`}
          onClick={() => setFitMode('page')}
        >Fit page</button>
      </div>
      <div className="mx-2 h-6 w-px bg-border" />
      <div className="flex items-center gap-1">
        <label className="text-sm">Continuous</label>
        <input type="checkbox" checked={continuous} onChange={(e) => setContinuous(e.target.checked)} />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button className="px-2 py-1 rounded border hover:bg-accent" onClick={() => {
          const el = containerRef.current?.parentElement?.parentElement; // wrapper of the viewer block
          if (!document.fullscreenElement) { el?.requestFullscreen?.(); setIsFullscreen(true); }
          else { document.exitFullscreen?.(); setIsFullscreen(false); }
        }}>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</button>
        <button className="px-2 py-1 rounded border hover:bg-accent" onClick={() => setShowThumbs((s) => !s)}>
          {showThumbs ? 'Hide' : 'Show'} thumbnails
        </button>
        {/* No direct download/open to align with protection requirements */}
      </div>
    </div>
  ), [continuous, fitMode, goToNextPage, goToPrevPage, numPages, pageNumber, scale, showThumbs, isFullscreen]);

  // When in continuous mode, track visible pages and the most-visible page
  useEffect(() => {
    if (!continuous) return;
    if (!normalizedFileUrl) {
      visiblePagesRef.current.clear();
      setVisiblePages(new Set());
      return;
    }
    const root = containerRef.current;
    const container = pagesContainerRef.current;
    if (!root || !container) return;
    const options: IntersectionObserverInit = { root, threshold: [0.1, 0.25, 0.5, 0.75] };
    let raf = 0;
    const io = new IntersectionObserver((entries) => {
      // Pick the page with the highest intersection ratio
      let best: { ratio: number; page: number } | null = null;
      for (const e of entries) {
        const pageStr = (e.target as HTMLElement).dataset.page;
        const page = pageStr ? parseInt(pageStr, 10) : NaN;
        if (!Number.isFinite(page)) continue;
        // Maintain visibility set for gating expensive text layer rendering
        if (e.isIntersecting) {
          visiblePagesRef.current.add(page);
        } else {
          visiblePagesRef.current.delete(page);
        }
        if (!best || e.intersectionRatio > best.ratio) best = { ratio: e.intersectionRatio, page };
      }
      if (best && best.page !== pageNumber) {
        // debounce via rAF to avoid thrashing
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          setPageNumber(best!.page);
          // Snapshot visible pages; using a new Set to trigger state update
          setVisiblePages(new Set(visiblePagesRef.current));
        });
      } else {
        // Even if best page didn't change, propagate visibility changes (rate-limited)
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => setVisiblePages(new Set(visiblePagesRef.current)));
      }
    }, options);
    const nodes = Array.from(container.querySelectorAll('[data-page]'));
    nodes.forEach((n) => io.observe(n));
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [continuous, normalizedFileUrl, pageNumber]);

  // Helper: enable text layer only for visible pages in continuous mode
  const shouldRenderTextLayer = useCallback((p: number) => {
    if (!continuous) return true; // single-page mode: always render text layer
    return visiblePages.has(p);
  }, [continuous, visiblePages]);

  return (
    <div className="rounded-md border bg-background text-foreground" onContextMenu={(e) => e.preventDefault()}>
      {Controls}
      {streamError && !loadingStream && !normalizedFileUrl && (
        <div className="mx-4 mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {streamError}
        </div>
      )}
      <div className="flex h-[75vh]">
        {showThumbs && (
          <div className="hidden w-28 overflow-y-auto border-r p-2 sm:block">
            {normalizedFileUrl ? (
              <Document file={normalizedFileUrl} onLoadSuccess={onDocumentLoadSuccess} loading={null}>
                {Array.from(new Array(numPages || 0), (_el, idx) => (
                  <div
                    key={idx}
                    className={`mb-2 cursor-pointer rounded ${pageNumber === idx + 1 ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setPageNumber(idx + 1)}
                  >
                    <Page pageNumber={idx + 1} width={96} renderTextLayer={false} renderAnnotationLayer={false} />
                  </div>
                ))}
              </Document>
            ) : (
              <div className="text-xs text-muted-foreground">Aperçu indisponible</div>
            )}
          </div>
        )}
        <div ref={containerRef} className="flex-1 overflow-auto px-4 py-6">
          <div ref={pagesContainerRef} className="relative mx-auto">
            {normalizedFileUrl ? (
              <>
                <Document file={normalizedFileUrl} onLoadSuccess={onDocumentLoadSuccess}>
                  {continuous ? (
                    Array.from(new Array(numPages || 0), (_el, idx) => (
                      <div key={idx} data-page={idx + 1} className="mb-6">
                        <Page
                          pageNumber={idx + 1}
                          scale={fitMode === 'page' ? scale : scale}
                          renderTextLayer={shouldRenderTextLayer(idx + 1)}
                          renderAnnotationLayer={shouldRenderTextLayer(idx + 1)}
                        />
                      </div>
                    ))
                  ) : (
                    <Page
                      pageNumber={pageNumber}
                      scale={fitMode === 'page' ? scale : scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                    />
                  )}
                </Document>
                {user && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="-rotate-45 select-none text-5xl opacity-10">
                      {user.username} — {new Date().toLocaleString()}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                {loadingStream ? 'Loading secure document...' : streamError ?? 'No PDF is available for this book.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
