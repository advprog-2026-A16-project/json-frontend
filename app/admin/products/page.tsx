"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { adminApi } from "@/lib/api";
import type { Product, ProductPayload } from "@/lib/api/inventory";

type ProductForm = {
  name: string;
  description: string;
  price: string;
  stock: string;
  originCountry: string;
  purchaseDate: string;
  jastiperId: string;
};

const toForm = (product: Product): ProductForm => ({
  name: product.name ?? "",
  description: product.description ?? "",
  price: String(product.price ?? ""),
  stock: String(product.stock ?? ""),
  originCountry: product.originCountry ?? "",
  purchaseDate: product.purchaseDate?.slice(0, 10) ?? "",
  jastiperId: product.jastiperId ?? "",
});

function AdminProductsContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.listProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const productCountLabel = useMemo(() => `${products.length} product(s)`, [products.length]);

  const startEdit = (product: Product) => {
    setEditing(product);
    setForm(toForm(product));
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await adminApi.deleteProduct(id);
      await loadProducts();
      if (editing?.id === id) {
        cancelEdit();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product.");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || !form) return;

    const payload: ProductPayload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      originCountry: form.originCountry.trim(),
      purchaseDate: form.purchaseDate,
      jastiperId: form.jastiperId.trim(),
    };

    if (!payload.name || !payload.description || !payload.originCountry || !payload.purchaseDate || !payload.jastiperId) {
      setError("All fields are required.");
      return;
    }

    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      setError("Price must be greater than zero.");
      return;
    }

    if (!Number.isInteger(payload.stock) || payload.stock < 0) {
      setError("Stock must be a non-negative integer.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await adminApi.updateProduct(editing.id, payload);
      await loadProducts();
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">Admin Products</h1>
            <p className="text-sm text-gray-500">Global inventory moderation.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/users" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              Users
            </Link>
            <Link href="/admin/kyc" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              KYC
            </Link>
            <Link href="/dashboard" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
          {productCountLabel}
        </section>

        {error && (
          <section className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</section>
        )}

        {editing && form && (
          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Edit Product</h2>
            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                placeholder="Name"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={form.originCountry}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, originCountry: e.target.value } : prev))}
                placeholder="Origin country"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={form.price}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, price: e.target.value } : prev))}
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Price"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={form.stock}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, stock: e.target.value } : prev))}
                type="number"
                min="0"
                placeholder="Stock"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={form.purchaseDate}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, purchaseDate: e.target.value } : prev))}
                type="date"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={form.jastiperId}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, jastiperId: e.target.value } : prev))}
                placeholder="Jastiper ID"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                placeholder="Description"
                className="min-h-24 rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2"
              />
              <div className="md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60"
                >
                  {submitting ? "Saving..." : "Save"}
                </button>
                <button type="button" onClick={cancelEdit} className="rounded-md border border-gray-300 px-4 py-2 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {loading && <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm">Loading...</section>}

        {!loading && products.length === 0 && !error && (
          <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            No products found.
          </section>
        )}

        {!loading && products.length > 0 && (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="font-semibold">{product.name}</h3>
                <p className="mt-1 line-clamp-3 text-sm text-gray-600">{product.description}</p>
                <p className="mt-2 text-sm">Stock: {product.stock}</p>
                <p className="text-sm">Price: Rp {Number(product.price).toLocaleString("id-ID")}</p>
                <p className="text-xs text-gray-500">{product.originCountry}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(product)}
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
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <AuthGuard requireAuth roles={["ADMIN"]}>
      <AdminProductsContent />
    </AuthGuard>
  );
}
