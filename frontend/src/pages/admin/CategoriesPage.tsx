import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { listCategories, createCategory, deleteCategory, type CategoryRead } from '@/services/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function CategoriesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: categories = [], isLoading, isError } = useQuery<CategoryRead[]>({ queryKey: ['categories'], queryFn: listCategories });
  const [name, setName] = useState('');

  const createMut = useMutation({
    mutationFn: createCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={() => navigate(-1)} className="px-2 py-1 text-sm rounded border hover:bg-accent" aria-label={t('back')}>
          ← {t('back')}
        </button>
        <h1 className="text-2xl font-bold">{t('categories_title')}</h1>
      </div>

      <div className="flex gap-2 mb-6">
        <Input placeholder={t('new_category_placeholder') as string} value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={() => name && createMut.mutate({ name })} disabled={!name || createMut.isPending}>{t('add')}</Button>
      </div>

      {isLoading && <p>{t('loading_categories')}</p>}
      {isError && <p className="text-red-500">{t('error_loading_categories')}</p>}

      <div className="rounded border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2">{t('name')}</th>
              <th className="text-left p-2">{t('usage')}</th>
              <th className="text-left p-2">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.name} className="border-t">
                <td className="p-2">{c.name}</td>
                <td className="p-2 text-muted-foreground">{c.usage_count}</td>
                <td className="p-2">
                  <Button variant="outline" disabled={c.usage_count > 0 || deleteMut.isPending} onClick={() => deleteMut.mutate(c.name)}>{t('delete')}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
