import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBookWithFile, type Language } from '@/services/books';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ModeratorLayout from '@/components/moderator/ModeratorLayout';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadModeratorPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState<Language>('EN');
  const [description, setDescription] = useState('');

  const uploadMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      author: string;
      description?: string;
      category: string;
      language: Language;
      file: File;
    }) => createBookWithFile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      // Reset form
      setFile(null);
      setTitle('');
      setAuthor('');
      setCategory('');
      setLanguage('EN');
      setDescription('');
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    uploadMutation.mutate({
      file,
      title,
      author,
      category,
      language,
      description: description || undefined,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-fill title from filename if title is empty
      if (!title) {
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
    }
  };

  return (
    <ModeratorLayout>
      <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Upload className="h-8 w-8 text-indigo-600" />
            {t('moderator.upload.title')}
          </h1>
          <p className="text-muted-foreground mt-2">{t('moderator.upload.subtitle')}</p>
        </div>

        {uploadMutation.isSuccess && (
          <div className="mb-6 p-4 border border-green-200 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <p className="text-green-800 dark:text-green-200">
              {t('moderator.upload.success')}
            </p>
          </div>
        )}

        {uploadMutation.isError && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <p className="text-red-800 dark:text-red-200">
              {t('moderator.upload.error')}
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('moderator.upload.form_title')}</CardTitle>
            <CardDescription>{t('moderator.upload.form_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Input */}
              <div className="space-y-2">
                <Label htmlFor="file-upload" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t('moderator.upload.file_label')} *
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.epub"
                  onChange={handleFileChange}
                  required
                  className="cursor-pointer"
                />
                {file && (
                  <p className="text-sm text-muted-foreground">
                    {t('moderator.upload.selected_file')}: <span className="font-medium">{file.name}</span> ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">{t('moderator.upload.title_label')} *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('moderator.upload.title_placeholder')}
                  required
                />
              </div>

              {/* Author */}
              <div className="space-y-2">
                <Label htmlFor="author">{t('moderator.upload.author_label')} *</Label>
                <Input
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder={t('moderator.upload.author_placeholder')}
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">{t('moderator.upload.category_label')} *</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={t('moderator.upload.category_placeholder')}
                  required
                />
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label htmlFor="language">{t('moderator.upload.language_label')} *</Label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="EN">English</option>
                  <option value="FR">Français</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t('moderator.upload.description_label')}</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('moderator.upload.description_placeholder')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] resize-y"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={uploadMutation.isPending || !file}
              >
                {uploadMutation.isPending ? (
                  <>{t('moderator.upload.uploading')}</>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('moderator.upload.submit')}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModeratorLayout>
  );
}
