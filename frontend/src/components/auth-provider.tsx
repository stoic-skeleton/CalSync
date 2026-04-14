"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchCurrentUser, loginUser, logoutUser, setStoredToken, getStoredToken } from "@/lib/api";
import type { User } from "@/lib/types";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const u = await fetchCurrentUser();
      setUser(u);
    } catch {
      setUser(null);
      // If /me fails, token is invalid — clear it
      setStoredToken(null);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    // Only call /me if we have a stored token (avoids unnecessary 401 on every page load)
    if (getStoredToken()) {
      refresh();
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const res = await loginUser({ email, password });
    // Store token for Authorization header fallback (mobile Safari ITP)
    setStoredToken(res.access_token);
    // Set user directly from login response — no extra round-trip needed
    const { access_token: _, ...userFields } = res;
    setUser(userFields as User);
    return userFields as User;
  }

  async function doLogout() {
    await logoutUser();
    setStoredToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, refresh, login, logout: doLogout }}>
      {children}
    </AuthContext.Provider>
  );
}
