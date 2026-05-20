"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Banner, StateCard } from "@/components/ui/feedback";
import { adminApi } from "@/lib/api";
import type { KycSubmission } from "@/lib/api/admin";

function AdminKycContent() {
  const [items, setItems] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadPendingKyc = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.listPendingKyc();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load KYC queue.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPendingKyc();
  }, []);

  const processKyc = async (submissionId: string, action: "approve" | "reject") => {
    setProcessingId(submissionId);
    setError("");
    try {
      if (action === "approve") {
        await adminApi.approveKyc(submissionId);
      } else {
        await adminApi.rejectKyc(submissionId);
      }
      await loadPendingKyc();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process KYC.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Admin</p>
            <h1 className="text-2xl font-black text-slate-900">Antrian Verifikasi KYC</h1>
            <p className="text-sm text-slate-500">Tinjau pengajuan KYC yang masih menunggu persetujuan.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/products" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Produk
            </Link>
            <Link href="/admin/users" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Pengguna
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-6 grid gap-4 md:grid-cols-[0.8fr_0.2fr]">
          <div className="rounded-[28px] bg-[#2563eb] p-5 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Menunggu review</p>
            <p className="mt-3 text-3xl font-black">{items.length}</p>
            <p className="mt-2 text-sm text-blue-100">Jumlah pengajuan yang perlu diproses admin.</p>
          </div>
          <div className="flex items-end justify-end">
            <button
              type="button"
              onClick={() => void loadPendingKyc()}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Muat Ulang
            </button>
          </div>
        </div>

        {error && <Banner tone="error" className="mb-4">{error}</Banner>}

        {loading && <StateCard message="Memuat antrian KYC..." className="rounded-2xl bg-white" />}

        {!loading && items.length === 0 && !error && (
          <StateCard message="Tidak ada pengajuan KYC yang menunggu." className="rounded-2xl bg-white" />
        )}

        {!loading && items.length > 0 && (
          <section className="space-y-3">
            {items.map((item) => {
              const isProcessing = processingId === item.submissionId;
              return (
                <article key={item.submissionId} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="grid gap-2 text-sm md:grid-cols-2">
                    <p>
                      <span className="font-medium">Email:</span> {item.email}
                    </p>
                    <p>
                      <span className="font-medium">Nama:</span> {item.kycFullName}
                    </p>
                    <p>
                      <span className="font-medium">Nomor Identitas:</span> {item.identityNumber}
                    </p>
                    <p>
                      <span className="font-medium">Diajukan:</span>{" "}
                      {item.submittedAt ? new Date(item.submittedAt).toLocaleString("id-ID") : "-"}
                    </p>
                    <p className="md:col-span-2">
                      <span className="font-medium">Tautan Sosial:</span> {item.socialMediaLink || "-"}
                    </p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => void processKyc(item.submissionId, "approve")}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      Setujui
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => void processKyc(item.submissionId, "reject")}
                      className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      Tolak
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}

export default function AdminKycPage() {
  return (
    <AuthGuard requireAuth roles={["ADMIN"]}>
      <AdminKycContent />
    </AuthGuard>
  );
}
