import type { AuthResponse, AuthSession, UserRole } from "@/lib/auth/types";

const TOKEN_KEY = "token";
const ROLE_KEY = "role";
const USER_ID_KEY = "userId";
const EMAIL_KEY = "email";

const DEFAULT_SESSION: AuthSession = {
  token: null,
  role: null,
  userId: null,
  email: null,
};

let cachedSession: AuthSession = DEFAULT_SESSION;
let cachedSignature = JSON.stringify([null, null, null, null]);

const isBrowser = () => typeof window !== "undefined";

const parseJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const normalizeRole = (value: unknown): UserRole | null => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const mapped = normalizeRole(item);
      if (mapped) return mapped;
    }
    return null;
  }

  if (typeof value !== "string") return null;

  const role = value.toUpperCase().replace(/^ROLE_/, "");
  if (role === "ADMIN" || role === "JASTIPER" || role === "TITIPERS") {
    return role;
  }
  return null;
};

const normalizeUuid = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(trimmed) ? trimmed : null;
};

export const getSession = (): AuthSession => {
  if (!isBrowser()) return DEFAULT_SESSION;

  const nextSession: AuthSession = {
    token: localStorage.getItem(TOKEN_KEY),
    role: (localStorage.getItem(ROLE_KEY) as UserRole | null) ?? null,
    userId: localStorage.getItem(USER_ID_KEY),
    email: localStorage.getItem(EMAIL_KEY),
  };

  const nextSignature = JSON.stringify([
    nextSession.token,
    nextSession.role,
    nextSession.userId,
    nextSession.email,
  ]);

  if (nextSignature === cachedSignature) {
    return cachedSession;
  }

  cachedSession = nextSession;
  cachedSignature = nextSignature;
  return cachedSession;
};

export const getAccessToken = (): string | null => {
  if (!isBrowser()) return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const clearSession = () => {
  if (!isBrowser()) return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(EMAIL_KEY);
  window.dispatchEvent(new Event("json-auth-change"));
};

type SessionPatch = {
  role?: unknown;
  userId?: unknown;
  email?: unknown;
};

export const patchSessionIdentity = (patch: SessionPatch) => {
  if (!isBrowser()) return;

  const role = normalizeRole(patch.role);
  const userId = normalizeUuid(patch.userId);
  const email = typeof patch.email === "string" ? patch.email : null;

  if (role) localStorage.setItem(ROLE_KEY, role);
  if (userId) localStorage.setItem(USER_ID_KEY, userId);
  if (email) localStorage.setItem(EMAIL_KEY, email);

  window.dispatchEvent(new Event("json-auth-change"));
};

export const setSessionFromAuthResponse = (payload: AuthResponse) => {
  if (!isBrowser() || !payload.token) return;

  const jwtPayload = parseJwtPayload(payload.token);

  const role =
    normalizeRole(payload.role) ??
    normalizeRole(jwtPayload?.role) ??
    normalizeRole(jwtPayload?.authorities);

  const userId =
    normalizeUuid(payload.userId) ??
    normalizeUuid(jwtPayload?.userId);

  const email =
    payload.email ??
    (typeof jwtPayload?.email === "string" ? jwtPayload.email : null) ??
    (typeof jwtPayload?.sub === "string" ? jwtPayload.sub : null);

  localStorage.setItem(TOKEN_KEY, payload.token);

  if (role) {
    localStorage.setItem(ROLE_KEY, role);
  } else {
    localStorage.removeItem(ROLE_KEY);
  }

  if (userId) {
    localStorage.setItem(USER_ID_KEY, userId);
  } else {
    localStorage.removeItem(USER_ID_KEY);
  }

  if (email) {
    localStorage.setItem(EMAIL_KEY, email);
  } else {
    localStorage.removeItem(EMAIL_KEY);
  }

  window.dispatchEvent(new Event("json-auth-change"));
};
