import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { api } from '../api/client';

export interface DemoAccount {
  name: string;
  email: string;
  role: string;
  team: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { name: 'Alice Chen', email: 'alice@newtonite.corp', role: 'Lead / Admin', team: 'Platform Engineering' },
  { name: 'Bob Sharma', email: 'bob@newtonite.corp', role: 'Member / Dev', team: 'Platform Engineering' },
  { name: 'Carol Taylor', email: 'carol@newtonite.corp', role: 'Manager', team: 'Payments & Settlement' },
  { name: 'David Patel', email: 'david@newtonite.corp', role: 'Member / Ops', team: 'Payments & Settlement' },
  { name: 'Eva Rodriguez', email: 'eva@newtonite.corp', role: 'Lead / Admin', team: 'Compliance & Legal' },
];

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  quickSwitch: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('newtonite_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('newtonite_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
        } catch (err) {
          console.error('Failed to load user session:', err);
          localStorage.removeItem('newtonite_token');
          setToken(null);
          setUser(null);
        }
      } else {
        // Automatically log in Alice Chen as default demo session if no session exists!
        try {
          const res = await api.post('/auth/login', {
            email: 'alice@newtonite.corp',
            password: 'password123',
          });
          localStorage.setItem('newtonite_token', res.data.token);
          setToken(res.data.token);
          setUser(res.data.user);
        } catch (err) {
          console.error('Auto login fallback error:', err);
        }
      }
      setLoading(false);
    }

    loadUser();
  }, []);

  const login = async (email: string, password: string = 'password123') => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('newtonite_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('newtonite_token');
    setToken(null);
    setUser(null);
  };

  const quickSwitch = async (email: string) => {
    await login(email, 'password123');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, quickSwitch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
