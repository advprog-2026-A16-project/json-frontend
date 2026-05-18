"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { orderApi, type Order } from "@/lib/api/order";
import { useAuth } from "@/lib/auth/AuthProvider";

type OrderForm = {
  titipersId: string;
  productId: string;
  quantity: string;
  shippingAddress: string;
};

const emptyOrderForm: OrderForm = {
  titipersId: "",
  productId: "",
  quantity: "1",
  shippingAddress: "",
};

type ListMode = "all" | "titipers" | "jastiper";

function OrdersContent() {
  const searchParams = useSearchParams();
  const { session, hasRole } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<OrderForm>(emptyOrderForm);
  const [creating, setCreating] = useState(false);
  const [scopeUserId, setScopeUserId] = useState("");
  const [listMode, setListMode] = useState<ListMode>("titipers");
  const [walletHint, setWalletHint] = useState("");

  const role = session.role;
  const roleLabel = role ?? "UNKNOWN";

  const defaultListMode = useMemo<ListMode>(() => {
    if (role === "ADMIN") return "all";
    if (role === "JASTIPER") return "jastiper";
    return "titipers";
  }, [role]);

  useEffect(() => {
    if (!form.titipersId && session.userId && role === "TITIPERS") {
      setForm((prev) => ({ ...prev, titipersId: session.userId as string }));
    }
    if (!scopeUserId && session.userId) {
      setScopeUserId(session.userId);
    }
  }, [form.titipersId, role, scopeUserId, session.userId]);

  useEffect(() => {
    setListMode(defaultListMode);
  }, [defaultListMode]);

  useEffect(() => {
    const productId = searchParams.get("productId");
    const quantity = searchParams.get("quantity");

    if (!productId && !quantity) return;

    setForm((prev) => ({
      ...prev,
      productId: productId ?? prev.productId,
      quantity: quantity ?? prev.quantity,
    }));
  }, [searchParams]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      let data: Order[] = [];

      if (listMode === "all") {
        data = await orderApi.list();
      } else if (listMode === "jastiper") {
        if (!scopeUserId.trim()) throw new Error("Jastiper userId is required to load orders.");
        data = await orderApi.listByJastiper(scopeUserId.trim());
      } else {
        if (!scopeUserId.trim()) throw new Error("Titipers userId is required to load orders.");
        data = await orderApi.listByTitipers(scopeUserId.trim());
      }

      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setOrders([]);
      setError(err instanceof Error ? err.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, [listMode, scopeUserId]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const canCreateOrder = hasRole("TITIPERS") || hasRole("ADMIN");
  const isTitipersRole = hasRole("TITIPERS");

  const handleCreateOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setWalletHint("");

    const quantity = Number(form.quantity);
    if (!form.titipersId.trim()) return setError("titipersId is required.");
    if (!form.productId.trim()) return setError("productId is required.");
    if (!Number.isInteger(quantity) || quantity <= 0) return setError("quantity must be positive.");
    if (!form.shippingAddress.trim()) return setError("shippingAddress is required.");

    setCreating(true);
    try {
      const created = await orderApi.create({
        titipersId: form.titipersId.trim(),
        productId: form.productId.trim(),
        quantity,
        shippingAddress: form.shippingAddress.trim(),
      });
      setSuccess(`Order created: ${created.id}`);
      setForm((prev) => ({ ...emptyOrderForm, titipersId: prev.titipersId }));
      await loadOrders();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create order.";
      setError(message);
      if (/saldo|balance|top-?up|insufficient/i.test(message)) {
        setWalletHint("Wallet balance issue detected. Open Wallet page to top-up, then retry checkout.");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">Orders</h1>
            <p className="text-sm text-gray-500">Role-aware order listing and checkout creation.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard" className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100">
              Dashboard
            </Link>
            <Link href="/inventory" className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100">
              Catalog
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[380px_1fr]">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Order Scope</h2>
          <p className="mb-3 text-xs text-gray-500">Current role: {roleLabel}</p>

          <label className="mb-1 block text-sm font-medium">List Mode</label>
          <select
            value={listMode}
            onChange={(event) => setListMode(event.target.value as ListMode)}
            className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            disabled={!hasRole("ADMIN")}
          >
            <option value="all">All Orders</option>
            <option value="titipers">Titipers Orders</option>
            <option value="jastiper">Jastiper Orders</option>
          </select>

          <label className="mb-1 block text-sm font-medium">Scoped User ID</label>
          <input
            value={scopeUserId}
            onChange={(event) => setScopeUserId(event.target.value)}
            placeholder="UUID user id"
            className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            disabled={listMode === "all"}
          />
          <button
            onClick={() => void loadOrders()}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white"
          >
            Refresh Orders
          </button>

          {canCreateOrder && (
            <>
              <hr className="my-5 border-gray-200" />
              <h3 className="mb-3 text-base font-semibold">Create Order</h3>
              <form onSubmit={handleCreateOrder} className="space-y-3">
                <input
                  value={form.titipersId}
                  onChange={(event) => setForm((prev) => ({ ...prev, titipersId: event.target.value }))}
                  placeholder="Titipers ID (UUID)"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  disabled={isTitipersRole}
                />
                <input
                  value={form.productId}
                  onChange={(event) => setForm((prev) => ({ ...prev, productId: event.target.value }))}
                  placeholder="Product ID (UUID)"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
                  placeholder="Quantity"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <textarea
                  value={form.shippingAddress}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, shippingAddress: event.target.value }))
                  }
                  placeholder="Shipping Address"
                  className="h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-60"
                >
                  {creating ? "Creating..." : "Create Order"}
                </button>
              </form>
            </>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Order List</h2>
            <p className="text-xs text-gray-500">Mode: {listMode}</p>
          </div>

          {error && <div className="mb-3 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}
          {success && (
            <div className="mb-3 rounded bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{success}</div>
          )}
          {walletHint && (
            <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {walletHint}{" "}
              <Link href="/wallet" className="font-medium underline">
                Open Wallet
              </Link>
            </div>
          )}

          {loading && <p className="text-sm text-gray-600">Loading orders...</p>}

          {!loading && orders.length === 0 && (
            <p className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              No orders found.
            </p>
          )}

          {!loading && orders.length > 0 && (
            <div className="space-y-3">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Order #{order.id.slice(0, 8)}</p>
                    <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    Product: {order.productId} | Qty: {order.quantity}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-gray-600">
                    Ship to: {order.shippingAddress}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Total: Rp {Number(order.totalPrice ?? 0).toLocaleString("id-ID")}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <AuthGuard requireAuth>
      <OrdersContent />
    </AuthGuard>
  );
}
