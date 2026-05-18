"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { inventoryApi } from "@/lib/api";
import type { Product } from "@/lib/api/inventory";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const productId = params?.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reserveQty, setReserveQty] = useState("1");
  const [reserveMessage, setReserveMessage] = useState("");
  const [isReserving, setIsReserving] = useState(false);

  const { isAuthenticated } = useAuth();

  const fetchDetail = async () => {
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
  };

  useEffect(() => {
    fetchDetail();
  }, [productId]);

  const handleReserve = async () => {
    if (!productId) return;

    const qty = Number(reserveQty);
    if (!Number.isInteger(qty) || qty <= 0) {
      setReserveMessage("Quantity must be a positive integer.");
      return;
    }

    setReserveMessage("");
    setIsReserving(true);

    try {
      await inventoryApi.reserve(productId, qty);
      setReserveMessage("Stock reserved successfully (event-driven outbox flow triggered).");
      await fetchDetail();
    } catch (err) {
      setReserveMessage(err instanceof Error ? err.message : "Failed to reserve stock.");
    } finally {
      setIsReserving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold">Product Detail</h1>
          <div className="flex gap-2">
            <Link href="/inventory" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              Catalog
            </Link>
            <Link href="/dashboard" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        {loading && <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm">Loading...</div>}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && !product && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">Product not found.</div>
        )}

        {!loading && !error && product && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">{product.name}</h2>
            <p className="mt-2 text-sm text-gray-600">{product.description}</p>

            <div className="mt-4 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
              <p>
                <span className="font-semibold">Price:</span> Rp {Number(product.price).toLocaleString("id-ID")}
              </p>
              <p>
                <span className="font-semibold">Stock:</span> {product.stock}
              </p>
              <p>
                <span className="font-semibold">Origin:</span> {product.originCountry}
              </p>
              <p>
                <span className="font-semibold">Purchase Date:</span> {product.purchaseDate ?? "-"}
              </p>
              <p className="md:col-span-2 break-all text-xs text-gray-500">Product ID: {product.id}</p>
            </div>

            {isAuthenticated ? (
              <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-2 text-sm font-semibold">Reserve Stock (Event-Driven Checkout Path)</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={reserveQty}
                    onChange={(e) => setReserveQty(e.target.value)}
                    className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleReserve}
                    disabled={isReserving}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    {isReserving ? "Reserving..." : "Reserve"}
                  </button>
                </div>
                {reserveMessage && <p className="mt-2 text-sm text-gray-700">{reserveMessage}</p>}
              </div>
            ) : (
              <p className="mt-6 text-sm text-amber-700">Login required to reserve stock.</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
