"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, profileApi } from "@/lib/api";
import { Banner } from "@/components/ui/feedback";
import { patchSessionIdentity, setSessionFromAuthResponse } from "@/lib/auth/session";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { isAuthenticated, isHydrated, refresh } = useAuth();

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace("/inventory");
    }
  }, [isAuthenticated, isHydrated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Password dan konfirmasi password harus sama.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = await authApi.register({ email, password, confirmPassword });

      if (!payload?.token) {
        setError(payload?.message || "Registrasi gagal. Email mungkin sudah terdaftar.");
        return;
      }

      setSessionFromAuthResponse(payload);

      try {
        const me = await profileApi.me();
        patchSessionIdentity({ role: me.role, email: me.email });
      } catch {
        // keep token-only session if profile endpoint fails
      }

      refresh();
      router.push("/inventory");
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
        <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-3xl font-black text-slate-900">Buat akun baru</h2>
          <p className="mt-2 text-sm text-slate-500">Daftar sebagai Titipers, lalu lengkapi profil jika ingin menjadi jastiper.</p>

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

          <div>
            <label className="block text-sm font-medium text-slate-700">Konfirmasi Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#2563eb] py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isSubmitting ? "Membuat akun..." : "Buat Akun"}
          </button>
        </form>

          <p className="mt-5 text-center text-sm text-slate-600">
            Sudah punya akun?{" "}
            <Link href="/auth/login" className="font-semibold text-blue-600 hover:underline">
              Masuk di sini
            </Link>
          </p>
        </section>

        <section className="rounded-[32px] bg-[#2563eb] p-8 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Registrasi</p>
          <h1 className="mt-4 text-4xl font-black leading-tight">Mulai titip belanja lintas negara tanpa ribet.</h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-blue-100">
            Setelah daftar, kamu bisa langsung menjelajahi katalog, membuat pesanan, dan melengkapi profil untuk kebutuhan transaksi.
          </p>
          <div className="mt-10 grid gap-3">
            <div className="rounded-3xl bg-white/12 p-4">
              <p className="text-xs uppercase tracking-wide text-blue-100">Langkah 1</p>
              <p className="mt-2 text-lg font-bold">Buat akun dengan email aktif</p>
            </div>
            <div className="rounded-3xl bg-white/12 p-4">
              <p className="text-xs uppercase tracking-wide text-blue-100">Langkah 2</p>
              <p className="mt-2 text-lg font-bold">Lengkapi profil dan mulai belanja</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
