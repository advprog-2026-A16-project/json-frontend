"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { orderApi, type Order, type OrderStatus } from "@/lib/api/order";
import { useAuth } from "@/lib/auth/AuthProvider";

const orderTimeline: OrderStatus[] = ["PAID", "PURCHASED", "SHIPPED", "COMPLETED"];

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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold">Order Detail</h1>
          <div className="flex gap-2">
            <Link href="/orders" className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100">
              Orders
            </Link>
            <Link href="/dashboard" className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        {loading && <p className="text-sm text-gray-600">Loading order...</p>}
        {!loading && error && <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>}

        {!loading && order && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="mb-3 text-xs text-gray-500">Order ID: {order.id}</p>

            <div className="grid gap-3 text-sm md:grid-cols-2">
              <p>
                <span className="font-semibold">Status:</span> {order.status}
              </p>
              <p>
                <span className="font-semibold">Quantity:</span> {order.quantity}
              </p>
              <p>
                <span className="font-semibold">Product ID:</span> {order.productId}
              </p>
              <p>
                <span className="font-semibold">Total:</span> Rp{" "}
                {Number(order.totalPrice ?? 0).toLocaleString("id-ID")}
              </p>
              <p>
                <span className="font-semibold">Titipers ID:</span> {order.titipersId}
              </p>
              <p>
                <span className="font-semibold">Jastiper ID:</span> {order.jastiperId}
              </p>
              <p className="md:col-span-2">
                <span className="font-semibold">Shipping Address:</span> {order.shippingAddress}
              </p>
              <p>
                <span className="font-semibold">Created:</span> {order.createdAt ?? "-"}
              </p>
              <p>
                <span className="font-semibold">Updated:</span> {order.updatedAt ?? "-"}
              </p>
            </div>

            <div className="mt-6 rounded border border-gray-200 bg-gray-50 p-4">
              <h2 className="mb-3 text-sm font-semibold">Order Timeline</h2>
              <div className="flex flex-wrap gap-2">
                {orderTimeline.map((status) => {
                  const currentIndex = orderTimeline.indexOf(order.status);
                  const stepIndex = orderTimeline.indexOf(status);
                  const reached = currentIndex >= 0 && stepIndex <= currentIndex;

                  return (
                    <span
                      key={status}
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        reached ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {status}
                    </span>
                  );
                })}
                {order.status === "CANCELLED" && (
                  <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                    CANCELLED
                  </span>
                )}
              </div>
            </div>

            {canUpdateStatus && (
              <div className="mt-6 rounded border border-gray-200 bg-gray-50 p-4">
                <h2 className="mb-2 text-sm font-semibold">Update Status</h2>
                <p className="mb-2 text-xs text-gray-500">
                  Allowed transition from current status: {order.status}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value as OrderStatus)}
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    {allowedStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={updating}
                    className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    {updating ? "Updating..." : "Update"}
                  </button>
                </div>
                {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
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
