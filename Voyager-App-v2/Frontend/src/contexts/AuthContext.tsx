// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState } from 'react';

export type UserProfile = {
  name?: string;
  email?: string;
  picture?: string;
  sub?: string;
};

type AuthCtx = {
  user: UserProfile | null;
  login: (u: UserProfile) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);

  function login(u: UserProfile) {
    setUser(u);
  }
  function logout() {
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
