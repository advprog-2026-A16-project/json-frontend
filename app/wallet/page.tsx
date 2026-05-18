"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { walletApi, type WalletResponse } from "@/lib/api/wallet";
import { useAuth } from "@/lib/auth/AuthProvider";

type WalletAction = "topUp" | "withdraw" | "payment" | "refund";

type WalletForm = {
  userId: string;
  amount: string;
};

const actionLabel: Record<WalletAction, string> = {
  topUp: "Top Up",
  withdraw: "Withdraw",
  payment: "Payment",
  refund: "Refund",
};

const actionHint: Record<WalletAction, string> = {
  topUp: "Tambah saldo wallet user.",
  withdraw: "Kurangi saldo wallet user.",
  payment: "Potong saldo untuk pembayaran.",
  refund: "Kembalikan saldo setelah pembatalan/refund.",
};

function WalletContent() {
  const { session } = useAuth();
  const [selectedAction, setSelectedAction] = useState<WalletAction>("topUp");
  const [form, setForm] = useState<WalletForm>({
    userId: session.userId ?? "",
    amount: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<WalletResponse | null>(null);

  const applyAction = async (action: WalletAction, payload: { userId: string; amount: number }) => {
    if (action === "topUp") return walletApi.topUp(payload);
    if (action === "withdraw") return walletApi.withdraw(payload);
    if (action === "payment") return walletApi.payment(payload);
    return walletApi.refund(payload);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setResult(null);

    const userId = form.userId.trim();
    const amount = Number(form.amount);

    if (!userId) {
      setError("userId is required.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("amount must be greater than 0.");
      return;
    }

    setLoading(true);
    try {
      const response = await applyAction(selectedAction, { userId, amount });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">Wallet Operations</h1>
            <p className="text-sm text-gray-500">Invoke wallet endpoints for top-up, withdraw, payment, refund.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard" className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100">
              Dashboard
            </Link>
            <Link href="/orders" className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100">
              Orders
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Transaction Panel</h2>

          <div className="mb-4 grid gap-2 sm:grid-cols-4">
            {(["topUp", "withdraw", "payment", "refund"] as WalletAction[]).map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => setSelectedAction(action)}
                className={`rounded-md border px-3 py-2 text-sm ${
                  selectedAction === action
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300 bg-white text-gray-800 hover:bg-gray-100"
                }`}
              >
                {actionLabel[action]}
              </button>
            ))}
          </div>

          <p className="mb-4 text-sm text-gray-600">{actionHint[selectedAction]}</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">User ID</label>
              <input
                value={form.userId}
                onChange={(event) => setForm((prev) => ({ ...prev, userId: event.target.value }))}
                placeholder="UUID user id"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Amount</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                placeholder="10000"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "Processing..." : `${actionLabel[selectedAction]} Now`}
            </button>
          </form>

          {error && (
            <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <p>
                User ID: <span className="font-medium">{result.userId}</span>
              </p>
              <p>
                Current Balance:{" "}
                <span className="font-medium">Rp {Number(result.balance).toLocaleString("id-ID")}</span>
              </p>
            </div>
          )}
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
