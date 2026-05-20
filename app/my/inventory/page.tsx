"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ProductImage } from "@/components/ui/product-image";
import { inventoryApi } from "@/lib/api";
import type { Product } from "@/lib/api/inventory";
import { useAuth } from "@/lib/auth/AuthProvider";

type ProductForm = {
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  stock: string;
  originCountry: string;
  purchaseDate: string;
};

const emptyForm: ProductForm = {
  name: "",
  description: "",
  imageUrl: "",
  price: "",
  stock: "",
  originCountry: "",
  purchaseDate: "",
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

function MyInventoryContent() {
  const { session } = useAuth();
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

  const currentUserId = session.userId?.trim() ?? "";
  const hasValidCurrentUserId = uuidPattern.test(currentUserId);
  const totalVisibleProducts = products.length;
  const lowStockCount = products.filter((product) => product.stock <= 3).length;

  const fetchMyProducts = useCallback(async () => {
    if (!hasValidCurrentUserId) {
      setProducts([]);
      setError("Sesi akun tidak valid. Login ulang lalu coba lagi.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await inventoryApi.listByJastiper(currentUserId, {
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
  }, [currentUserId, hasValidCurrentUserId, page, size]);

  useEffect(() => {
    if (hasValidCurrentUserId) {
      void fetchMyProducts();
    }
  }, [fetchMyProducts, hasValidCurrentUserId]);

  const resetForm = () => {
    setForm(emptyForm);
    setFormError("");
    setEditingId(null);
  };

  const validateForm = () => {
    if (!hasValidCurrentUserId) return "Sesi akun tidak valid. Login ulang terlebih dahulu.";
    if (!form.name.trim()) return "Nama produk wajib diisi.";
    if (!form.description.trim()) return "Deskripsi wajib diisi.";
    if (!form.originCountry.trim()) return "Negara asal wajib diisi.";
    if (!form.purchaseDate) return "Tanggal pembelian wajib diisi.";
    if (form.imageUrl.trim() && !isHttpUrl(form.imageUrl.trim())) {
      return "Image URL harus dimulai dengan http:// atau https://";
    }

    const price = Number(form.price);
    if (Number.isNaN(price) || price <= 0) return "Harga harus lebih dari 0.";

    const stock = Number(form.stock);
    if (!Number.isInteger(stock) || stock < 0) return "Stok minimal 0.";

    return "";
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    description: form.description.trim(),
    imageUrl: form.imageUrl.trim(),
    price: Number(form.price),
    stock: Number(form.stock),
    originCountry: form.originCountry.trim(),
    purchaseDate: form.purchaseDate,
    jastiperId: currentUserId,
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
      imageUrl: product.imageUrl ?? "",
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
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Katalog Penjual</p>
            <h1 className="text-3xl font-black text-slate-900">Katalog Saya</h1>
            <p className="mt-1 text-sm text-slate-500">Atur produk, stok, dan tampilan katalog tanpa field teknis yang tidak perlu.</p>
          </div>
          <button
            onClick={() => {
              setPage(0);
              void fetchMyProducts();
            }}
            className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Muat Ulang Katalog
          </button>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] bg-[#2563eb] p-5 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Produk tampil</p>
            <p className="mt-3 text-3xl font-black">{totalVisibleProducts}</p>
            <p className="mt-2 text-sm text-blue-100">Jumlah produk pada halaman aktif saat ini.</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Perlu perhatian</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{lowStockCount}</p>
            <p className="mt-2 text-sm text-slate-500">Produk dengan stok 3 item atau kurang.</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status akun</p>
            <p className="mt-3 text-lg font-bold text-slate-900">{session.email ?? "Jastiper aktif"}</p>
            <p className="mt-2 text-sm text-slate-500">
              {hasValidCurrentUserId ? "Katalog terhubung dan siap dikelola." : "Sesi belum lengkap. Login ulang diperlukan."}
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{editingId ? "Perbarui Produk" : "Tambah Produk Baru"}</h2>
              <p className="text-sm text-slate-500">Lengkapi informasi produk agar siap tampil di katalog publik.</p>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nama produk"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={form.originCountry}
              onChange={(e) => setForm((prev) => ({ ...prev, originCountry: e.target.value }))}
              placeholder="Negara asal"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={form.imageUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
              placeholder="Image URL (https://...)"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            />
            <input
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              placeholder="Harga"
              type="number"
              min="1"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={form.stock}
              onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
              placeholder="Stok"
              type="number"
              min="0"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={form.purchaseDate}
              onChange={(e) => setForm((prev) => ({ ...prev, purchaseDate: e.target.value }))}
              type="date"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Deskripsi produk"
              className="md:col-span-2 min-h-24 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />

            {formError && (
              <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="md:col-span-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Terbitkan Produk"}
              </button>
            </div>
          </form>
        </section>

        {loading && <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-sm text-slate-600">Memuat katalog...</div>}

        {!loading && error && (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Belum ada produk di katalogmu. Tambahkan produk pertama untuk mulai berjualan.
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <article key={product.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <ProductImage
                    src={product.imageUrl}
                    alt={product.name}
                    className="mb-3 aspect-[4/3] overflow-hidden rounded-2xl border border-slate-100 bg-slate-100"
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
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(product)}
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
                    <Link
                      href={`/products/${product.id}`}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Detail
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-[24px] border border-slate-200 bg-white p-3">
              <button
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={page === 0}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Page {page + 1}</span>
                <select
                  value={size}
                  onChange={(e) => {
                    setSize(Number(e.target.value));
                    setPage(0);
                  }}
                  className="rounded-xl border border-slate-300 px-2 py-1 text-xs"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                </select>
              </div>
              <button
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!hasNext}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
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

export default function MyInventoryPage() {
  return (
    <AuthGuard requireAuth roles={["JASTIPER"]}>
      <MyInventoryContent />
    </AuthGuard>
  );
}
