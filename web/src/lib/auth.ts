import { User, UserRole } from './types';

const ACCESS_TOKEN_KEY = 'assdi_access_token';
const REFRESH_TOKEN_KEY = 'assdi_refresh_token';
const USER_KEY = 'assdi_user';

export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setAuthSession = (access: string, refresh: string, user: User): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const setAccessToken = (access: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
};

export const isLoggedIn = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const clearAuthSession = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getDefaultRouteForRole = (role?: UserRole): string => {
  switch (role) {
    case 'teacher':
      return '/teacher';
    case 'coordinator':
    case 'super_admin':
      return '/admin';
    case 'observer':
      return '/coordinator';
    case 'student':
      return '/student';
    default:
      return '/login';
  }
};
