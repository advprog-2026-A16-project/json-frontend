"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/lib/auth/AuthProvider";

function DashboardContent() {
  const router = useRouter();
  const { session, logout, hasRole } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-sm text-gray-700">Session active.</p>
      <p className="text-xs text-gray-500">
        Role: <span className="font-medium">{session.role ?? "UNKNOWN"}</span>
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/inventory" className="rounded bg-blue-600 px-3 py-2 text-sm text-white">
          Catalog
        </Link>
        <Link href="/orders" className="rounded bg-amber-600 px-3 py-2 text-sm text-white">
          Orders
        </Link>
        <Link href="/wallet" className="rounded bg-teal-600 px-3 py-2 text-sm text-white">
          Wallet
        </Link>
        <Link href="/profile" className="rounded bg-slate-600 px-3 py-2 text-sm text-white">
          Profile
        </Link>
        <Link href="/kyc" className="rounded bg-indigo-600 px-3 py-2 text-sm text-white">
          KYC
        </Link>
        {(hasRole("JASTIPER") || hasRole("ADMIN")) && (
          <Link href="/my/inventory" className="rounded bg-emerald-600 px-3 py-2 text-sm text-white">
            My Inventory
          </Link>
        )}
        <button onClick={handleLogout} className="rounded bg-red-500 px-3 py-2 text-sm text-white">
          Logout
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard requireAuth>
      <DashboardContent />
    </AuthGuard>
  );
}
