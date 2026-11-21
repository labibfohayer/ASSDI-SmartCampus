export type UserRole = 'super_admin' | 'coordinator' | 'teacher' | 'student' | 'observer';

export interface User {
  id: number;
  login_id: string;
  full_name: string;
  role: UserRole;
  email: string;
  phone?: string;
  must_change_password?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    access: string;
    refresh: string;
    user: User;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}
