"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { inventoryApi } from "@/lib/api";
import type { Product } from "@/lib/api/inventory";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ProductImage } from "@/components/ui/product-image";

type SortField = "createdAt" | "updatedAt" | "name" | "price" | "stock" | "purchaseDate";
type SortDirection = "asc" | "desc";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(12);
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [direction, setDirection] = useState<SortDirection>("desc");

  const [hasNext, setHasNext] = useState(false);

  const { hasRole } = useAuth();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = { page, size, sortBy, direction };
      const data = keyword.trim()
        ? await inventoryApi.search(keyword.trim(), query)
        : await inventoryApi.list(query);

      const normalized = Array.isArray(data) ? data : [];
      setProducts(normalized);
      setHasNext(normalized.length === size);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke backend.");
      setProducts([]);
      setHasNext(false);
    } finally {
      setLoading(false);
    }
  }, [direction, keyword, page, size, sortBy]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const applySearch = () => {
    setPage(0);
    setKeyword(keywordInput.trim());
  };

  const clearSearch = () => {
    setKeywordInput("");
    setKeyword("");
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Katalog</p>
            <h1 className="text-3xl font-black text-slate-900">Jelajahi Produk Titipan</h1>
            <p className="text-sm text-slate-500">Temukan barang pilihan dari berbagai jastiper terpercaya.</p>
          </div>
          {(hasRole("JASTIPER") || hasRole("ADMIN")) && (
            <Link href="/my/inventory" className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Kelola Katalog Saya
            </Link>
          )}
        </div>

        <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-5">
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="Keyword nama/deskripsi"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2"
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="createdAt">Terbaru</option>
              <option value="updatedAt">Baru diperbarui</option>
              <option value="name">Nama</option>
              <option value="price">Harga</option>
              <option value="stock">Stok</option>
              <option value="purchaseDate">Tanggal beli</option>
            </select>

            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as SortDirection)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="desc">Menurun</option>
              <option value="asc">Menaik</option>
            </select>

            <select
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(0);
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value={6}>6 per halaman</option>
              <option value={12}>12 per halaman</option>
              <option value={20}>20 per halaman</option>
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={applySearch} className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white">
              Cari
            </button>
            <button onClick={clearSearch} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              Reset
            </button>
            {keyword && <span className="self-center text-xs text-gray-500">Kata kunci aktif: {keyword}</span>}
          </div>
        </section>

        {loading && (
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-sm text-slate-600">Memuat produk...</div>
          )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-sm text-slate-600">Belum ada produk yang cocok dengan pencarianmu.</div>
        )}

        {!loading && !error && products.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <article key={product.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <ProductImage
                    src={product.imageUrl}
                    alt={product.name}
                    className="mb-3 aspect-[4/3] overflow-hidden rounded-2xl border border-gray-100 bg-gray-100"
                  />
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h2 className="line-clamp-2 text-base font-semibold">{product.name}</h2>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      Stok {product.stock}
                    </span>
                  </div>

                  <p className="mb-4 line-clamp-3 text-sm text-gray-600">{product.description}</p>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <p className="text-sm font-semibold">Rp {Number(product.price).toLocaleString("id-ID")}</p>
                    <p className="text-xs text-gray-500">{product.originCountry}</p>
                  </div>

                  <Link
                    href={`/products/${product.id}`}
                    className="mt-3 inline-block rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Lihat Detail
                  </Link>
                </article>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-[24px] border border-slate-200 bg-white p-3">
              <button
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={page === 0}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <p className="text-sm text-gray-600">Halaman {page + 1}</p>
              <button
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!hasNext}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                Berikutnya
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
