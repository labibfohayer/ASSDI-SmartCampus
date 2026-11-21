'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { User } from '@/lib/types';
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  getUser,
  isLoggedIn,
  setAuthSession,
  getDefaultRouteForRole,
} from '@/lib/auth';
import api from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isMounted: boolean;
  login: (access: string, refresh: string, user: User) => string;
  logoutUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isMounted: false,
  login: () => '/login',
  logoutUser: async () => {},
  setUser: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const storedUser = getUser();
    const authed = isLoggedIn();
    setUserState(storedUser);
    setIsAuthenticated(authed);
    setIsMounted(true);
  }, [pathname]);

  const login = (access: string, refresh: string, userData: User): string => {
    setAuthSession(access, refresh, userData);
    setUserState(userData);
    setIsAuthenticated(true);
    return getDefaultRouteForRole(userData.role);
  };

  const logoutUser = async () => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await api.post('/api/v1/auth/logout/', { refresh: refreshToken }).catch(() => {});
      }
    } finally {
      clearAuthSession();
      setUserState(null);
      setIsAuthenticated(false);
      router.replace('/login');
    }
  };

  const setUser = (u: User | null) => {
    setUserState(u);
    setIsAuthenticated(!!u && !!getAccessToken());
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isMounted,
        login,
        logoutUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
