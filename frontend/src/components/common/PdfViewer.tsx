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
import { getApiUrl } from '@/lib/api';
import { Bookmark, Highlighter, StickyNote, Moon, Sun, ZoomIn, ZoomOut, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc as unknown as string;

// Types for reader enhancements
interface BookmarkData {
  page: number;
  label: string;
  timestamp: number;
}

interface HighlightData {
  page: number;
  text: string;
  color: string;
  timestamp: number;
}

interface NoteData {
  page: number;
  content: string;
  timestamp: number;
}


interface PdfViewerProps {
  fileUrl?: string | null;
  bookId?: string;
  streamPath?: string | null;
}

export function PdfViewer({ fileUrl, bookId, streamPath }: PdfViewerProps) {
  const apiBaseUrl = useMemo(() => getApiUrl(), []);
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
  
  // Reader enhancements state
  const [readerNightMode, setReaderNightMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('reader.nightMode');
    return saved === 'true';
  });
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>(() => {
    if (!bookId) return [];
    const saved = localStorage.getItem(`bookmarks:${bookId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [highlights, setHighlights] = useState<HighlightData[]>(() => {
    if (!bookId) return [];
    const saved = localStorage.getItem(`highlights:${bookId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [notes, setNotes] = useState<NoteData[]>(() => {
    if (!bookId) return [];
    const saved = localStorage.getItem(`notes:${bookId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  
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

  // Bookmark management
  const addBookmark = useCallback(() => {
    if (!bookId) return;
    const newBookmark: BookmarkData = {
      page: pageNumber,
      label: `Page ${pageNumber}`,
      timestamp: Date.now(),
    };
    const updated = [...bookmarks, newBookmark];
    setBookmarks(updated);
    localStorage.setItem(`bookmarks:${bookId}`, JSON.stringify(updated));
  }, [bookId, pageNumber, bookmarks]);

  const removeBookmark = useCallback((index: number) => {
    if (!bookId) return;
    const updated = bookmarks.filter((_, i) => i !== index);
    setBookmarks(updated);
    localStorage.setItem(`bookmarks:${bookId}`, JSON.stringify(updated));
  }, [bookId, bookmarks]);

  const goToBookmark = useCallback((page: number) => {
    setPageNumber(page);
    setShowBookmarks(false);
  }, []);

  // Note management
  const addNote = useCallback(() => {
    if (!bookId || !newNote.trim()) return;
    const note: NoteData = {
      page: pageNumber,
      content: newNote,
      timestamp: Date.now(),
    };
    const updated = [...notes, note];
    setNotes(updated);
    localStorage.setItem(`notes:${bookId}`, JSON.stringify(updated));
    setNewNote('');
  }, [bookId, pageNumber, newNote, notes]);

  const removeNote = useCallback((index: number) => {
    if (!bookId) return;
    const updated = notes.filter((_, i) => i !== index);
    setNotes(updated);
    localStorage.setItem(`notes:${bookId}`, JSON.stringify(updated));
  }, [bookId, notes]);

  // Highlight management (simplified - just saves selected text)
  const saveHighlight = useCallback((text: string, color: string = '#FFEB3B') => {
    if (!bookId || !text.trim()) return;
    const highlight: HighlightData = {
      page: pageNumber,
      text,
      color,
      timestamp: Date.now(),
    };
    const updated = [...highlights, highlight];
    setHighlights(updated);
    localStorage.setItem(`highlights:${bookId}`, JSON.stringify(updated));
  }, [bookId, pageNumber, highlights]);

  // Persist night mode
  useEffect(() => {
    localStorage.setItem('reader.nightMode', String(readerNightMode));
  }, [readerNightMode]);

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
    <div className={`flex flex-col gap-2 border-b ${readerNightMode ? 'bg-gray-800 text-gray-100 border-gray-700' : 'bg-card text-card-foreground'}`}>
      {/* Main controls bar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        {/* Page navigation */}
        <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={pageNumber <= 1}>
          Prev
        </Button>
        <div className="text-sm font-medium">
          Page {pageNumber} {numPages ? `/ ${numPages}` : ''}
        </div>
        <Button variant="outline" size="sm" onClick={goToNextPage} disabled={!!numPages && pageNumber >= numPages}>
          Next
        </Button>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* Zoom controls */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
          disabled={scale <= 0.5}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.05}
          value={scale}
          onChange={(e) => setScale(parseFloat(e.target.value))}
          className="w-32 accent-primary"
        />
        <span className="text-xs text-muted-foreground">{Math.round(scale * 100)}%</span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setScale((s) => Math.min(3, s + 0.1))}
          disabled={scale >= 3}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* Fit mode */}
        <div className="flex items-center gap-1">
          <Button
            variant={fitMode === 'width' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFitMode('width')}
          >
            Fit Width
          </Button>
          <Button
            variant={fitMode === 'page' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFitMode('page')}
          >
            Fit Page
          </Button>
        </div>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* Reader tools */}
        <Button
          variant={showBookmarks ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowBookmarks((s) => !s)}
          title="Bookmarks"
        >
          <Bookmark className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={addBookmark}
          title="Add bookmark at current page"
        >
          <Bookmark className="h-4 w-4 fill-current" />
        </Button>
        <Button
          variant={showNotes ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowNotes((s) => !s)}
          title="Notes"
        >
          <StickyNote className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const selection = window.getSelection();
            if (selection && selection.toString().trim()) {
              saveHighlight(selection.toString());
            }
          }}
          title="Highlight selected text"
        >
          <Highlighter className="h-4 w-4" />
        </Button>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* View options */}
        <label className="flex items-center gap-2 text-sm">
          <input 
            type="checkbox" 
            checked={continuous} 
            onChange={(e) => setContinuous(e.target.checked)} 
            className="accent-primary"
          />
          Continuous
        </label>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* Night mode */}
        <Button
          variant={readerNightMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setReaderNightMode((m) => !m)}
          title="Toggle night mode"
        >
          {readerNightMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const el = containerRef.current?.parentElement?.parentElement;
              if (!document.fullscreenElement) { 
                el?.requestFullscreen?.(); 
                setIsFullscreen(true); 
              } else { 
                document.exitFullscreen?.(); 
                setIsFullscreen(false); 
              }
            }}
          >
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowThumbs((s) => !s)}
          >
            <List className="h-4 w-4 mr-1" />
            {showThumbs ? 'Hide' : 'Show'} Thumbs
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {numPages && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(pageNumber / numPages) * 100}%` }}
              />
            </div>
            <span className="font-medium">{Math.round((pageNumber / numPages) * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  ), [
    continuous, fitMode, goToNextPage, goToPrevPage, numPages, pageNumber, scale, 
    showThumbs, isFullscreen, readerNightMode, showBookmarks, showNotes, 
    addBookmark, saveHighlight
  ]);

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
    <div className={`rounded-md border text-foreground ${readerNightMode ? 'bg-gray-900 border-gray-700' : 'bg-background'}`} onContextMenu={(e) => e.preventDefault()}>
      {Controls}
      {streamError && !loadingStream && !normalizedFileUrl && (
        <div className="mx-4 mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {streamError}
        </div>
      )}
      <div className="flex h-[75vh]">
        {/* Thumbnails sidebar */}
        {showThumbs && (
          <div className={`hidden w-28 overflow-y-auto border-r p-2 sm:block ${readerNightMode ? 'border-gray-700 bg-gray-800' : ''}`}>
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
        
        {/* Bookmarks sidebar */}
        {showBookmarks && (
          <div className={`w-64 overflow-y-auto border-r p-4 ${readerNightMode ? 'border-gray-700 bg-gray-800' : 'bg-card'}`}>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              Bookmarks ({bookmarks.length})
            </h3>
            {bookmarks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookmarks yet. Click the filled bookmark icon to add one.</p>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((bookmark, idx) => (
                  <div 
                    key={idx} 
                    className={`p-2 rounded border cursor-pointer hover:bg-accent ${readerNightMode ? 'border-gray-600' : ''}`}
                    onClick={() => goToBookmark(bookmark.page)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{bookmark.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(bookmark.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBookmark(idx);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes sidebar */}
        {showNotes && (
          <div className={`w-80 overflow-y-auto border-r p-4 ${readerNightMode ? 'border-gray-700 bg-gray-800' : 'bg-card'}`}>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Notes ({notes.length})
            </h3>
            
            {/* Add note form */}
            <div className="mb-4 space-y-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={`Add a note for page ${pageNumber}...`}
                className={`w-full p-2 text-sm rounded border resize-none ${readerNightMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-background'}`}
                rows={3}
              />
              <Button 
                variant="default" 
                size="sm" 
                onClick={addNote}
                disabled={!newNote.trim()}
                className="w-full"
              >
                Add Note
              </Button>
            </div>

            {/* Notes list */}
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet. Add your first note above.</p>
            ) : (
              <div className="space-y-3">
                {notes.map((note, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded border ${readerNightMode ? 'border-gray-600' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Page {note.page} • {new Date(note.timestamp).toLocaleDateString()}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNote(idx)}
                        className="h-5 w-5 p-0"
                      >
                        ×
                      </Button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Highlights section */}
            {highlights.length > 0 && (
              <>
                <h3 className="font-semibold mt-6 mb-3 flex items-center gap-2">
                  <Highlighter className="h-4 w-4" />
                  Highlights ({highlights.length})
                </h3>
                <div className="space-y-2">
                  {highlights.map((highlight, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2 rounded border ${readerNightMode ? 'border-gray-600' : ''}`}
                      style={{ backgroundColor: `${highlight.color}20` }}
                    >
                      <div className="text-xs text-muted-foreground mb-1">
                        Page {highlight.page}
                      </div>
                      <p className="text-sm italic">{highlight.text}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Main PDF viewer */}
        <div ref={containerRef} className={`flex-1 overflow-auto px-4 py-6 ${readerNightMode ? 'bg-gray-900' : ''}`}>
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
                          className={readerNightMode ? 'pdf-page-night' : ''}
                        />
                      </div>
                    ))
                  ) : (
                    <Page
                      pageNumber={pageNumber}
                      scale={fitMode === 'page' ? scale : scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className={readerNightMode ? 'pdf-page-night' : ''}
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
