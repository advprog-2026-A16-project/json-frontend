"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Banner, StateCard } from "@/components/ui/feedback";
import { orderApi, type Order, type OrderStatus } from "@/lib/api/order";
import { useAuth } from "@/lib/auth/AuthProvider";

const orderTimeline: OrderStatus[] = ["PAID", "PURCHASED", "SHIPPED", "COMPLETED"];
const orderStatusLabel: Record<OrderStatus, string> = {
  PAID: "Dibayar",
  PURCHASED: "Dibelikan",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const allowedTransitionMap: Record<OrderStatus, OrderStatus[]> = {
  PAID: ["PAID", "PURCHASED", "CANCELLED"],
  PURCHASED: ["PURCHASED", "SHIPPED", "CANCELLED"],
  SHIPPED: ["SHIPPED", "COMPLETED"],
  COMPLETED: ["COMPLETED"],
  CANCELLED: ["CANCELLED"],
};

function OrderDetailContent() {
  const { hasRole } = useAuth();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>("PAID");
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");

  const canUpdateStatus = hasRole("JASTIPER") || hasRole("ADMIN");
  const allowedStatuses = useMemo<OrderStatus[]>(
    () => (order ? allowedTransitionMap[order.status] : ["PAID"]),
    [order],
  );

  const loadDetail = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError("");
    try {
      const data = await orderApi.detail(id);
      setOrder(data);
      setSelectedStatus(data.status);
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : "Failed to load order detail.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!allowedStatuses.includes(selectedStatus)) {
      setSelectedStatus(allowedStatuses[0]);
    }
  }, [allowedStatuses, selectedStatus]);

  const handleUpdateStatus = async () => {
    if (!id) return;
    setMessage("");
    setError("");
    setUpdating(true);

    try {
      const updated = await orderApi.updateStatus(id, { newStatus: selectedStatus });
      setOrder(updated);
      setMessage("Order status updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order status.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Pesanan</p>
            <h1 className="text-3xl font-black text-slate-900">Detail Pesanan</h1>
            <p className="text-sm text-slate-500">Ringkasan transaksi, alamat kirim, dan pembaruan status.</p>
          </div>
          <Link href="/orders" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Kembali ke Pesanan
          </Link>
        </div>

        {loading && <StateCard message="Memuat detail pesanan..." className="rounded-2xl bg-white" />}
        {!loading && error && <Banner tone="error">{error}</Banner>}

        {!loading && order && (
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-[#2563eb] p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Status</p>
                <p className="mt-2 text-2xl font-black">{orderStatusLabel[order.status]}</p>
                <p className="mt-2 text-sm text-blue-100">Ref #{order.id.slice(0, 8)}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Total pembayaran</p>
                <p className="mt-2 text-2xl font-black text-slate-900">Rp {Number(order.totalPrice ?? 0).toLocaleString("id-ID")}</p>
                <p className="mt-2 text-sm text-slate-500">{order.quantity} item</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Terakhir diperbarui</p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {order.updatedAt ? new Date(order.updatedAt).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "-"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {order.updatedAt ? new Date(order.updatedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-base font-bold text-slate-900">Rincian Pesanan</h2>
                <div className="mt-4 space-y-3 text-slate-600">
                  <p><span className="font-semibold text-slate-900">Jumlah:</span> {order.quantity} item</p>
                  <p><span className="font-semibold text-slate-900">Dibuat:</span> {order.createdAt ? new Date(order.createdAt).toLocaleString("id-ID") : "-"}</p>
                  <p><span className="font-semibold text-slate-900">Produk:</span> #{order.productId.slice(0, 8)}</p>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-base font-bold text-slate-900">Alamat Pengiriman</h2>
                <p className="mt-4 leading-7 text-slate-600">{order.shippingAddress}</p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Perjalanan Pesanan</h2>
              <div className="flex flex-wrap gap-2">
                {orderTimeline.map((status) => {
                  const currentIndex = orderTimeline.indexOf(order.status);
                  const stepIndex = orderTimeline.indexOf(status);
                  const reached = currentIndex >= 0 && stepIndex <= currentIndex;

                  return (
                    <span
                      key={status}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        reached ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-500"
                      }`}
                    >
                      {orderStatusLabel[status]}
                    </span>
                  );
                })}
                {order.status === "CANCELLED" && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                    {orderStatusLabel.CANCELLED}
                  </span>
                )}
              </div>
            </div>

            {canUpdateStatus && (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Pembaruan Status</h2>
                <p className="mb-3 text-sm text-slate-500">
                  Pilih tahapan berikutnya yang diizinkan untuk pesanan ini.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value as OrderStatus)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {allowedStatuses.map((status) => (
                      <option key={status} value={status}>
                        {orderStatusLabel[status]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={updating}
                    className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {updating ? "Menyimpan..." : "Simpan Status"}
                  </button>
                </div>
                {message && <Banner tone="success" className="mt-2">{message}</Banner>}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <AuthGuard requireAuth>
      <OrderDetailContent />
    </AuthGuard>
  );
}
