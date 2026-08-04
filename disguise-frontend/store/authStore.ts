import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Login failed' }));
            throw new Error(err.message || 'Login failed');
          }
          const resBody = await res.json();
          
          // API returns response wrapped in a 'data' object
          const payload = resBody.data || resBody;
          
          const token = payload.access_token || payload.token;
          
          if (!token) {
            throw new Error('Token tidak valid dari server');
          }

          document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`;
          
          // Construct user according to frontend expectations
          const userObj = payload.user ? {
            id: payload.user.id,
            name: payload.user.full_name || payload.user.name || 'User',
            email: payload.user.email,
            role: payload.user.role,
            organizationId: payload.user.organization?.id || '1',
            createdAt: new Date().toISOString()
          } : { id: '1', name: 'User', email, role: 'operator', organizationId: '1', createdAt: new Date().toISOString() };

          set({ 
            user: userObj, 
            token, 
            isLoading: false 
          });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },
      logout: () => {
        document.cookie = 'auth-token=; path=/; max-age=0';
        set({ user: null, token: null });
        window.location.href = '/login';
      },
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
