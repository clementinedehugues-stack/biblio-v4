import { ArrowLeft, Loader2, Search, Upload as UploadIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/components/admin/AdminLayout';
import { createBookWithFile, getBooks, type Language } from '@/services/books';
import { listCategories, type CategoryRead } from '@/services/categories';
import { getDocuments, uploadDocument } from '@/services/documents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

type Mode = 'new' | 'existing';

const newBookSchema = z.object({
  title: z.string().min(1, 'Le nom est requis'),
  author: z.string().min(1, "L'auteur est requis"),
  description: z.string().optional(),
  category: z.string().min(1, 'La catégorie est requise'),
  language: z.enum(['FR', 'EN']),
  file: z
    .any()
    .refine((v) => v instanceof FileList && v.length === 1, 'Un fichier PDF est requis'),
});

const existingBookSchema = z.object({
  book_id: z.string().uuid('Livre invalide'),
  file: z
    .any()
    .refine((v) => v instanceof FileList && v.length === 1, 'Un fichier PDF est requis'),
});

interface BookListItem { id: string; title: string; author: string; category?: string }

type NewBookForm = {
  title: string;
  author: string;
  description?: string;
  category: string;
  language: Language;
  file: FileList;
};

type ExistingForm = {
  book_id: string;
  file: FileList;
};

export default function UploadPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('new');
  const qc = useQueryClient();
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [uploadProgressNew, setUploadProgressNew] = useState<number>(0);
  const [uploadProgressExisting, setUploadProgressExisting] = useState<number>(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: books = [] } = useQuery<BookListItem[]>({ queryKey: ['books'], queryFn: () => getBooks() });
  const { data: categoriesFromApi = [] } = useQuery<CategoryRead[]>({ queryKey: ['categories'], queryFn: listCategories });
  const { data: documents = [] } = useQuery({ queryKey: ['documents'], queryFn: getDocuments });

  const categories: string[] = useMemo(() => {
    if (categoriesFromApi.length) return categoriesFromApi.map((c: CategoryRead) => c.name);
    const set = new Set<string>();
    books.forEach((b: BookListItem) => { if (b.category) set.add(b.category); });
    return Array.from(set).sort();
  }, [books, categoriesFromApi]);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm({
    resolver: zodResolver(mode === 'new' ? newBookSchema : existingBookSchema),
  });

  useEffect(() => {
    // reset validation when switching mode
    reset({});
  }, [mode, reset]);

  const createBookMutation = useMutation({
    mutationFn: async (payload: Parameters<typeof createBookWithFile>[0]) =>
      await createBookWithFile(payload, { onProgress: (p) => setUploadProgressNew(p) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['books'] });
      setNotif({ type: 'success', message: 'Livre créé avec succès.' });
      setUploadProgressNew(0);
      setPreviewUrl(null);
    },
    onError: () => setNotif({ type: 'error', message: "Échec de la création du livre." }),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, bookId }: { file: File; bookId: string }) => uploadDocument(file, bookId, { onProgress: (p) => setUploadProgressExisting(p) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['books'] });
      setNotif({ type: 'success', message: 'Document téléversé et indexé.' });
      setUploadProgressExisting(0);
    },
    onError: () => setNotif({ type: 'error', message: "Échec du téléversement." }),
  });

  // Watch file field to generate a preview in new mode
  const watchedFileNew: FileList | undefined = watch('file');
  useEffect(() => {
    if (mode !== 'new') return;
    if (watchedFileNew && watchedFileNew.length === 1) {
      const file = watchedFileNew[0];
      if (file && file.type?.includes('pdf')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
      }
    }
    setPreviewUrl(null);
  }, [mode, watchedFileNew]);

  const onSubmit = async (formData: Record<string, unknown>) => {
    try {
      if (mode === 'new') {
        // Création en une étape (livre + fichier)
        const f = formData as NewBookForm;
        // UI-side validation for PDF
        if (!f.file || f.file.length !== 1 || !f.file[0].type.includes('pdf')) {
          setNotif({ type: 'error', message: t('upload.new_book_error') });
          return;
        }
        await createBookMutation.mutateAsync({
          title: f.title,
          author: f.author,
          description: f.description,
          category: f.category,
          language: f.language,
          file: f.file[0],
        });
        reset({});
      } else {
        // Existing book: upload file is required
        const f = formData as ExistingForm;
        const files: FileList = f.file;
        const bookId: string = f.book_id;
        if (!files || files.length !== 1 || !files[0].type.includes('pdf')) {
          setNotif({ type: 'error', message: t('upload.existing_book_error') });
          return;
        }
        await uploadMutation.mutateAsync({ file: files[0], bookId });
        reset({});
      }
    } catch {
      // handled by mutation error states
    }
  };

  const fieldError = (name: string) => {
    const err = (errors as unknown as Record<string, { message?: string }>)[name]?.message;
    return err ? String(err) : '';
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label={t('upload.back')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{t('upload_title')}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="shadow-lg rounded-xl">
              <CardHeader>
                <div className="flex border-b">
                  <button
                    type="button"
                    className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'new' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-primary'}`}
                    onClick={() => setMode('new')}
                    aria-selected={mode === 'new'}
                    role="tab"
                  >
                    {t('tab_new_book')}
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'existing' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-primary'}`}
                    onClick={() => setMode('existing')}
                    aria-selected={mode === 'existing'}
                    role="tab"
                  >
                    {t('tab_existing_book')}
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
                  {mode === 'new' ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">{t('name')}</Label>
                          <Input id="title" placeholder={t('title_placeholder')} {...register('title')} />
                          {fieldError('title') && <p className="text-sm text-destructive">{fieldError('title')}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="author">{t('author')}</Label>
                          <Input id="author" placeholder={t('author_placeholder')} {...register('author')} />
                          {fieldError('author') && <p className="text-sm text-destructive">{fieldError('author')}</p>}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">{t('description_optional')}</Label>
                        <Input id="description" placeholder={t('short_description')} {...register('description')} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="category">{t('category')}</Label>
                          <Input list="category-options" id="category" placeholder={t('choose_or_create')} {...register('category')} />
                          <datalist id="category-options">
                            {categories.map((c) => <option key={c} value={c} />)}
                          </datalist>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {categories.slice(0, 12).map((c) => (
                              <button type="button" key={c} className="text-xs px-2 py-1 rounded-full border bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => setValue('category', c)}>
                                {c}
                              </button>
                            ))}
                          </div>
                          {fieldError('category') && <p className="text-sm text-destructive">{fieldError('category')}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="language">{t('language')}</Label>
                          <select id="language" className="w-full bg-background border border-input rounded-md h-10 px-3" {...register('language')}>
                            <option value="FR">{t('french')}</option>
                            <option value="EN">{t('english')}</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="file_new">{t('pdf_file')}</Label>
                        <Input id="file_new" type="file" accept="application/pdf" {...register('file')} />
                        {uploadProgressNew > 0 && (
                          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${uploadProgressNew}%` }} />
                          </div>
                        )}
                      </div>

                      {previewUrl && (
                        <div className="space-y-2">
                          <Label>{t('preview')}</Label>
                          <div className="rounded-lg border overflow-hidden aspect-video">
                            <iframe title="PDF Preview" src={previewUrl} className="w-full h-full bg-background" />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="book_id">{t('select_book')}</Label>
                        <select id="book_id" className="w-full bg-background border border-input rounded-md h-10 px-3" {...register('book_id')} defaultValue="">
                          <option value="" disabled>{t('choose')}</option>
                          {books.map((b: BookListItem) => (
                            <option key={b.id} value={b.id}>{b.title} — {b.author}</option>
                          ))}
                        </select>
                        {fieldError('book_id') && <p className="text-sm text-destructive">{fieldError('book_id')}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="file_existing">{t('pdf_file')}</Label>
                        <Input id="file_existing" type="file" accept="application/pdf" {...register('file')} />
                        {fieldError('file') && <p className="text-sm text-destructive">{fieldError('file')}</p>}
                        {uploadProgressExisting > 0 && (
                          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${uploadProgressExisting}%` }} />
                          </div>
                        )}
                      </div>

                      {(() => {
                        const selectedId = (watch('book_id') as string) || '';
                        const hist = (documents as Array<{ id: string; book_id: string; filename: string; uploaded_at: string }>).filter(d => d.book_id === selectedId);
                        if (!selectedId) return null;
                        return (
                          <div className="space-y-2">
                            <Label>{t('file_history')}</Label>
                            {hist.length === 0 ? (
                              <p className="text-sm text-muted-foreground p-3 bg-secondary rounded-md">{t('none_for_book')}</p>
                            ) : (
                              <div className="rounded-lg border overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-secondary">
                                    <tr>
                                      <th className="text-left p-3 font-semibold">{t('name')}</th>
                                      <th className="text-left p-3 font-semibold">{t('uploaded_at')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {hist.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()).map(doc => (
                                      <tr key={doc.id} className="border-t">
                                        <td className="p-3">{doc.filename}</td>
                                        <td className="p-3">{new Date(doc.uploaded_at).toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  )}
                  <div className="flex items-center gap-4 pt-4">
                    <Button type="submit" size="lg" disabled={createBookMutation.isPending || uploadMutation.isPending}>
                      {createBookMutation.isPending || uploadMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('in_progress')}</>
                      ) : (
                        <><UploadIcon className="mr-2 h-4 w-4" /> {t('submit')}</>
                      )}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {mode === 'new' ? t('creating_book_hint') : t('adding_file_hint')}
                    </span>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4">
            <Card className="shadow-lg rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Search size={20} /> {t('existing_books')} ({books.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[60vh] overflow-auto pr-2">
                {books.map((b) => (
                  <div key={b.id} className="rounded-lg border p-3 bg-card hover:bg-accent transition-colors">
                    <div className="font-semibold">{b.title}</div>
                    <div className="text-sm text-muted-foreground">{b.author}{b.category ? ` • ${b.category}` : ''}</div>
                  </div>
                ))}
                {books.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t('upload.no_books_yet')}</p>}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      {notif && (
        <div className="fixed bottom-5 right-5 z-50">
          <div className={`px-6 py-3 rounded-lg shadow-2xl ${notif.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
            role="status" aria-live="polite">
            {notif.message}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
