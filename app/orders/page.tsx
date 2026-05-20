"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ProductImage } from "@/components/ui/product-image";
import { Banner, StateCard } from "@/components/ui/feedback";
import { orderApi, type Order } from "@/lib/api/order";
import { inventoryApi, type Product } from "@/lib/api/inventory";
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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toIdr = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const orderStatusLabel: Record<string, string> = {
  PAID: "Dibayar",
  PURCHASED: "Dibelikan",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductLoading, setSelectedProductLoading] = useState(false);
  const [selectedProductError, setSelectedProductError] = useState("");

  const isAdmin = hasRole("ADMIN");
  const isTitipers = hasRole("TITIPERS");
  const isJastiper = hasRole("JASTIPER");
  const canReadOrders = Boolean(session.token);
  const currentUserId = session.userId?.trim() ?? "";
  const hasValidCurrentUserId = UUID_PATTERN.test(currentUserId);
  const parsedQuantity = Number(form.quantity);
  const hasValidQuantity = Number.isInteger(parsedQuantity) && parsedQuantity > 0;

  useEffect(() => {
    if (!form.titipersId && isTitipers && hasValidCurrentUserId) {
      setForm((prev) => ({ ...prev, titipersId: currentUserId }));
    }
    if (!scopeUserId && hasValidCurrentUserId) {
      setScopeUserId(currentUserId);
    }
  }, [currentUserId, form.titipersId, hasValidCurrentUserId, isTitipers, scopeUserId]);

  useEffect(() => {
    setListMode(isAdmin ? "all" : "titipers");
  }, [isAdmin]);

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

  useEffect(() => {
    const productId = form.productId.trim();

    if (!productId) {
      setSelectedProduct(null);
      setSelectedProductError("");
      setSelectedProductLoading(false);
      return;
    }

    let active = true;
    setSelectedProductLoading(true);
    setSelectedProductError("");

    void (async () => {
      try {
        const product = await inventoryApi.detail(productId);
        if (!active) return;
        setSelectedProduct(product);
      } catch (err) {
        if (!active) return;
        setSelectedProduct(null);
        setSelectedProductError(err instanceof Error ? err.message : "Produk checkout tidak dapat dimuat.");
      } finally {
        if (!active) return;
        setSelectedProductLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [form.productId]);

  const loadOrders = useCallback(async () => {
    if (!canReadOrders) {
      setOrders([]);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      let data: Order[] = [];

      if (!isAdmin) {
        if (!hasValidCurrentUserId) {
          setOrders([]);
          setError("Sesi akun tidak valid. Login ulang lalu coba lagi.");
          return;
        }

        if (isTitipers) {
          data = await orderApi.listByTitipers(currentUserId);
        } else if (isJastiper) {
          data = await orderApi.listByJastiper(currentUserId);
        } else {
          setOrders([]);
          setError("Akun ini tidak memiliki akses ke daftar pesanan.");
          return;
        }
      } else if (listMode === "all") {
        data = await orderApi.list();
      } else if (listMode === "jastiper") {
        const scoped = scopeUserId.trim();
        if (!UUID_PATTERN.test(scoped)) {
          setOrders([]);
          setError("ID Jastiper tidak valid.");
          return;
        }
        data = await orderApi.listByJastiper(scoped);
      } else {
        const scoped = scopeUserId.trim();
        if (!UUID_PATTERN.test(scoped)) {
          setOrders([]);
          setError("ID Titipers tidak valid.");
          return;
        }
        data = await orderApi.listByTitipers(scoped);
      }

      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setOrders([]);
      setError(err instanceof Error ? err.message : "Gagal memuat daftar order.");
    } finally {
      setLoading(false);
    }
  }, [canReadOrders, currentUserId, hasValidCurrentUserId, isAdmin, isJastiper, isTitipers, listMode, scopeUserId]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const canCreateOrder = isTitipers;
  const hasSelectedProduct = Boolean(form.productId.trim()) && Boolean(selectedProduct);
  const canCreateWithCurrentSession = canCreateOrder && hasValidCurrentUserId && hasSelectedProduct && !selectedProductLoading;

  const handleCreateOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const quantity = Number(form.quantity);
    if (!hasValidCurrentUserId) return setError("Sesi akun tidak valid. Login ulang lalu coba lagi.");
    if (!form.productId.trim()) return setError("Pilih produk terlebih dahulu dari katalog.");
    if (!selectedProduct) return setError("Produk checkout belum siap. Muat ulang halaman produk lalu coba lagi.");
    if (!Number.isInteger(quantity) || quantity <= 0) return setError("Jumlah item harus lebih dari nol.");
    if (!form.shippingAddress.trim()) return setError("Alamat pengiriman wajib diisi.");

    setCreating(true);
    try {
      const created = await orderApi.create({
        titipersId: currentUserId,
        productId: form.productId.trim(),
        quantity,
        shippingAddress: form.shippingAddress.trim(),
      });
      setSuccess(`Pesanan berhasil dibuat dengan kode #${created.id.slice(0, 8)}.`);
      setForm((prev) => ({ ...emptyOrderForm, titipersId: currentUserId || prev.titipersId }));
      setSelectedProduct(null);
      await loadOrders();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Pesanan gagal dibuat.";
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[400px_1fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-1 text-3xl font-black text-slate-900">Pesanan</h1>
          <p className="mb-5 text-sm text-slate-500">Kelola checkout dan lihat perjalanan pesananmu dalam satu tempat.</p>

          {isAdmin && (
            <>
              <label className="mb-1 block text-sm font-medium">List Mode</label>
              <select
                value={listMode}
                onChange={(event) => setListMode(event.target.value as ListMode)}
                className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">Semua Pesanan</option>
                <option value="titipers">Pesanan Titipers</option>
                <option value="jastiper">Pesanan Jastiper</option>
              </select>

              {listMode !== "all" && (
                <>
                  <label className="mb-1 block text-sm font-medium text-slate-700">ID Pengguna</label>
                  <input
                    value={scopeUserId}
                    onChange={(event) => setScopeUserId(event.target.value)}
                    placeholder="Masukkan ID pengguna"
                    className="mb-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </>
              )}
            </>
          )}

          <button onClick={() => void loadOrders()} className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Muat Ulang Pesanan
          </button>

          {canCreateOrder && (
            <>
              <div className="my-6 h-px bg-slate-200" />
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Checkout</h2>
                  <p className="text-sm text-slate-500">Mulai dari halaman detail produk agar item checkout terisi otomatis.</p>
                </div>
                <Link
                  href="/inventory"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Lihat Katalog
                </Link>
              </div>

              {selectedProductLoading && <StateCard message="Menyiapkan produk checkout..." className="mb-4 rounded-2xl bg-slate-50" />}
              {selectedProductError && <Banner tone="warning" className="mb-4">{selectedProductError}</Banner>}

              {selectedProduct ? (
                <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex gap-4">
                    <ProductImage
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white"
                      imgClassName="h-full w-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Produk dipilih</p>
                      <h3 className="mt-1 line-clamp-2 text-base font-bold text-slate-900">{selectedProduct.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{selectedProduct.originCountry}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {toIdr(Number(selectedProduct.price))}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          Stok {selectedProduct.stock}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Belum ada produk yang dipilih. Buka detail produk lalu tekan tombol checkout untuk melanjutkan.
                </div>
              )}

              <form onSubmit={handleCreateOrder} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm text-slate-600">
                    <span className="mb-1 block font-medium text-slate-800">Jumlah</span>
                    <input
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
                      placeholder="1"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-slate-600">
                    <span className="mb-1 block font-medium text-slate-800">Estimasi total</span>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                      {selectedProduct && hasValidQuantity
                        ? toIdr(Number(selectedProduct.price) * parsedQuantity)
                        : "Pilih jumlah yang valid"}
                    </div>
                  </label>
                </div>
                <label className="block text-sm text-slate-600">
                  <span className="mb-1 block font-medium text-slate-800">Alamat pengiriman</span>
                  <textarea
                    value={form.shippingAddress}
                    onChange={(event) => setForm((prev) => ({ ...prev, shippingAddress: event.target.value }))}
                    placeholder="Masukkan alamat lengkap penerima"
                    className="h-28 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  disabled={creating || !canCreateWithCurrentSession}
                  className="w-full rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {creating ? "Memproses Checkout..." : "Buat Pesanan"}
                </button>
                {!canCreateWithCurrentSession && (
                  <p className="text-xs text-amber-700">Checkout aktif setelah produk dipilih dan sesi akun tersedia.</p>
                )}
              </form>
            </>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Riwayat Pesanan</h2>
              <p className="text-sm text-slate-500">Pantau status pesanan yang sedang berjalan maupun yang sudah selesai.</p>
            </div>
            {isAdmin ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Mode {listMode}</p> : null}
          </div>

          {!canReadOrders && (
            <Banner tone="warning" className="mb-3">
              Sesi belum tersedia. Login untuk memuat order.
            </Banner>
          )}

          {error && <Banner tone="error" className="mb-3">{error}</Banner>}
          {success && <Banner tone="success" className="mb-3">{success}</Banner>}

          {loading && <StateCard message="Memuat daftar pesanan..." className="rounded-2xl bg-slate-50" />}

          {!loading && orders.length === 0 && <StateCard message="Belum ada pesanan untuk ditampilkan." className="rounded-2xl bg-slate-50" />}

          {!loading && orders.length > 0 && (
            <div className="space-y-3">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Pesanan</p>
                      <p className="mt-1 text-base font-bold text-slate-900">#{order.id.slice(0, 8)}</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {orderStatusLabel[order.status] ?? order.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Jumlah</p>
                      <p className="mt-1 font-semibold text-slate-900">{order.quantity} item</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
                      <p className="mt-1 font-semibold text-slate-900">{toIdr(Number(order.totalPrice ?? 0))}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Dibuat</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString("id-ID") : "-"}
                      </p>
                    </div>
                  </div>
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
