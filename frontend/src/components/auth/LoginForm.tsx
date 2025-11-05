import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { t } = useTranslation();
  const auth = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    try {
      const remembered = localStorage.getItem('remember_me');
      const savedUsername = localStorage.getItem('remember_username');
      if (remembered === 'false') setRememberMe(false);
      if (savedUsername) setValue('username', savedUsername);
    } catch {
      /* ignore storage access errors (Safari private mode, etc.) */
    }
  }, [setValue]);

  const onSubmit = (data: LoginFormInputs) => {
    try {
      localStorage.setItem('remember_me', String(rememberMe));
      if (rememberMe) localStorage.setItem('remember_username', data.username);
      else localStorage.removeItem('remember_username');
    } catch {
      /* ignore storage access errors */
    }
    auth.login.mutate(data);
  };

  const renderError = () => {
    if (!auth.login.isError || !auth.login.error) return null;
    const msg = auth.login.error.message || '';
    if (/401/.test(msg) || /invalid/i.test(msg)) {
      return <p className="text-sm text-red-500">{t('invalid_credentials')}</p>;
    }
    if (/fetch|network|failed/i.test(msg)) {
      return <p className="text-sm text-red-500">{t('server_unreachable')}</p>;
    }
    return <p className="text-sm text-red-500">{t('login_failed')}</p>;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {auth.login.isError && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {renderError()}
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="username">{t('username')}</Label>
        <Input
          id="username"
          type="text"
          {...register('username')}
          aria-invalid={!!errors.username}
          aria-describedby={errors.username ? 'username-error' : undefined}
        />
        {errors.username && <p id="username-error" className="text-sm text-red-500">{errors.username.message}</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">{t('password')}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? t('hide_password') : t('show_password')}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.password && <p id="password-error" className="text-sm text-red-500">{errors.password.message}</p>}
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-muted-foreground/30"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            aria-label={t('remember_me')}
          />
          {t('remember_me')}
        </label>
        {/* Forgot password intentionally not implemented */}
      </div>
      <Button type="submit" className="w-full" disabled={auth.login.isPending}>
        {auth.login.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('signing_in')}
          </>
        ) : (
          t('login')
        )}
      </Button>
    </form>
  );
}
