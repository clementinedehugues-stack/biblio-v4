import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUsers, deleteUser, updateUserPassword, updateUserProfile, type UpdateUserProfilePayload } from '@/services/users';
import type { User as AppUser } from '@/types/user';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateUserForm } from '@/components/admin/CreateUserForm';
import { Search, Pencil, Trash2, Loader2, X, Key } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

type Toast = { id: string; type: 'success' | 'error' | 'info'; message: string };

export default function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: users = [] } = useQuery<AppUser[]>({ queryKey: ['users'], queryFn: getUsers });

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [editTarget, setEditTarget] = useState<AppUser | null>(null); // password reset
  const [profileTarget, setProfileTarget] = useState<AppUser | null>(null); // profile edit modal
  const [profileForm, setProfileForm] = useState<{ username: string; full_name: string; role: AppUser['role'] }>({ username: '', full_name: '', role: 'user' });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Count admins to support client-side guardrails for last admin
  const adminCount = useMemo(() => (users || []).filter((u) => u.role === 'admin').length, [users]);

  const passwordStrength = useMemo(() => {
    const pwd = newPassword || '';
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score; // 0..5
  }, [newPassword]);

  const pushToast = (payload: Omit<Toast, 'id'>) => {
    const toast = { id: crypto.randomUUID(), ...payload };
    setToasts((t) => [...t, toast]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toast.id)), 2500);
  };

  const [roleFilter, setRoleFilter] = useState<'all'|'admin'|'moderator'|'user'>('all');

  const filteredUsers = useMemo(() => {
    const list = (users || []).filter((u) =>
      [u.username, u.full_name, u.role].filter(Boolean).join(' ').toLowerCase().includes(searchTerm.toLowerCase())
    );
    const byRole = roleFilter === 'all' ? list : list.filter((u) => u.role === roleFilter);
    return byRole;
  }, [users, searchTerm, roleFilter]);

  const totalPages = Math.max(1, Math.ceil((filteredUsers?.length || 0) / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  useEffect(() => setPage(1), [searchTerm]);
  useEffect(() => setPage(1), [pageSize]);

  const roleBadge = (role: AppUser['role']) => {
    const map: Record<AppUser['role'], string> = {
      admin: 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-600/20',
      moderator: 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-600/20',
      user: 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20',
    };
    return map[role];
  };

  const userInitials = (u: AppUser) => {
    const name = u.full_name || u.username;
    return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
  pushToast({ type: 'success', message: t('user_deleted') });
      setDeleteTarget(null);
    },
    onError: () => {
  pushToast({ type: 'error', message: t('user_delete_failed') });
    },
  });

  const updatePwdMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) => updateUserPassword({ userId, newPassword }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
  pushToast({ type: 'success', message: t('password_updated') });
      setEditTarget(null);
  setNewPassword('');
  setConfirmPassword('');
    },
    onError: () => {
  pushToast({ type: 'error', message: t('password_update_failed') });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateUserProfilePayload }) => updateUserProfile(id, patch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
  pushToast({ type: 'success', message: t('profile_updated') });
      setProfileTarget(null);
    },
    onError: (err: unknown) => {
      const anyErr = err as { response?: { data?: { detail?: string } } } | undefined;
  const msg = anyErr?.response?.data?.detail || t('profile_update_failed');
      pushToast({ type: 'error', message: String(msg) });
    },
  });

  // Profile form validations and guardrails
  const usernameError = useMemo(() => {
    if (!profileTarget) return '';
    const v = (profileForm.username || '').trim();
  if (v.length < 3) return t('username_too_short') as string;
  if (!/^[a-zA-Z0-9._-]+$/.test(v)) return t('username_invalid') as string;
    return '';
  }, [profileForm.username, profileTarget, t]);

  const isDemotingLastAdmin = useMemo(() => {
    if (!profileTarget) return false;
    return profileTarget.role === 'admin' && adminCount === 1 && profileForm.role !== 'admin';
  }, [profileTarget, profileForm.role, adminCount]);

  return (
    <AdminLayout>
      <section aria-labelledby="users-heading" className="scroll-mt-20">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 id="users-heading" className="text-2xl font-bold">{t('users')}</h1>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                className="w-full h-9 rounded-md border bg-background pl-8 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1"
                placeholder={t('search_users')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label={t('search_users')}
              />
            </div>
            <div className="flex items-center gap-1">
              <label htmlFor="role-filter" className="text-xs text-muted-foreground">{t('role_filter')}</label>
              <select id="role-filter" className="h-9 rounded-md border bg-background px-2 text-sm shadow-sm" value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'all'|'admin'|'moderator'|'user')}
              >
                <option value="all">{t('all_roles')}</option>
                <option value="admin">Admin</option>
                <option value="moderator">{t('moderator')}</option>
                <option value="user">User</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <label htmlFor="page-size" className="text-xs text-muted-foreground">{t('items_per_page')}</label>
              <select id="page-size" className="h-9 rounded-md border bg-background px-2 text-sm shadow-sm" value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <CreateUserForm />
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="hidden">
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-3 font-medium">{t('username')}</th>
                    <th className="p-3 font-medium hidden sm:table-cell">{t('role')}</th>
                    <th className="p-3 font-medium hidden md:table-cell">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((u) => (
                    <tr key={u.id} className="border-t transition-colors hover:bg-accent/30">
                      <td className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                              {userInitials(u)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium">{u.username}</div>
                              <div className="flex items-center gap-2">
                                <span className={`sm:hidden inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${roleBadge(u.role)}`}>
                                  {u.role === 'admin' ? 'Admin' : u.role === 'moderator' ? t('moderator') : 'User'}
                                </span>
                                {u.full_name && (
                                  <div className="truncate text-xs text-muted-foreground hidden sm:block">{u.full_name}</div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 md:hidden">
                             <Button size="icon" variant="ghost" title={t('edit_profile') as string}
                              aria-label={t('edit_profile')}
                              onClick={() => { setProfileTarget(u); setProfileForm({ username: u.username, full_name: u.full_name || '', role: u.role }); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" aria-label={t('delete_user')}
                              onClick={() => setDeleteTarget(u)}
                              disabled={(deleteMutation.isPending && deleteTarget?.id === u.id) || (u.role === 'admin' && adminCount === 1)}
                              title={(u.role === 'admin' && adminCount === 1) ? (t('cannot_delete_last_admin') as string) : undefined}
                            >
                              {deleteMutation.isPending && deleteTarget?.id === u.id ? <Loader2 className="animate-spin h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${roleBadge(u.role)}`}>
                          {u.role === 'admin' ? 'Admin' : u.role === 'moderator' ? t('moderator') : 'User'}
                        </span>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="ghost" title={t('edit_profile') as string}
                            aria-label={t('edit_profile')}
                            onClick={() => { setProfileTarget(u); setProfileForm({ username: u.username, full_name: u.full_name || '', role: u.role }); }}
                          >
                            <Pencil />
                          </Button>
                          <Button size="icon" variant="ghost" title={t('reset_password') as string}
                            aria-label={t('reset_password')}
                            onClick={() => { setEditTarget(u); setNewPassword(''); setConfirmPassword(''); }}
                          >
                            <Key />
                          </Button>
                          <Button size="icon" variant="ghost" aria-label={t('delete_user')}
                            onClick={() => setDeleteTarget(u)}
                            disabled={(deleteMutation.isPending && deleteTarget?.id === u.id) || (u.role === 'admin' && adminCount === 1)}
                            title={(u.role === 'admin' && adminCount === 1) ? (t('cannot_delete_last_admin') as string) : undefined}
                          >
                            {deleteMutation.isPending && deleteTarget?.id === u.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedUsers.length === 0 && (
                    <tr>
                      <td className="p-6 text-center text-sm text-muted-foreground" colSpan={3}>
                        {t('no_results')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {filteredUsers.length > pageSize && (
          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {t('pagination_range', {
                from: (page - 1) * pageSize + 1,
                to: Math.min(page * pageSize, filteredUsers.length),
                total: filteredUsers.length,
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                {t('prev')}
              </Button>
              <span className="text-sm">{page} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                {t('next')}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-md rounded-lg border bg-background p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('confirm_delete')}</h2>
              <button className="p-1 rounded hover:bg-muted" onClick={() => setDeleteTarget(null)} aria-label={t('close')}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{t('delete_user_confirm_text', { username: deleteTarget.username })}</p>
            {deleteTarget.role === 'admin' && adminCount === 1 && (
              <p className="mt-2 text-sm text-red-600">
                {t('cannot_delete_last_admin')}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>{t('cancel')}</Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending || (deleteTarget.role === 'admin' && adminCount === 1)}
                aria-disabled={deleteTarget.role === 'admin' && adminCount === 1}
              >
                {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('delete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Password Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditTarget(null)} />
          <div className="relative w-full max-w-md rounded-lg border bg-background p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('reset_password')}</h2>
              <button className="p-1 rounded hover:bg-muted" onClick={() => setEditTarget(null)} aria-label={t('close')}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">{t('new_password')}</label>
                <input type="password" className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <div className="mt-2 h-1 w-full rounded bg-muted">
                  <div className={`h-1 rounded ${passwordStrength <= 2 ? 'bg-red-500 w-1/5' : passwordStrength === 3 ? 'bg-yellow-500 w-3/5' : 'bg-emerald-500 w-full'}`} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {passwordStrength <= 2 ? t('strength.weak') : passwordStrength === 3 ? t('strength.medium') : t('strength.strong')}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm">{t('confirm_password')}</label>
                <input type="password" className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                {confirmPassword && confirmPassword !== newPassword && (
                  <div className="mt-1 text-xs text-red-600">{t('passwords_do_not_match')}</div>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditTarget(null)} disabled={updatePwdMutation.isPending}>{t('cancel')}</Button>
              <Button onClick={() => updatePwdMutation.mutate({ userId: editTarget.id, newPassword })} disabled={!newPassword || newPassword !== confirmPassword || passwordStrength < 3 || updatePwdMutation.isPending}>
                {updatePwdMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      {/* Edit Profile Modal */}
      {profileTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setProfileTarget(null)} />
          <div className="relative w-full max-w-md rounded-lg border bg-background p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('edit_profile')}</h2>
              <button className="p-1 rounded hover:bg-muted" onClick={() => setProfileTarget(null)} aria-label={t('close')}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">{t('username')}</label>
                <input className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={profileForm.username} onChange={(e) => setProfileForm((f) => ({ ...f, username: e.target.value }))} />
                {usernameError && (<div className="mt-1 text-xs text-red-600">{usernameError}</div>)}
              </div>
              <div>
                <label className="mb-1 block text-sm">{t('full_name')}</label>
                <input className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={profileForm.full_name} onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm">{t('role')}</label>
                <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={profileForm.role} onChange={(e) => setProfileForm((f) => ({ ...f, role: e.target.value as AppUser['role'] }))}>
                  <option value="admin">Admin</option>
                  <option value="moderator">{t('moderator')}</option>
                  <option value="user">User</option>
                </select>
                {isDemotingLastAdmin && (
                  <div className="mt-1 text-xs text-red-600">
                    {t('cannot_demote_last_admin')}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setProfileTarget(null)}>{t('cancel')}</Button>
              <Button onClick={() => {
                if (!profileTarget) return;
                if (usernameError || isDemotingLastAdmin) return;
                const patch: UpdateUserProfilePayload = {};
                if (profileForm.username !== profileTarget.username) patch.username = profileForm.username;
                if ((profileForm.full_name || '') !== (profileTarget.full_name || '')) patch.full_name = profileForm.full_name;
                if (profileForm.role !== profileTarget.role) patch.role = profileForm.role;
                if (Object.keys(patch).length === 0) { setProfileTarget(null); return; }
                updateProfileMutation.mutate({ id: profileTarget.id, patch });
              }}
              disabled={!!usernameError || isDemotingLastAdmin || updateProfileMutation.isPending}
              aria-disabled={!!usernameError || isDemotingLastAdmin}
              >
                {updateProfileMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('save')}
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="pointer-events-none fixed right-4 top-16 z-50 flex flex-col gap-2">
        {toasts.map((tst) => (
          <div
            key={tst.id}
            className={
              'pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-md transition-all ' +
              (tst.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : tst.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/30 border-red-500/30 text-red-700 dark:text-red-300'
                : 'bg-blue-50 dark:bg-blue-950/30 border-blue-500/30 text-blue-700 dark:text-blue-300')
            }
            role="status"
            aria-live="polite"
          >
            {tst.message}
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
