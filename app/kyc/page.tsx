"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Banner } from "@/components/ui/feedback";
import { profileApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";

type KycForm = {
  fullName: string;
  identityNumber: string;
  socialMediaLink: string;
};

function KycContent() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [form, setForm] = useState<KycForm>({
    fullName: "",
    identityNumber: "",
    socialMediaLink: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const isAdmin = hasRole("ADMIN");

  useEffect(() => {
    if (isAdmin) {
      router.replace("/admin/kyc");
    }
  }, [isAdmin, router]);

  if (isAdmin) {
    return <div className="p-6 text-sm text-slate-600">Redirecting to admin KYC queue...</div>;
  }

  const updateField = (key: keyof KycForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      await profileApi.submitKyc({
        fullName: form.fullName.trim(),
        identityNumber: form.identityNumber.trim(),
        socialMediaLink: form.socialMediaLink.trim(),
      });
      setSuccess("Pengajuan KYC berhasil dikirim dan menunggu tinjauan admin.");
      setForm({ fullName: "", identityNumber: "", socialMediaLink: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "KYC submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] px-6 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Verifikasi</p>
            <h1 className="text-3xl font-black text-slate-900">Pengajuan KYC</h1>
          </div>
          <Link
            href="/inventory"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Kembali ke Katalog
          </Link>
        </div>

        <div className="mb-6 rounded-[28px] bg-[#2563eb] p-8 text-white shadow-sm">
          <h2 className="text-2xl font-black">Menjadi Jastiper Terpercaya</h2>
          <p className="mt-2 text-sm leading-relaxed text-blue-100">
            Kirimkan data identitas Anda untuk proses verifikasi. Langkah ini diwajibkan untuk memastikan keamanan bertransaksi sebelum Anda dapat mengelola dan menawarkan produk sebagai Jastiper di platform JSON.
          </p>
        </div>

        {error && <Banner tone="error" className="mb-6">{error}</Banner>}
        {success && <Banner tone="success" className="mb-6">{success}</Banner>}

        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Nama Lengkap (Sesuai KTP)</label>
              <input
                value={form.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Masukkan nama lengkap Anda"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Nomor Identitas (NIK KTP)</label>
              <input
                value={form.identityNumber}
                onChange={(event) => updateField("identityNumber", event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Masukkan 16 digit NIK"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Tautan Media Sosial Aktif</label>
              <input
                value={form.socialMediaLink}
                onChange={(event) => updateField("socialMediaLink", event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="https://instagram.com/username"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isSubmitting ? "Memproses Data..." : "Kirim Pengajuan KYC"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function KycPage() {
  return (
    <AuthGuard requireAuth>
      <KycContent />
    </AuthGuard>
  );
}