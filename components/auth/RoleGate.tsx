"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import type { UserRole } from "@/lib/auth/types";

export const RoleGate = ({
  roles,
  children,
  fallback = null,
}: {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => {
  const { isAuthenticated, hasRole } = useAuth();

  if (!isAuthenticated) return <>{fallback}</>;
  if (!hasRole(...roles)) return <>{fallback}</>;

  return <>{children}</>;
};
