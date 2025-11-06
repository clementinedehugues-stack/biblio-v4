import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listCategories, createCategory, type CategoryRead } from '@/services/categories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ModeratorLayout from '@/components/moderator/ModeratorLayout';
import { useTranslation } from 'react-i18next';
import { Tags, Plus, X } from 'lucide-react';

type Toast = { id: string; type: 'success' | 'error' | 'info'; message: string };

export default function CategoriesModeratorPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery<CategoryRead[]>({
    queryKey: ['categories'],
    queryFn: listCategories,
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = (payload: Omit<Toast, 'id'>) => {
    const toast = { id: crypto.randomUUID(), ...payload };
    setToasts((t) => [...t, toast]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toast.id)), 2500);
  };

  const createMutation = useMutation({
    mutationFn: (name: string) => createCategory({ name }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      pushToast({ type: 'success', message: t('category_created') });
      setShowAddModal(false);
      setNewCategoryName('');
    },
    onError: () => {
      pushToast({ type: 'error', message: t('category_create_failed') });
    },
  });

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      pushToast({ type: 'error', message: t('category_name_required') });
      return;
    }
    createMutation.mutate(newCategoryName.trim());
  };

  return (
    <ModeratorLayout>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Tags className="h-8 w-8 text-indigo-600" />
              {t('moderator.categories.title')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('moderator.categories.subtitle')}</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            {t('add_category')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('moderator.categories.all_categories')} ({categories.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Tags className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('no_categories')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <Card key={category.name} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tags className="h-5 w-5 text-indigo-600" />
                        <span className="font-medium">{category.name}</span>
                        <span className="text-sm text-muted-foreground">
                          ({category.usage_count})
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('add_category')}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('category_name')}</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                    placeholder={t('enter_category_name')}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setShowAddModal(false)}>
                    {t('cancel')}
                  </Button>
                  <Button
                    onClick={handleCreateCategory}
                    disabled={createMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {createMutation.isPending ? t('creating') : t('create')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Card
            key={toast.id}
            className={`p-4 shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-50 border-green-200'
                : toast.type === 'error'
                ? 'bg-red-50 border-red-200'
                : 'bg-blue-50 border-blue-200'
            }`}
          >
            <p className="text-sm font-medium">{toast.message}</p>
          </Card>
        ))}
      </div>
    </ModeratorLayout>
  );
}
