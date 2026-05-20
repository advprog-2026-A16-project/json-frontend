"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { UserRole } from "@/lib/auth/types";

type AuthGuardProps = {
  children: React.ReactNode;
  requireAuth?: boolean;
  roles?: UserRole[];
  redirectTo?: string;
  fallback?: React.ReactNode;
};

export const AuthGuard = ({
  children,
  requireAuth = true,
  roles,
  redirectTo,
  fallback,
}: AuthGuardProps) => {
  const { isAuthenticated, isHydrated, hasRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const needsRole = Boolean(roles && roles.length > 0);
  const isRoleAllowed = !needsRole || hasRole(...(roles as UserRole[]));

  useEffect(() => {
    if (!isHydrated) return;

    if (requireAuth && !isAuthenticated) {
      router.replace(redirectTo ?? `/auth/login?next=${encodeURIComponent(pathname || "/")}`);
      return;
    }

    if (requireAuth && isAuthenticated && needsRole && !isRoleAllowed) {
      router.replace(redirectTo ?? "/inventory");
    }
  }, [
    isAuthenticated,
    isHydrated,
    isRoleAllowed,
    needsRole,
    pathname,
    redirectTo,
    requireAuth,
    router,
  ]);

  if (!isHydrated) {
    return fallback ?? <div className="p-6 text-sm text-gray-600">Loading session...</div>;
  }

  if (requireAuth && !isAuthenticated) {
    return fallback ?? <div className="p-6 text-sm text-gray-600">Redirecting...</div>;
  }

  if (requireAuth && needsRole && !isRoleAllowed) {
    return fallback ?? <div className="p-6 text-sm text-gray-600">Redirecting...</div>;
  }

  return <>{children}</>;
};
