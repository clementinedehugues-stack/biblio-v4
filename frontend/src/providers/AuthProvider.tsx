import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { AuthContext, type AuthContextType, type AuthToken, type LoginCredentials, type User } from '@/contexts/AuthContext';
import { isAxiosError, type AxiosError } from 'axios';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  const { data: user, error } = useQuery<User, AxiosError>({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data;
    },
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (error && isAxiosError(error) && error.response?.status === 401) {
      // Token is invalid/expired; force logout cleanup
      localStorage.removeItem('token');
      setToken(null);
      queryClient.setQueryData(['user'], null);
      navigate('/login');
    }
  }, [error, navigate, queryClient]);

  const login = useMutation<AuthToken, Error, LoginCredentials>({
    mutationFn: async (credentials) => {
      const { data } = await api.post('/auth/login', {
        username: credentials.username,
        password: credentials.password,
      });
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      navigate('/');
      return data;
    },
    onError: (error) => {
      console.error('Login failed:', error);
    },
  });

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    queryClient.setQueryData(['user'], null);
    navigate('/login');
  };

  const value: AuthContextType = { user: user || null, login, logout, token };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
