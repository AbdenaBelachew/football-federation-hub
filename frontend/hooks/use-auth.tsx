import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setToken } from "@/lib/api";
import type { User, Role } from "@/lib/types";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  loginAsDemo: (email: string) => Promise<boolean>;
  logout: () => void;
  signOut: () => void;
  can: (action: "manage_clubs" | "approve_registrations" | "manage_transfers" | "manage_matches" | "audit" | "all") => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default fallback demo user if backend is booting or user wants instant entry
const DEFAULT_FALLBACK_USER: User = {
  id: "usr-admin-1",
  name: "Solomon Tadesse (Super Admin)",
  email: "admin@federation.org",
  role: "super_admin",
  isActive: true,
  phone: "+251911223344",
  image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
  createdAt: Date.now(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() => {
    try {
      return localStorage.getItem("ff_token");
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Auto-verify stored token on mount
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const storedToken = localStorage.getItem("ff_token");
function normalizeUser(u: any): User {
  return {
    ...u,
    clubId: u.clubId || u.club_id || (u.email === "club@saintgeorge.org" ? "club-1" : undefined),
  };
}

        if (storedToken) {
          try {
            const res = await api.auth.me();
            if (mounted && res?.user) {
              setUser(normalizeUser(res.user));
              setIsLoading(false);
              return;
            }
          } catch {
            // Token expired or invalid, remove it
            setToken(null);
            if (mounted) {
              setTokenState(null);
              setUser(null);
            }
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password = "password123"): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      if (res?.user && res?.token) {
        setToken(res.token);
        setTokenState(res.token);
        setUser(normalizeUser(res.user));
        toast.success(`Welcome back, ${res.user.name}!`);
        setIsLoading(false);
        return true;
      }
      throw new Error("Invalid response from server");
    } catch (err: any) {
      toast.error(err.message || "Failed to log in");
      setIsLoading(false);
      return false;
    }
  };

  const loginAsDemo = async (email: string): Promise<boolean> => {
    return login(email, "password123");
  };

  const logout = () => {
    setToken(null);
    setTokenState(null);
    setUser(null);
    toast.info("Logged out successfully");
  };

  const can = (action: "manage_clubs" | "approve_registrations" | "manage_transfers" | "manage_matches" | "audit" | "all") => {
    if (!user) return false;
    const role: string = user.role;
    if (role === "super_admin" || role === "federation_admin") return true;

    switch (action) {
      case "manage_clubs":
        return role === "club_admin";
      case "approve_registrations":
        return role === "registration_officer";
      case "manage_transfers":
        return role === "transfer_officer";
      case "manage_matches":
        return role === "competition_admin" || role === "referee";
      case "audit":
      case "all":
        return role === "super_admin";
      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginAsDemo,
        logout,
        signOut: logout,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
