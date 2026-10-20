export type UserRole = 'admin' | 'manager' | 'factory_manager' | 'agent';

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  employeeCode?: string;
  phone?: string;
  region?: string;
};

export type AuthSession = { accessToken: string; refreshToken?: string; user: User };
