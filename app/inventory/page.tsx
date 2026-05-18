"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { inventoryApi } from "@/lib/api";
import type { Product } from "@/lib/api/inventory";
import { useAuth } from "@/lib/auth/AuthProvider";

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

  const { isAuthenticated, session, hasRole } = useAuth();

  const fetchProducts = async () => {
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
  };

  useEffect(() => {
    fetchProducts();
  }, [page, size, sortBy, direction, keyword]);

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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">Catalog Products</h1>
            <p className="text-sm text-gray-500">Public browse + server-side search/sort/pagination.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100">
              Home
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100"
            >
              Dashboard
            </Link>
            {(hasRole("JASTIPER") || hasRole("ADMIN")) && (
              <Link href="/my/inventory" className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white">
                My Inventory
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-5">
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="Keyword nama/deskripsi"
              className="md:col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="createdAt">Newest</option>
              <option value="updatedAt">Updated</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="stock">Stock</option>
              <option value="purchaseDate">Purchase Date</option>
            </select>

            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as SortDirection)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>

            <select
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(0);
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value={6}>6 / page</option>
              <option value={12}>12 / page</option>
              <option value={20}>20 / page</option>
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={applySearch} className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white">
              Apply Search
            </button>
            <button onClick={clearSearch} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              Reset
            </button>
            {keyword && <span className="self-center text-xs text-gray-500">active keyword: {keyword}</span>}
            {isAuthenticated && (
              <span className="self-center text-xs text-gray-500">role: {session.role ?? "UNKNOWN"}</span>
            )}
          </div>
        </section>

        {loading && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading products...</div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
            No products found.
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <article key={product.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h2 className="line-clamp-2 text-base font-semibold">{product.name}</h2>
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      Stock: {product.stock}
                    </span>
                  </div>

                  <p className="mb-4 line-clamp-3 text-sm text-gray-600">{product.description}</p>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <p className="text-sm font-semibold">Rp {Number(product.price).toLocaleString("id-ID")}</p>
                    <p className="text-xs text-gray-500">{product.originCountry}</p>
                  </div>

                  <Link
                    href={`/products/${product.id}`}
                    className="mt-3 inline-block rounded-md border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100"
                  >
                    View Detail
                  </Link>
                </article>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
              <button
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={page === 0}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <p className="text-sm text-gray-600">Page {page + 1}</p>
              <button
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!hasNext}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
