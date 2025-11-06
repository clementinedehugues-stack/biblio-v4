import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { AuthContext, type AuthContextType, type AuthToken, type LoginCredentials, type User } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  const { data: user, error } = useQuery<User, Error>({
    queryKey: ['user'],
    queryFn: async () => {
      return await apiFetch<User>('/users/me');
    },
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    // If token invalid/expired; force logout cleanup
    if (error && /401/.test(error.message)) {
      // Token is invalid/expired; force logout cleanup
      localStorage.removeItem('token');
      setToken(null);
      queryClient.setQueryData(['user'], null);
      navigate('/login');
    }
  }, [error, navigate, queryClient]);

  const login = useMutation<AuthToken, Error, LoginCredentials>({
    mutationFn: async (credentials) => {
      const data = await apiFetch<AuthToken>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
      });
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      navigate('/');
      return data;
    },
    onError: (error) => {
      console.error('Login failed:', error);
      toast.error('Login failed. Please check your credentials.');
    },
  });

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    queryClient.clear(); // Clear all query cache to prevent stale admin queries
    queryClient.setQueryData(['user'], null);
    navigate('/login');
  };

  const value: AuthContextType = { user: user || null, login, logout, token };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
