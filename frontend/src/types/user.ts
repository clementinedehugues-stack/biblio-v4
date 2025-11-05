export interface User {
  id: string; // UUID from backend
  username: string;
  full_name?: string;
  role: 'admin' | 'moderator' | 'user';
}

export interface CreateUser {
  username: string;
  full_name: string;
  password: string;
  role: 'admin' | 'moderator' | 'user';
}

export interface UpdateUserPassword {
  userId: string; // UUID
  newPassword: string;
}

export interface ChangeOwnPassword {
  oldPassword: string;
  newPassword: string;
}
