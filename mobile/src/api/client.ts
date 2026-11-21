import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:8001/api/v1' : 'http://localhost:8001/api/v1');

const TOKEN_KEY = 'assdi_student_access_token';
const REFRESH_KEY = 'assdi_student_refresh_token';
const USER_KEY = 'assdi_student_user';

export async function saveAuthTokens(access: string, refresh: string, user: any) {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, access);
      localStorage.setItem(REFRESH_KEY, refresh);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, access);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  }
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getStoredUser(): Promise<any | null> {
  let userStr: string | null = null;
  if (Platform.OS === 'web') {
    userStr = typeof localStorage !== 'undefined' ? localStorage.getItem(USER_KEY) : null;
  } else {
    userStr = await SecureStore.getItemAsync(USER_KEY);
  }
  return userStr ? JSON.parse(userStr) : null;
}

export async function clearAuthTokens() {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
