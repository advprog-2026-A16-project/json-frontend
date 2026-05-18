"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">Admin KYC Queue</h1>
            <p className="text-sm text-gray-500">Review pending KYC submissions.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/products" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              Products
            </Link>
            <Link href="/admin/users" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              Users
            </Link>
            <Link href="/dashboard" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => void loadPendingKyc()}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100"
          >
            Refresh
          </button>
        </div>

        {error && (
          <section className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</section>
        )}

        {loading && <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm">Loading...</section>}

        {!loading && items.length === 0 && !error && (
          <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            No pending KYC submissions.
          </section>
        )}

        {!loading && items.length > 0 && (
          <section className="space-y-3">
            {items.map((item) => {
              const isProcessing = processingId === item.submissionId;
              return (
                <article key={item.submissionId} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="grid gap-2 text-sm md:grid-cols-2">
                    <p>
                      <span className="font-medium">Email:</span> {item.email}
                    </p>
                    <p>
                      <span className="font-medium">Name:</span> {item.kycFullName}
                    </p>
                    <p>
                      <span className="font-medium">Identity:</span> {item.identityNumber}
                    </p>
                    <p>
                      <span className="font-medium">Submitted:</span>{" "}
                      {item.submittedAt ? new Date(item.submittedAt).toLocaleString("id-ID") : "-"}
                    </p>
                    <p className="md:col-span-2">
                      <span className="font-medium">Social Link:</span> {item.socialMediaLink || "-"}
                    </p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => void processKyc(item.submissionId, "approve")}
                      className="rounded-md bg-emerald-600 px-3 py-1 text-xs text-white disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => void processKyc(item.submissionId, "reject")}
                      className="rounded-md bg-red-600 px-3 py-1 text-xs text-white disabled:opacity-60"
                    >
                      Reject
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
