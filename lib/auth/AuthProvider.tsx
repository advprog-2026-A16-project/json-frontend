"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { clearSession, getSession } from "@/lib/auth/session";
import type { AuthSession, UserRole } from "@/lib/auth/types";

type AuthContextValue = {
  session: AuthSession;
  isAuthenticated: boolean;
  isHydrated: boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  logout: () => void;
  refresh: () => void;
};

const defaultSession: AuthSession = {
  token: null,
  role: null,
  userId: null,
  email: null,
};

const subscribe = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => undefined;

  const onAuthChange = () => onStoreChange();
  const onStorage = (event: StorageEvent) => {
    if (["token", "role", "userId", "email"].includes(event.key ?? "")) {
      onStoreChange();
    }
  };

  window.addEventListener("json-auth-change", onAuthChange);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener("json-auth-change", onAuthChange);
    window.removeEventListener("storage", onStorage);
  };
};

const getSnapshot = () => getSession();
const getServerSnapshot = () => defaultSession;

const AuthContext = createContext<AuthContextValue>({
  session: defaultSession,
  isAuthenticated: false,
  isHydrated: false,
  hasRole: () => false,
  logout: () => undefined,
  refresh: () => undefined,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const session = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo<AuthContextValue>(() => {
    const isAuthenticated = Boolean(session.token);

    return {
      session,
      isAuthenticated,
      isHydrated: true,
      hasRole: (...roles: UserRole[]) => Boolean(session.role && roles.includes(session.role)),
      logout: () => clearSession(),
      refresh: () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("json-auth-change"));
        }
      },
    };
  }, [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
