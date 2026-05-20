"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { profileApi } from "@/lib/api";
import { clearSession, getSession, patchSessionIdentity } from "@/lib/auth/session";
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
  const bootstrapAttemptedForToken = useRef<string | null>(null);
  const bootstrapRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session.token) {
      bootstrapAttemptedForToken.current = null;
      if (bootstrapRetryTimer.current) {
        clearTimeout(bootstrapRetryTimer.current);
        bootstrapRetryTimer.current = null;
      }
      return;
    }

    const needsBootstrap = !session.role || !session.email;
    if (!needsBootstrap) return;

    if (bootstrapAttemptedForToken.current === session.token) return;
    bootstrapAttemptedForToken.current = session.token;

    void (async () => {
      try {
        const me = await profileApi.me();
        patchSessionIdentity({
          role: me.role,
          userId: me.userId,
          email: me.email,
        });
      } catch {
        // Retry once for cases where token is persisted slightly earlier than backend auth readiness.
        if (bootstrapRetryTimer.current) clearTimeout(bootstrapRetryTimer.current);
        bootstrapRetryTimer.current = setTimeout(async () => {
          try {
            const me = await profileApi.me();
            patchSessionIdentity({
              role: me.role,
              userId: me.userId,
              email: me.email,
            });
          } catch {
            // Keep token-only session when profile endpoint remains unavailable.
          }
        }, 600);
      }
    })();
  }, [session.token, session.role, session.email]);

  useEffect(() => {
    return () => {
      if (bootstrapRetryTimer.current) {
        clearTimeout(bootstrapRetryTimer.current);
        bootstrapRetryTimer.current = null;
      }
    };
  }, []);

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
