import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { changeOwnPassword } from '@/services/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

const passwordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

type PasswordFormInputs = z.infer<typeof passwordSchema>;

export function ChangePasswordForm() {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<PasswordFormInputs>({
    resolver: zodResolver(passwordSchema),
  });
  const [toasts, setToasts] = useState<{ id: string; type: 'success'|'error'; message: string }[]>([]);
  const pushToast = (type: 'success'|'error', message: string) => {
    const t = { id: crypto.randomUUID(), type, message };
    setToasts((arr) => [...arr, t]);
    setTimeout(() => setToasts((arr) => arr.filter((x) => x.id !== t.id)), 2500);
  };

  const mutation = useMutation({
    mutationFn: changeOwnPassword,
    onSuccess: () => {
      reset();
      pushToast('success', 'Password changed successfully!');
    },
    onError: () => pushToast('error', 'Failed to change password.'),
  });

  const onSubmit = (data: PasswordFormInputs) => {
    mutation.mutate(data);
  };

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="oldPassword">Old Password</Label>
            <Input id="oldPassword" type="password" {...register('oldPassword')} className="bg-input/20 border-input" />
            {errors.oldPassword && <p className="text-red-500 text-sm">{errors.oldPassword.message}</p>}
          </div>
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" type="password" {...register('newPassword')} className="bg-input/20 border-input" />
            {errors.newPassword && <p className="text-red-500 text-sm">{errors.newPassword.message}</p>}
          </div>
          <Button type="submit" disabled={mutation.isPending} className="rounded-full">
            {mutation.isPending ? 'Changing...' : 'Change Password'}
          </Button>
        </form>
      </CardContent>
      <div className="pointer-events-none fixed right-4 top-20 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-md transition-all ${t.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/30 border-red-500/30 text-red-700 dark:text-red-300'}`}>{t.message}</div>
        ))}
      </div>
    </Card>
  );
}
