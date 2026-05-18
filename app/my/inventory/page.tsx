"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { inventoryApi } from "@/lib/api";
import type { Product } from "@/lib/api/inventory";

type ProductForm = {
  name: string;
  description: string;
  price: string;
  stock: string;
  originCountry: string;
  purchaseDate: string;
};

const emptyForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  stock: "",
  originCountry: "",
  purchaseDate: "",
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function MyInventoryContent() {
  const [jastiperId, setJastiperId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [formError, setFormError] = useState("");

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [hasNext, setHasNext] = useState(false);

  const normalizedJastiperId = jastiperId.trim();
  const isJastiperIdValid = uuidPattern.test(normalizedJastiperId);

  const fetchMyProducts = useCallback(async () => {
    if (!isJastiperIdValid) {
      setProducts([]);
      setError("Input Jastiper ID UUID valid terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await inventoryApi.listByJastiper(normalizedJastiperId, {
        page,
        size,
        sortBy: "createdAt",
        direction: "desc",
      });
      const normalized = Array.isArray(data) ? data : [];
      setProducts(normalized);
      setHasNext(normalized.length === size);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil produk jastiper.");
      setProducts([]);
      setHasNext(false);
    } finally {
      setLoading(false);
    }
  }, [isJastiperIdValid, normalizedJastiperId, page, size]);

  useEffect(() => {
    if (isJastiperIdValid) {
      void fetchMyProducts();
    }
  }, [fetchMyProducts, isJastiperIdValid]);

  const resetForm = () => {
    setForm(emptyForm);
    setFormError("");
    setEditingId(null);
  };

  const validateForm = () => {
    if (!isJastiperIdValid) return "Jastiper ID harus UUID valid.";
    if (!form.name.trim()) return "Nama produk wajib diisi.";
    if (!form.description.trim()) return "Deskripsi wajib diisi.";
    if (!form.originCountry.trim()) return "Negara asal wajib diisi.";
    if (!form.purchaseDate) return "Tanggal pembelian wajib diisi.";

    const price = Number(form.price);
    if (Number.isNaN(price) || price <= 0) return "Harga harus lebih dari 0.";

    const stock = Number(form.stock);
    if (!Number.isInteger(stock) || stock < 0) return "Stok minimal 0.";

    return "";
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    description: form.description.trim(),
    price: Number(form.price),
    stock: Number(form.stock),
    originCountry: form.originCountry.trim(),
    purchaseDate: form.purchaseDate,
    jastiperId: normalizedJastiperId,
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      if (editingId) {
        await inventoryApi.update(editingId, buildPayload());
      } else {
        await inventoryApi.create(buildPayload());
      }

      resetForm();
      await fetchMyProducts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan produk.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name ?? "",
      description: product.description ?? "",
      price: String(product.price ?? ""),
      stock: String(product.stock ?? ""),
      originCountry: product.originCountry ?? "",
      purchaseDate: product.purchaseDate ? product.purchaseDate.slice(0, 10) : "",
    });
    setFormError("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus produk ini?")) return;

    try {
      await inventoryApi.delete(id);
      await fetchMyProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus produk.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">My Inventory Manager</h1>
            <p className="text-sm text-gray-500">Jastiper/Admin product management view</p>
          </div>
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

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-medium">Jastiper ID (UUID)</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={jastiperId}
              onChange={(e) => setJastiperId(e.target.value)}
              placeholder="paste jastiper UUID"
              className="w-full max-w-xl rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              onClick={() => {
                setPage(0);
                fetchMyProducts();
              }}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white"
            >
              Load Products
            </button>
          </div>
          {!isJastiperIdValid && jastiperId && (
            <p className="mt-2 text-xs text-red-600">UUID format invalid.</p>
          )}
        </section>

        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">{editingId ? "Edit Product" : "Add Product"}</h2>

          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nama produk"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={form.originCountry}
              onChange={(e) => setForm((prev) => ({ ...prev, originCountry: e.target.value }))}
              placeholder="Negara asal"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              placeholder="Harga"
              type="number"
              min="1"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={form.stock}
              onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
              placeholder="Stok"
              type="number"
              min="0"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={form.purchaseDate}
              onChange={(e) => setForm((prev) => ({ ...prev, purchaseDate: e.target.value }))}
              type="date"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              jastiperId source: {jastiperId || "(empty)"}
            </div>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Deskripsi produk"
              className="md:col-span-2 min-h-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />

            {formError && (
              <div className="md:col-span-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="md:col-span-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {submitting ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Produk"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm"
                >
                  Batal Edit
                </button>
              )}
            </div>
          </form>
        </section>

        {loading && <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm">Loading...</div>}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
            No products for this jastiper id.
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
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(product)}
                      className="rounded-md border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(product.id)}
                      className="rounded-md border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                    <Link
                      href={`/products/${product.id}`}
                      className="rounded-md border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100"
                    >
                      Detail
                    </Link>
                  </div>
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
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Page {page + 1}</span>
                <select
                  value={size}
                  onChange={(e) => {
                    setSize(Number(e.target.value));
                    setPage(0);
                  }}
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                </select>
              </div>
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

export default function MyInventoryPage() {
  return (
    <AuthGuard requireAuth roles={["JASTIPER", "ADMIN"]} redirectTo="/dashboard">
      <MyInventoryContent />
    </AuthGuard>
  );
}
