"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getCurrentUser, login, logout } from "@/config/auth-client";

interface AuthContextType {
  user: any;
  loading: boolean;
  loginUser: (email: string, password: string) => Promise<any>;
  logoutUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    setLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Error refreshing user context:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async (email: string, password: string) => {
    const data = await login(email, password);
    await refreshUser();
    return data;
  };

  const logoutUser = async () => {
    await logout();
    setUser(null);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
