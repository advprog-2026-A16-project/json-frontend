"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Banner, StateCard } from "@/components/ui/feedback";
import { ProductImage } from "@/components/ui/product-image";
import { inventoryApi } from "@/lib/api";
import type { Product } from "@/lib/api/inventory";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const productId = params?.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderQty, setOrderQty] = useState("1");

  const { isAuthenticated, hasRole } = useAuth();
  const canCreateOrder = isAuthenticated && hasRole("TITIPERS");
  const toIdr = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);

  const fetchDetail = useCallback(async () => {
    if (!productId) return;

    setLoading(true);
    setError("");

    try {
      const data = await inventoryApi.detail(productId);
      setProduct(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch product detail.");
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const parsedOrderQty = Number(orderQty);
  const hasValidQuantity = Number.isInteger(parsedOrderQty) && parsedOrderQty > 0;

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Katalog</p>
            <h1 className="text-3xl font-black text-slate-900">Detail Produk</h1>
            <p className="text-sm text-slate-500">Periksa stok, asal barang, dan lanjutkan ke checkout saat sudah siap.</p>
          </div>
          <Link
            href="/inventory"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Kembali ke Katalog
          </Link>
        </div>

        {loading && <StateCard message="Memuat detail produk..." className="rounded-2xl bg-white" />}

        {!loading && error && <Banner tone="error">{error}</Banner>}

        {!loading && !error && !product && <StateCard message="Produk tidak ditemukan." className="rounded-2xl bg-white" />}

        {!loading && !error && product && (
          <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="border-b border-slate-200 bg-slate-50 p-6 lg:border-b-0 lg:border-r">
                <ProductImage
                  src={product.imageUrl}
                  alt={product.name}
                  className="aspect-[16/11] overflow-hidden rounded-[28px] border border-slate-200 bg-white"
                  imgClassName="h-full w-full object-cover"
                />
              </div>

              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {product.originCountry}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    Stok {product.stock}
                  </span>
                </div>

                <h2 className="mt-4 text-3xl font-black text-slate-900">{product.name}</h2>
                <p className="mt-2 text-base leading-7 text-slate-600">{product.description}</p>

                <div className="mt-6 rounded-3xl bg-[#2563eb] p-5 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Harga Titip</p>
                  <p className="mt-2 text-3xl font-black">{toIdr(Number(product.price))}</p>
                  <div className="mt-4 grid gap-3 text-sm text-blue-50 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-blue-100">Tanggal beli</p>
                      <p className="mt-1 font-semibold">{product.purchaseDate ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-blue-100">Ketersediaan</p>
                      <p className="mt-1 font-semibold">{product.stock > 0 ? "Siap dipesan" : "Stok habis"}</p>
                    </div>
                  </div>
                </div>

                {canCreateOrder ? (
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-lg font-bold text-slate-900">Lanjut ke Checkout</h3>
                    <p className="mt-1 text-sm text-slate-500">Pilih jumlah item, lalu lanjutkan ke halaman pesanan.</p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={orderQty}
                        onChange={(e) => setOrderQty(e.target.value)}
                        className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                      <Link
                        href={hasValidQuantity ? `/orders?productId=${product.id}&quantity=${parsedOrderQty}` : "/orders"}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                          hasValidQuantity ? "bg-[#2563eb] hover:bg-blue-700" : "pointer-events-none bg-slate-400"
                        }`}
                        aria-disabled={!hasValidQuantity}
                      >
                        Lanjut Checkout
                      </Link>
                    </div>
                    {!hasValidQuantity && <Banner tone="warning" className="mt-3">Jumlah item harus lebih dari nol.</Banner>}
                  </div>
                ) : (
                  <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                    Login sebagai Titipers untuk melanjutkan pembelian produk ini.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
