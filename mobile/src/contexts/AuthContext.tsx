import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, saveAuthTokens, clearAuthTokens, getStoredUser, getAccessToken } from '../api/client';

export interface StudentUser {
  id: string;
  login_id: string;
  full_name: string;
  role: string;
  phone?: string;
  email?: string;
}

export interface StudentProfile {
  id: number;
  student_id_number: string;
  registration_no: string;
  full_name: string;
  phone: string;
  campus_name: string;
  active_batch_name: string;
  batch_id: number;
}

interface AuthContextType {
  user: StudentUser | null;
  profile: StudentProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (loginId: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StudentUser | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/students/me/');
      setProfile(res.data);
    } catch (err) {
      console.warn('Failed to fetch student profile:', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await getAccessToken();
        const storedUser = await getStoredUser();
        if (token && storedUser && storedUser.role === 'student') {
          setUser(storedUser);
          await fetchProfile();
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (loginId: string, pass: string) => {
    try {
      const res = await api.post('/auth/login/', {
        login_id: loginId.trim(),
        password: pass,
      });

      const data = res.data;
      if (!data.tokens?.access || !data.user) {
        return { success: false, error: 'Invalid response from server' };
      }

      if (data.user.role !== 'student') {
        return {
          success: false,
          error: 'This mobile app is exclusively for ASSDI students.',
        };
      }

      await saveAuthTokens(data.tokens.access, data.tokens.refresh, data.user);
      setUser(data.user);
      await fetchProfile();

      return { success: true };
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        'Login failed. Please check your credentials.';
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout/').catch(() => {});
    } finally {
      await clearAuthTokens();
      setUser(null);
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
