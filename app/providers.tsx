"use client";

import { TopNavbar } from "@/components/ui/top-navbar";
import { AuthProvider } from "@/lib/auth/AuthProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TopNavbar />
      {children}
    </AuthProvider>
  );
}
