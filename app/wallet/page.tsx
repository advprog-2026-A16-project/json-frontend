"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Banner } from "@/components/ui/feedback";
import { walletApi, type WalletResponse } from "@/lib/api/wallet";
import { useAuth } from "@/lib/auth/AuthProvider";

type WalletAction = "topUp" | "withdraw";

const actionLabel: Record<WalletAction, string> = {
  topUp: "Top Up",
  withdraw: "Tarik Dana",
};

const actionHint: Record<WalletAction, string> = {
  topUp: "Tambah saldo wallet akun kamu sendiri.",
  withdraw: "Kurangi saldo wallet akun kamu sendiri.",
};

function WalletContent() {
  const { session } = useAuth();
  const [selectedAction, setSelectedAction] = useState<WalletAction>("topUp");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<WalletResponse | null>(null);
  const currentUserId = session.userId?.trim() ?? "";
  const activeIdentity = session.email ?? "Akun aktif";
  const formattedBalance = result ? `Rp ${Number(result.balance).toLocaleString("id-ID")}` : "Belum ada transaksi";

  const applyAction = async (action: WalletAction, payload: { userId: string; amount: number }) => {
    switch (action) {
      case "topUp":
        return walletApi.topUp(payload);
      case "withdraw":
        return walletApi.withdraw(payload);
    }
  };

  useEffect(() => {
    setResult(null);
  }, [selectedAction]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setResult(null);

    const userId = currentUserId;
    const parsedAmount = Number(amount);

    if (!userId) {
      setError("Sesi akun tidak tersedia. Login ulang lalu coba lagi.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Nominal harus lebih besar dari nol.");
      return;
    }

    setLoading(true);
    try {
      const response = await applyAction(selectedAction, { userId, amount: parsedAmount });
      setResult(response);
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaksi dompet gagal diproses.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Dompet</p>
          <h1 className="text-3xl font-black text-slate-900">Kelola saldo akun</h1>
          <p className="mt-1 text-sm text-slate-500">Top up dan tarik saldo tanpa field internal yang membingungkan.</p>
        </div>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] bg-[#2563eb] p-6 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Akun Aktif</p>
            <h2 className="mt-3 text-2xl font-black">{activeIdentity}</h2>
            <p className="mt-2 text-sm text-blue-100">Semua aksi pada halaman ini otomatis memakai akun yang sedang login.</p>

            <div className="mt-8 rounded-3xl bg-white/12 p-5">
              <p className="text-xs uppercase tracking-wide text-blue-100">Saldo terbaru</p>
              <p className="mt-2 text-3xl font-black">{formattedBalance}</p>
              <p className="mt-2 text-sm text-blue-100">
                {result ? "Angka ini diperbarui setelah transaksi terakhir berhasil." : "Lakukan transaksi pertama untuk melihat saldo terbaru."}
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Transaksi Cepat</h2>
            <p className="mt-1 text-sm text-slate-500">{actionHint[selectedAction]}</p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {(["topUp", "withdraw"] as WalletAction[]).map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => setSelectedAction(action)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    selectedAction === action
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {actionLabel[action]}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block text-sm text-slate-600">
                <span className="mb-1 block font-medium text-slate-800">Nominal</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="100000"
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm"
                />
              </label>

              <button
                type="submit"
                disabled={loading || !currentUserId}
                className="w-full rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? "Memproses transaksi..." : `${actionLabel[selectedAction]} Sekarang`}
              </button>
            </form>

            {error && <Banner tone="error" className="mt-4">{error}</Banner>}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function WalletPage() {
  return (
    <AuthGuard requireAuth>
      <WalletContent />
    </AuthGuard>
  );
}
