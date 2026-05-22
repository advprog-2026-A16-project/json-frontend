"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Banner, StateCard } from "@/components/ui/feedback";
import { ProductImage } from "@/components/ui/product-image";
import { adminApi } from "@/lib/api";
import type { Product, ProductPayload } from "@/lib/api/inventory";

type ProductForm = {
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  stock: string;
  originCountry: string;
  purchaseDate: string;
  jastiperId: string;
};

const toForm = (product: Product): ProductForm => ({
  name: product.name ?? "",
  description: product.description ?? "",
  imageUrl: product.imageUrl ?? "",
  price: String(product.price ?? ""),
  stock: String(product.stock ?? ""),
  originCountry: product.originCountry ?? "",
  purchaseDate: product.purchaseDate?.slice(0, 10) ?? "",
  jastiperId: product.jastiperId ?? "",
});

const isHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

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

  const productCountLabel = useMemo(() => `${products.length} produk aktif`, [products.length]);

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
      imageUrl: form.imageUrl.trim(),
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
    if (payload.imageUrl?.trim() && !isHttpUrl(payload.imageUrl.trim())) {
      setError("Image URL must start with http:// or https://");
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
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Admin</p>
            <h1 className="text-2xl font-black text-slate-900">Moderasi Produk</h1>
            <p className="text-sm text-slate-500">Tinjau katalog global dan ubah data produk yang perlu diperbaiki.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/users" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Pengguna
            </Link>
            <Link href="/admin/kyc" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              KYC
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <section className="mb-6 rounded-[28px] bg-[#2563eb] p-5 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Ringkasan katalog</p>
          <p className="mt-3 text-3xl font-black">{productCountLabel}</p>
          <p className="mt-2 text-sm text-blue-100">Gunakan panel ini untuk moderasi produk bermasalah atau ilegal.</p>
        </section>

        {error && <Banner tone="error" className="mb-4">{error}</Banner>}

        {editing && form && (
          <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xl font-bold text-slate-900">Edit Produk</h2>
            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                placeholder="Nama"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={form.originCountry}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, originCountry: e.target.value } : prev))}
                placeholder="Negara asal"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={form.imageUrl}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, imageUrl: e.target.value } : prev))}
                placeholder="Image URL (https://...)"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2"
              />
              <input
                value={form.price}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, price: e.target.value } : prev))}
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Harga"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={form.stock}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, stock: e.target.value } : prev))}
                type="number"
                min="0"
                placeholder="Stok"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={form.purchaseDate}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, purchaseDate: e.target.value } : prev))}
                type="date"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={form.jastiperId}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, jastiperId: e.target.value } : prev))}
                placeholder="ID Jastiper"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                placeholder="Deskripsi"
                className="min-h-24 rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2"
              />
              <div className="md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
                <button type="button" onClick={cancelEdit} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                  Batal
                </button>
              </div>
            </form>
          </section>
        )}

        {loading && <StateCard message="Memuat produk..." className="rounded-2xl bg-white" />}

        {!loading && products.length === 0 && !error && (
          <StateCard message="Tidak ada produk yang ditemukan." className="rounded-2xl bg-white" />
        )}

        {!loading && products.length > 0 && (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <ProductImage
                  src={product.imageUrl}
                  alt={product.name}
                  className="mb-3 aspect-[4/3] overflow-hidden rounded-2xl border border-gray-100 bg-gray-100"
                />
                <h3 className="font-semibold">{product.name}</h3>
                <p className="mt-1 line-clamp-3 text-sm text-gray-600">{product.description}</p>
                <p className="mt-2 text-sm">Stok: {product.stock}</p>
                <p className="text-sm">Harga: Rp {Number(product.price).toLocaleString("id-ID")}</p>
                <p className="text-xs text-gray-500">{product.originCountry}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(product)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(product.id)}
                    className="rounded-xl border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Hapus
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
