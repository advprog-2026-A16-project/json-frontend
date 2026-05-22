"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api"; // profileApi dihapus karena sudah tidak perlu
import { Banner } from "@/components/ui/feedback";
import { patchSessionIdentity, setSessionFromAuthResponse } from "@/lib/auth/session";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { UserRole } from "@/lib/auth/types";

function getPostLoginRoute(role: UserRole | null | undefined): string {
  if (role === "ADMIN") return "/admin/kyc";
  if (role === "JASTIPER") return "/my/inventory";
  return "/inventory";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { isAuthenticated, isHydrated, session, refresh } = useAuth();

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace(getPostLoginRoute(session.role));
    }
  }, [isAuthenticated, isHydrated, router, session.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const payload = await authApi.login({ email, password });

      if (!payload?.token) {
        setError(payload?.message || "Login gagal. Periksa kembali email dan password.");
        return;
      }

      setSessionFromAuthResponse(payload);

      patchSessionIdentity({ 
        role: payload.role, 
        userId: payload.userId, 
        email: payload.email 
      });

      const nextRole = payload.role ?? null;

      refresh();
      router.push(getPostLoginRoute(nextRole));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan server. Coba lagi beberapa saat.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] px-6 py-10 text-slate-900">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[32px] bg-[#2563eb] p-8 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Masuk</p>
          <h1 className="mt-4 text-4xl font-black leading-tight">Satu akun untuk katalog, pesanan, dan dompet.</h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-blue-100">
            Login ke JSON untuk melanjutkan belanja titip, memantau order, atau mengelola katalog sebagai jastiper.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl bg-white/12 p-4">
              <p className="text-xs uppercase tracking-wide text-blue-100">Titipers</p>
              <p className="mt-2 text-lg font-bold">Checkout lebih cepat</p>
            </div>
            <div className="rounded-3xl bg-white/12 p-4">
              <p className="text-xs uppercase tracking-wide text-blue-100">Jastiper</p>
              <p className="mt-2 text-lg font-bold">Kelola stok dan katalog</p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-3xl font-black text-slate-900">Masuk ke akun</h2>
          <p className="mt-2 text-sm text-slate-500">Gunakan email dan password yang sudah terdaftar.</p>

          {error && <Banner tone="error" className="mt-5">{error}</Banner>}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#2563eb] py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isSubmitting ? "Memproses login..." : "Masuk"}
          </button>
        </form>

          <p className="mt-5 text-center text-sm text-slate-600">
            Belum punya akun?{" "}
            <Link href="/auth/register" className="font-semibold text-blue-600 hover:underline">
              Buat akun sekarang
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}