"use client";

import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/lib/auth/AuthProvider";

function DashboardContent() {
  const { session, hasRole } = useAuth();

  const quickActions = [
    { href: "/inventory", title: "Jelajahi Katalog", desc: "Cari produk dan lanjutkan ke checkout." },
    { href: "/orders", title: "Pesanan Saya", desc: "Lihat status order aktif dan riwayat pesanan." },
    { href: "/profile/me", title: "Profil", desc: "Perbarui identitas akun dan data pribadi." },
  ];

  if (hasRole("JASTIPER") || hasRole("ADMIN")) {
    quickActions.push({
      href: "/my/inventory",
      title: "Katalog Saya",
      desc: "Kelola produk, harga, dan stok.",
    });
  }

  if (hasRole("ADMIN")) {
    quickActions.length = 0;
    quickActions.push({
      href: "/orders",
      title: "Log Pesanan",
      desc: "Monitoring seluruh riwayat order sistem.",
    });
    quickActions.push({
      href: "/admin/products",
      title: "Panel Produk",
      desc: "Moderasi data produk di seluruh sistem.",
    });
    quickActions.push({
      href: "/admin/kyc",
      title: "Antrian KYC",
      desc: "Validasi submission KYC jastiper.",
    });
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] px-6 py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Dashboard</p>
          <h1 className="text-3xl font-black text-slate-900">Selamat datang kembali</h1>
          <p className="mt-2 text-sm text-slate-600">
            {session.email ? `Masuk sebagai ${session.email}` : "Masuk ke akun marketplace kamu."}
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Katalog</p>
            <p className="mt-2 text-2xl font-black text-slate-900">Produk Global</p>
            <p className="mt-1 text-sm text-slate-600">Temukan produk lintas negara dari seller aktif.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pesanan</p>
            <p className="mt-2 text-2xl font-black text-slate-900">Checkout Siap</p>
            <p className="mt-1 text-sm text-slate-600">Buat order baru dan pantau progres pengiriman.</p>
          </div>
          {hasRole("ADMIN") ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Moderasi</p>
              <p className="mt-2 text-2xl font-black text-slate-900">KYC + Kontrol Produk</p>
              <p className="mt-1 text-sm text-slate-600">Akses panel admin untuk moderasi sistem.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profil</p>
              <p className="mt-2 text-2xl font-black text-slate-900">Identitas Akun</p>
              <p className="mt-1 text-sm text-slate-600">Lengkapi profil dan data akun sebelum transaksi.</p>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300"
            >
              <p className="text-lg font-semibold text-slate-900">{item.title}</p>
              <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
            </Link>
          ))}
        </div>
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
