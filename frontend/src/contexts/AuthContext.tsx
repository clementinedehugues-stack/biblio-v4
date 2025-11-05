import { createContext } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';

export interface User {
  id: string; // UUID from backend
  username: string;
  role: 'admin' | 'moderator' | 'user';
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface AuthContextType {
  user: User | null;
  login: UseMutationResult<AuthToken, Error, LoginCredentials, unknown>;
  logout: () => void;
  token: string | null;
}

export const AuthContext = createContext<AuthContextType | null>(null);
