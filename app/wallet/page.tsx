"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui/feedback";
import {
  walletApi,
  type PaymentGatewayTopUpResponse,
  type TransactionResponse,
  type TransactionStatus,
  type TransactionType,
  type WalletResponse,
} from "@/lib/api/wallet";
import { useAuth } from "@/lib/auth/AuthProvider";

type WalletAction =
  | "topUpPayment"
  | "topUpRequest"
  | "topUp"
  | "withdrawRequest"
  | "withdraw"
  | "payment";

const actionMeta: Record<
  WalletAction,
  { label: string; caption: string; hint: string; needsDestination?: boolean }
> = {
  topUpPayment: {
    label: "Top Up Payment",
    caption: "Midtrans",
    hint: "Buat transaksi top up lewat payment gateway.",
  },
  topUpRequest: {
    label: "Request Top Up",
    caption: "Pending",
    hint: "Ajukan top up untuk diverifikasi admin.",
  },
  topUp: {
    label: "Top Up Instan",
    caption: "Langsung",
    hint: "Tambah saldo wallet akun kamu sendiri.",
  },
  withdrawRequest: {
    label: "Request Tarik Dana",
    caption: "Pending",
    hint: "Ajukan penarikan saldo untuk diverifikasi admin.",
    needsDestination: true,
  },
  withdraw: {
    label: "Tarik Dana Instan",
    caption: "Langsung",
    hint: "Kurangi saldo wallet akun kamu sendiri.",
    needsDestination: true,
  },
  payment: {
    label: "Bayar",
    caption: "Debit",
    hint: "Simulasikan pembayaran dari saldo wallet.",
  },
};

const actionOrder: WalletAction[] = [
  "topUpPayment",
  "topUpRequest",
  "topUp",
  "withdrawRequest",
  "withdraw",
  "payment",
];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const asNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatCurrency = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 2,
  }).format(asNumber(value));

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const typeLabel = (type: TransactionType) => {
  switch (type) {
    case "TOP_UP":
      return "Top up";
    case "WITHDRAWAL":
      return "Tarik dana";
    case "PAYMENT":
      return "Bayar";
    case "REFUND":
      return "Refund";
  }
};

const statusLabel = (status: TransactionStatus) => {
  switch (status) {
    case "SUCCESS":
      return "Sukses";
    case "PENDING":
      return "Pending";
    case "FAILED":
      return "Gagal";
  }
};

const statusClassName = (status: TransactionStatus) => {
  switch (status) {
    case "SUCCESS":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700";
  }
};

const signedAmount = (transaction: TransactionResponse) => {
  if (transaction.status !== "SUCCESS") return 0;
  const amount = asNumber(transaction.amount);
  return transaction.type === "TOP_UP" || transaction.type === "REFUND"
    ? amount
    : -amount;
};

function WalletContent() {
  const { session } = useAuth();
  const [selectedAction, setSelectedAction] =
    useState<WalletAction>("topUpPayment");
  const [amount, setAmount] = useState("");
  const [destinationAccount, setDestinationAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);

  const [refundUserId, setRefundUserId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [verifyTransactionId, setVerifyTransactionId] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState(true);
  const [verificationDescription, setVerificationDescription] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");

  const activeIdentity = session.email ?? "Akun aktif";
  const selectedMeta = actionMeta[selectedAction];

  const loadTransactions = useCallback(async () => {
    setLoadingTransactions(true);
    try {
      const data = await walletApi.getTransactions();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Riwayat transaksi wallet gagal dimuat.",
      );
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const balance = useMemo(
    () => transactions.reduce((total, transaction) => total + signedAmount(transaction), 0),
    [transactions],
  );

  const successfulTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.status === "SUCCESS"),
    [transactions],
  );

  const pendingTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.status === "PENDING"),
    [transactions],
  );

  const totalIncoming = useMemo(
    () =>
      successfulTransactions
        .filter((transaction) => transaction.type === "TOP_UP" || transaction.type === "REFUND")
        .reduce((total, transaction) => total + asNumber(transaction.amount), 0),
    [successfulTransactions],
  );

  const totalOutgoing = useMemo(
    () =>
      successfulTransactions
        .filter(
          (transaction) =>
            transaction.type === "WITHDRAWAL" || transaction.type === "PAYMENT",
        )
        .reduce((total, transaction) => total + asNumber(transaction.amount), 0),
    [successfulTransactions],
  );

  const resetFeedback = () => {
    setError("");
    setMessage("");
    setPaymentUrl("");
  };

  const parseAmount = (value: string) => Number(value.trim());

  const validateAmount = (value: string, label = "Nominal") => {
    const parsedAmount = parseAmount(value);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return `${label} harus lebih besar dari nol.`;
    }
    return "";
  };

  const applyWalletAction = async (
    action: WalletAction,
    payload: { amount: number; destinationAccount?: string },
  ): Promise<WalletResponse | TransactionResponse | PaymentGatewayTopUpResponse> => {
    switch (action) {
      case "topUpPayment":
        return walletApi.requestTopUpPayment({ amount: payload.amount });
      case "topUpRequest":
        return walletApi.requestTopUp({ amount: payload.amount });
      case "topUp":
        return walletApi.topUp({ amount: payload.amount });
      case "withdrawRequest":
        return walletApi.requestWithdrawal({
          amount: payload.amount,
          destinationAccount: payload.destinationAccount ?? "",
        });
      case "withdraw":
        return walletApi.withdraw({
          amount: payload.amount,
          destinationAccount: payload.destinationAccount ?? "",
        });
      case "payment":
        return walletApi.payment({ amount: payload.amount });
    }
  };

  const describeSuccess = (
    action: WalletAction,
    response: WalletResponse | TransactionResponse | PaymentGatewayTopUpResponse,
  ) => {
    if ("transaction" in response) {
      const transaction = response.transaction;
      return `${actionMeta[action].label} dibuat dengan status ${statusLabel(transaction.status)}.`;
    }

    if ("status" in response) {
      return `${typeLabel(response.type)} dibuat dengan status ${statusLabel(response.status)}.`;
    }

    return `${actionMeta[action].label} berhasil diproses.`;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    resetFeedback();

    const amountError = validateAmount(amount);
    if (amountError) {
      setError(amountError);
      return;
    }

    const trimmedDestination = destinationAccount.trim();
    if (selectedMeta.needsDestination && !trimmedDestination) {
      setError("Rekening tujuan wajib diisi untuk tarik dana.");
      return;
    }

    setLoading(true);
    try {
      const response = await applyWalletAction(selectedAction, {
        amount: parseAmount(amount),
        destinationAccount: trimmedDestination,
      });

      if ("paymentRedirectUrl" in response && response.paymentRedirectUrl) {
        setPaymentUrl(response.paymentRedirectUrl);
      } else if (
        "transaction" in response &&
        response.transaction.paymentRedirectUrl
      ) {
        setPaymentUrl(response.transaction.paymentRedirectUrl);
      }

      setMessage(describeSuccess(selectedAction, response));
      setAmount("");
      setDestinationAccount("");
      await loadTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaksi dompet gagal diproses.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (event: React.FormEvent) => {
    event.preventDefault();
    setAdminError("");
    setAdminMessage("");

    const amountError = validateAmount(refundAmount, "Nominal refund");
    if (!uuidPattern.test(refundUserId.trim())) {
      setAdminError("User ID refund harus berupa UUID valid.");
      return;
    }
    if (amountError) {
      setAdminError(amountError);
      return;
    }

    setAdminLoading(true);
    try {
      await walletApi.refund({
        userId: refundUserId.trim(),
        amount: parseAmount(refundAmount),
      });
      setAdminMessage("Refund berhasil diproses.");
      setRefundUserId("");
      setRefundAmount("");
      await loadTransactions();
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Refund gagal diproses.");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setAdminError("");
    setAdminMessage("");

    if (!uuidPattern.test(verifyTransactionId.trim())) {
      setAdminError("Transaction ID harus berupa UUID valid.");
      return;
    }

    setAdminLoading(true);
    try {
      const transaction = await walletApi.verifyTransaction(verifyTransactionId.trim(), {
        success: verificationSuccess,
        description: verificationDescription.trim() || undefined,
      });
      setAdminMessage(`Transaksi sekarang berstatus ${statusLabel(transaction.status)}.`);
      setVerifyTransactionId("");
      setVerificationDescription("");
      await loadTransactions();
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Verifikasi gagal diproses.");
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase text-slate-400">Dompet</p>
          <h1 className="text-3xl font-black text-slate-900">Kelola saldo akun</h1>
          <p className="mt-1 text-sm text-slate-500">
            Top up, tarik dana, bayar, dan pantau riwayat wallet akun yang sedang login.
          </p>
        </div>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg bg-[#2563eb] p-6 text-white shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-blue-100">Akun Aktif</p>
                <h2 className="mt-3 break-words text-2xl font-black">{activeIdentity}</h2>
              </div>
              {session.role && (
                <span className="w-fit rounded border border-white/30 bg-white/15 px-2 py-1 text-xs font-semibold">
                  {session.role}
                </span>
              )}
            </div>

            <div className="mt-8 rounded-lg bg-white/12 p-5">
              <p className="text-xs uppercase text-blue-100">Saldo terbaru</p>
              <p className="mt-2 text-3xl font-black">{formatCurrency(balance)}</p>
              <p className="mt-2 text-sm text-blue-100">
                Dihitung dari transaksi sukses pada riwayat wallet.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-blue-100">Masuk</p>
                <p className="mt-1 text-sm font-bold">{formatCurrency(totalIncoming)}</p>
              </div>
              <div>
                <p className="text-xs text-blue-100">Keluar</p>
                <p className="mt-1 text-sm font-bold">{formatCurrency(totalOutgoing)}</p>
              </div>
              <div>
                <p className="text-xs text-blue-100">Pending</p>
                <p className="mt-1 text-sm font-bold">{pendingTransactions.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Transaksi Cepat</h2>
            <p className="mt-1 text-sm text-slate-500">{selectedMeta.hint}</p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {actionOrder.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => {
                    setSelectedAction(action);
                    resetFeedback();
                  }}
                  className={`min-h-16 rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${
                    selectedAction === action
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <span className="block">{actionMeta[action].label}</span>
                  <span
                    className={`mt-1 block text-xs font-normal ${
                      selectedAction === action ? "text-blue-100" : "text-slate-500"
                    }`}
                  >
                    {actionMeta[action].caption}
                  </span>
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm"
                />
              </label>

              {selectedMeta.needsDestination && (
                <label className="block text-sm text-slate-600">
                  <span className="mb-1 block font-medium text-slate-800">
                    Rekening tujuan
                  </span>
                  <input
                    value={destinationAccount}
                    onChange={(event) => setDestinationAccount(event.target.value)}
                    placeholder="Bank / e-wallet / nomor rekening"
                    className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm"
                  />
                </label>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? "Memproses transaksi..." : `${selectedMeta.label} Sekarang`}
              </button>
            </form>

            {error && (
              <Banner tone="error" className="mt-4">
                {error}
              </Banner>
            )}
            {message && (
              <Banner tone="success" className="mt-4">
                {message}
              </Banner>
            )}
            {paymentUrl && (
              <a
                href={paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                Buka halaman pembayaran
              </a>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Riwayat Transaksi</h2>
              <p className="mt-1 text-sm text-slate-500">
                Status pending tidak mengubah saldo sampai diverifikasi.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadTransactions()}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {loadingTransactions ? (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              Memuat riwayat wallet...
            </div>
          ) : transactions.length === 0 ? (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              Belum ada transaksi wallet.
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <th className="py-3 pr-3 font-semibold">Tipe</th>
                    <th className="py-3 pr-3 font-semibold">Status</th>
                    <th className="py-3 pr-3 text-right font-semibold">Nominal</th>
                    <th className="py-3 pr-3 font-semibold">Detail</th>
                    <th className="py-3 font-semibold">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => {
                    const isIncoming =
                      transaction.type === "TOP_UP" || transaction.type === "REFUND";
                    return (
                      <tr key={transaction.id} className="border-b border-slate-100">
                        <td className="py-3 pr-3 font-medium">
                          {typeLabel(transaction.type)}
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${statusClassName(
                              transaction.status,
                            )}`}
                          >
                            {statusLabel(transaction.status)}
                          </span>
                        </td>
                        <td
                          className={`py-3 pr-3 text-right font-semibold ${
                            isIncoming ? "text-emerald-700" : "text-slate-900"
                          }`}
                        >
                          {isIncoming ? "+" : "-"} {formatCurrency(transaction.amount)}
                        </td>
                        <td className="max-w-xs py-3 pr-3 text-slate-600">
                          <div className="truncate">
                            {transaction.description ||
                              transaction.destinationAccount ||
                              transaction.gatewayOrderId ||
                              "-"}
                          </div>
                          {transaction.paymentRedirectUrl && (
                            <a
                              href={transaction.paymentRedirectUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-block text-xs font-semibold text-blue-700 hover:underline"
                            >
                              Payment link
                            </a>
                          )}
                        </td>
                        <td className="py-3 text-xs text-slate-500">
                          {formatDate(transaction.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {session.role === "ADMIN" && (
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <form
              onSubmit={handleRefund}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-bold text-slate-900">Refund Admin</h2>
              <p className="mt-1 text-sm text-slate-500">
                Refund membutuhkan User ID target dari backend.
              </p>
              <label className="mt-5 block text-sm text-slate-600">
                <span className="mb-1 block font-medium text-slate-800">User ID</span>
                <input
                  value={refundUserId}
                  onChange={(event) => setRefundUserId(event.target.value)}
                  placeholder="UUID user"
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm"
                />
              </label>
              <label className="mt-4 block text-sm text-slate-600">
                <span className="mb-1 block font-medium text-slate-800">Nominal</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={refundAmount}
                  onChange={(event) => setRefundAmount(event.target.value)}
                  placeholder="50000"
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={adminLoading}
                className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                Proses Refund
              </button>
            </form>

            <form
              onSubmit={handleVerify}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-bold text-slate-900">Verifikasi Transaksi</h2>
              <p className="mt-1 text-sm text-slate-500">
                Masukkan ID transaksi pending yang perlu diverifikasi.
              </p>
              <label className="mt-5 block text-sm text-slate-600">
                <span className="mb-1 block font-medium text-slate-800">
                  Transaction ID
                </span>
                <input
                  value={verifyTransactionId}
                  onChange={(event) => setVerifyTransactionId(event.target.value)}
                  placeholder="UUID transaksi"
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm"
                />
              </label>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVerificationSuccess(true)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    verificationSuccess
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationSuccess(false)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    !verificationSuccess
                      ? "border-red-600 bg-red-50 text-red-700"
                      : "border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Reject
                </button>
              </div>
              <label className="mt-4 block text-sm text-slate-600">
                <span className="mb-1 block font-medium text-slate-800">Deskripsi</span>
                <textarea
                  value={verificationDescription}
                  onChange={(event) => setVerificationDescription(event.target.value)}
                  rows={3}
                  placeholder="Catatan verifikasi"
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={adminLoading}
                className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                Simpan Verifikasi
              </button>
            </form>

            {(adminError || adminMessage) && (
              <div className="lg:col-span-2">
                <Banner tone={adminError ? "error" : "success"}>
                  {adminError || adminMessage}
                </Banner>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default function WalletPage() {
  const { isAuthenticated, isHydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/auth/login?next=%2Fwallet");
    }
  }, [isAuthenticated, isHydrated, router]);

  if (!isHydrated) {
    return <div className="p-6 text-sm text-slate-600">Loading session...</div>;
  }

  if (!isAuthenticated) {
    return <div className="p-6 text-sm text-slate-600">Redirecting...</div>;
  }

  return <WalletContent />;
}
