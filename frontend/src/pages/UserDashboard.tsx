import { useMemo, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { getBooks, type Language, type BookRead } from "@/services/books";
import { listCategories } from "@/services/categories";
import { addComment, listComments, type CommentRead } from "@/services/comments";
import { ChangePasswordForm } from "@/components/user/ChangePasswordForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Star as StarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';

type ReadingProgress = { bookId: string; page: number; pages?: number; at: number };
type DashboardBook = BookRead;

function useReadingHistory(userId: string | undefined) {
  const [history, setHistory] = useState<ReadingProgress[]>([]);

  useEffect(() => {
    if (!userId) return;
    const entries: ReadingProgress[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const prefix = `progress:${userId}:`;
      if (key.startsWith(prefix)) {
        const bookId = key.substring(prefix.length);
        try {
          const { page, at, pages } = JSON.parse(localStorage.getItem(key) || "{}") as { page?: number; at?: number; pages?: number };
          if (typeof page === "number" && typeof at === "number") {
            entries.push({ bookId, page, pages, at });
          }
        } catch {
          // ignore malformed
        }
      }
    }
    entries.sort((a, b) => b.at - a.at);
    setHistory(entries);
  }, [userId]);

  return history;
}

function ProgressBar({ percent }: { percent: number | null }) {
  return (
    <div className="w-full h-2 bg-muted rounded">
      <div className="h-2 bg-primary rounded" style={{ width: `${Math.max(0, Math.min(100, percent ?? 0))}%` }} />
    </div>
  );
}

function FavoritesToggle({ id, isFav, onToggle }: { id: string; isFav: boolean; onToggle: (id: string) => void }) {
  return (
    <button
      onClick={() => onToggle(id)}
      className={`p-2 rounded-full transition-colors ${isFav ? 'text-yellow-500 hover:bg-yellow-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
      aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
      title={isFav ? "Remove from favorites" : "Add to favorites"}
    >
      <StarIcon className={`${isFav ? 'fill-current' : ''} h-4 w-4`} />
    </button>
  );
}

function SearchFilters({
  search,
  setSearch,
  language,
  setLanguage,
  category,
  setCategory,
  categories,
  showFavOnly,
  setShowFavOnly,
}: {
  search: string; setSearch: (s: string) => void;
  language: "" | Language; setLanguage: (l: "" | Language) => void;
  category: string; setCategory: (c: string) => void;
  categories: string[];
  showFavOnly: boolean; setShowFavOnly: (b: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-10 rounded-full bg-input/20 border-input placeholder:text-muted-foreground"
            placeholder={(t('search_placeholder') as string) || 'Search books'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button className="rounded-full px-4" onClick={() => {/* no-op, search is live */}}>
          {t('search')}
        </Button>
      </div>
      {/* Chips row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Language chips */}
        <div className="flex items-center gap-1">
          {[{k:'',label:t('all_languages')},{k:'EN',label:'EN'},{k:'FR',label:'FR'}].map((opt) => (
            <button
              key={String(opt.k)}
              className={`px-3 py-1 rounded-full border transition-colors ${String(language) === String(opt.k) ? 'bg-primary text-primary-foreground border-transparent' : 'border-border text-foreground/80 hover:bg-accent hover:text-accent-foreground'}`}
              onClick={() => setLanguage((opt.k as ''|Language))}
            >{opt.label as string}</button>
          ))}
        </div>
        {/* Category chips (scrollable) */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            className={`px-3 py-1 rounded-full border transition-colors ${category === '' ? 'bg-primary text-primary-foreground border-transparent' : 'border-border text-foreground/80 hover:bg-accent hover:text-accent-foreground'}`}
            onClick={() => setCategory('')}
          >{t('all_categories')}</button>
          {categories.map((c) => (
            <button
              key={c}
              className={`px-3 py-1 rounded-full border transition-colors ${category === c ? 'bg-primary text-primary-foreground border-transparent' : 'border-border text-foreground/80 hover:bg-accent hover:text-accent-foreground'}`}
              onClick={() => setCategory(c)}
            >{c}</button>
          ))}
        </div>
        {/* Favorites chip */}
        <button
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border transition-colors ${showFavOnly ? 'bg-yellow-400 text-black border-transparent' : 'border-border text-foreground/80 hover:bg-accent hover:text-accent-foreground'}`}
          onClick={() => setShowFavOnly(!showFavOnly)}
        >
          <StarIcon className={`h-4 w-4 ${showFavOnly ? 'fill-current' : ''}`} /> {t('favorites')}
        </button>
      </div>
      <div className="h-px bg-border" />
    </div>
  );
}

function formatDate(ts: number) {
  try { return new Date(ts).toLocaleString(); } catch { return ""; }
}

export function UserDashboard() {
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const { t } = useTranslation();

  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState<"" | Language>("");
  const [category, setCategory] = useState<string>("");
  const [showFavOnly, setShowFavOnly] = useState(false);

  // Fetch categories for filters
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await listCategories()).map((c) => c.name),
  });

  // Fetch books (optionally by language/category server-side)
  const booksQuery = useQuery<DashboardBook[]>({
    queryKey: ["books", { language, category }],
    queryFn: async () => await getBooks({ language: language || undefined, category: category || undefined }),
  });

  const books = useMemo(() => booksQuery.data ?? [], [booksQuery.data]);

  // Client-side search + favorites filter
  const filteredBooks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return books.filter((b) => {
      const matchesTerm = term
        ? b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term)
        : true;
      const favOk = showFavOnly ? isFavorite(b.id) : true;
      return matchesTerm && favOk;
    });
  }, [books, search, showFavOnly, isFavorite]);

  // Reading history from localStorage
  const history = useReadingHistory(user?.id);
  const topCategoryFromHistory = useMemo(() => {
    // naive: count categories from books present in current list & history
    const counts: Record<string, number> = {};
    const byId = new Map(books.map((b) => [b.id, b] as const));
    for (const h of history) {
      const b = byId.get(h.bookId);
      if (b) counts[b.category] = (counts[b.category] || 0) + 1;
    }
    let best: string | null = null; let bestN = 0;
    for (const [c, n] of Object.entries(counts)) { if (n > bestN) { best = c; bestN = n; } }
    return best;
  }, [books, history]);

  // Recommendations based on top category (fallback: first category)
  const recCategory = topCategoryFromHistory || categoriesQuery.data?.[0];
  const recommendationsQuery = useQuery<DashboardBook[]>({
    queryKey: ["recommendations", recCategory],
    enabled: !!recCategory,
    queryFn: async () => await getBooks({ category: recCategory }),
  });
  const recommendations = (recommendationsQuery.data || []).filter((b) => !history.some((h) => h.bookId === b.id));

  const onToggleFavorite = useCallback((id: string) => { toggle(id); }, [toggle]);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl md:text-3xl font-bold">{t('welcome')}{user?.username ? `, ${user.username}` : ''} 👋</h2>
        <p className="text-muted-foreground mt-1">{t('dashboard_intro')}</p>
      </header>

      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('search_and_filters')}</CardTitle>
          </CardHeader>
          <CardContent>
            <SearchFilters
              search={search} setSearch={setSearch}
              language={language} setLanguage={setLanguage}
              category={category} setCategory={setCategory}
              categories={categoriesQuery.data || []}
              showFavOnly={showFavOnly} setShowFavOnly={setShowFavOnly}
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">{t('my_documents_favorites')}</h3>
          {booksQuery.isFetching && <span className="text-sm text-muted-foreground">{t('loading')}</span>}
        </div>

        {/* Table on desktop */}
  <div className="hidden md:block overflow-x-auto rounded border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">{t('title')}</th>
                <th className="text-left p-3 font-medium">{t('author')}</th>
                <th className="text-left p-3 font-medium">{t('language')}</th>
                <th className="text-left p-3 font-medium">{t('category')}</th>
                <th className="text-left p-3 font-medium w-40">{t('progress')}</th>
                <th className="text-left p-3 font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map((b) => {
                const hp = history.find((h) => h.bookId === b.id);
                const percent = hp?.pages ? Math.round((hp.page / hp.pages) * 100) : null;
                return (
                  <tr key={b.id} className="border-t border-border hover:bg-accent/30">
                    <td className="p-3">{b.title}</td>
                    <td className="p-3">{b.author}</td>
                    <td className="p-3">{b.language}</td>
                    <td className="p-3">{b.category}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar percent={percent} />
                        <span className="text-xs text-muted-foreground w-12 text-right">{percent != null ? `${percent}%` : hp ? `p.${hp.page}` : '-'}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/books/${b.id}`}><Button size="sm" className="rounded-full">{t('read')}</Button></Link>
                        <FavoritesToggle id={b.id} isFav={isFavorite(b.id)} onToggle={onToggleFavorite} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredBooks.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-muted-foreground" colSpan={6}>{t('none_found')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cards on mobile */}
  <div className="grid grid-cols-1 gap-3 md:hidden">
          {filteredBooks.map((b) => {
            const hp = history.find((h) => h.bookId === b.id);
            const percent = hp?.pages ? Math.round((hp.page / hp.pages) * 100) : null;
            return (
              <Card key={b.id} className="bg-card/50 border-border">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{b.title}</div>
                      <div className="text-xs text-muted-foreground">{b.author} • {b.language} • {b.category}</div>
                    </div>
                    <FavoritesToggle id={b.id} isFav={isFavorite(b.id)} onToggle={onToggleFavorite} />
                  </div>
                  <div className="flex items-center gap-2">
                    <ProgressBar percent={percent} />
                    <span className="text-xs text-muted-foreground w-12 text-right">{percent != null ? `${percent}%` : hp ? `p.${hp.page}` : '-'}</span>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/books/${b.id}`} className="w-full"><Button className="w-full rounded-full" size="sm">{t('read')}</Button></Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filteredBooks.length === 0 && (
            <div className="text-center text-muted-foreground">{t('none_found')}</div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold">{t('reading_history')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {history.slice(0, 6).map((h) => {
            const b = books.find((x) => x.id === h.bookId);
            const percent = h.pages ? Math.round((h.page / h.pages) * 100) : null;
            return (
              <Card key={`${h.bookId}-${h.at}`}>
                <CardContent className="p-4">
                  <div className="font-medium">{b?.title || 'Livre'}</div>
                  <div className="text-xs text-muted-foreground">{t('last_page')}: {h.page} • {formatDate(h.at)}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <ProgressBar percent={percent} />
                    <span className="text-xs text-muted-foreground w-12 text-right">{percent != null ? `${percent}%` : `p.${h.page}`}</span>
                  </div>
                  <div className="mt-3">
                    <Link to={`/books/${h.bookId}`}><Button size="sm">{t('continue')}</Button></Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {history.length === 0 && <div className="text-muted-foreground">{t('no_history')}</div>}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold">{t('recommendations')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {recommendations.slice(0, 6).map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4 space-y-2">
                <div className="font-medium">{b.title}</div>
                <div className="text-xs text-muted-foreground">{b.author} • {b.language} • {b.category}</div>
                <div className="flex gap-2">
                  <Link to={`/books/${b.id}`}><Button size="sm">{t('read')}</Button></Link>
                  <Button size="sm" variant="outline" onClick={() => onToggleFavorite(b.id)}>
                    {isFavorite(b.id) ? t('remove_favorite') : t('add_favorite')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {recommendations.length === 0 && <div className="text-muted-foreground">{t('no_recommendations')}</div>}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold">{t('quick_comments')}</h3>
        <p className="text-sm text-muted-foreground">{t('quick_comments_hint')}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredBooks.slice(0, 6).map((b) => (
            <QuickCommentCard key={b.id} book={b} />
          ))}
          {filteredBooks.length === 0 && <div className="text-muted-foreground">{t('search_to_comment')}</div>}
        </div>
      </section>

      <section className="max-w-xl">
        <ChangePasswordForm />
      </section>
    </div>
  );
}

function QuickCommentCard({ book }: { book: DashboardBook }) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [rating, setRating] = useState<number | "">("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Load existing comment to allow quick edit
  const { data: comments } = useQuery<CommentRead[]>({
    queryKey: ["comments", book.id],
    queryFn: () => listComments(book.id),
  });
  const myComment = useMemo(() => comments?.find((c) => c.user_id === user?.id), [comments, user?.id]);
  useEffect(() => {
    if (myComment && content === "" && rating === "") {
      if (typeof myComment.rating === "number") setRating(myComment.rating);
      if (myComment.content) setContent(myComment.content);
    }
  }, [myComment, content, rating]);

  const onSubmit = async () => {
    setStatus("saving");
    try {
      await addComment(book.id, { content: content || null, rating: rating === "" ? null : Number(rating) });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1200);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1500);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="font-medium">{book.title}</div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Note</label>
          <select className="h-8 border rounded px-2 bg-background" value={rating}
            onChange={(e) => setRating(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">—</option>
            {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <textarea
          className="w-full h-20 border rounded p-2 bg-background"
          placeholder="Votre commentaire"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={onSubmit} disabled={status === "saving"}>{status === "saving" ? "Envoi…" : myComment ? "Mettre à jour" : "Publier"}</Button>
          <Link to={`/books/${book.id}`}><Button size="sm" variant="outline">Ouvrir</Button></Link>
        </div>
        {status === "saved" && <div className="text-xs text-green-600">Commentaire ajouté.</div>}
        {status === "error" && <div className="text-xs text-red-600">Échec de l’envoi.</div>}
      </CardContent>
    </Card>
  );
}
