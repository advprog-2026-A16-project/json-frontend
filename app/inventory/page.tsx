"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  originCountry: string;
  purchaseDate?: string;
  jastiperId?: string;
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  stock: string;
  originCountry: string;
  purchaseDate: string;
  jastiperId: string;
};

const emptyForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  stock: "",
  originCountry: "",
  purchaseDate: "",
  jastiperId: "",
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem("token")));
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const { response, data } = await apiFetch("/api/products");
      if (!response.ok) {
        setError(`Gagal mengambil data produk (${response.status}).`);
        setProducts([]);
      } else {
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch {
      setError("Tidak dapat terhubung ke backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return products;
    }
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(keyword) ||
        product.description.toLowerCase().includes(keyword),
    );
  }, [products, search]);

  const resetForm = () => {
    setForm(emptyForm);
    setFormError("");
    setEditingId(null);
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Nama produk wajib diisi.";
    if (!form.description.trim()) return "Deskripsi wajib diisi.";
    if (!form.originCountry.trim()) return "Negara asal wajib diisi.";
    if (!form.purchaseDate) return "Tanggal pembelian wajib diisi.";
    if (!form.jastiperId.trim()) return "Jastiper ID wajib diisi.";
    if (!uuidPattern.test(form.jastiperId.trim())) {
      return "Format Jastiper ID harus UUID valid.";
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
    price: Number(form.price),
    stock: Number(form.stock),
    originCountry: form.originCountry.trim(),
    purchaseDate: form.purchaseDate,
    jastiperId: form.jastiperId.trim(),
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
    const endpoint = editingId ? `/api/products/${editingId}` : "/api/products";
    const method = editingId ? "PUT" : "POST";

    try {
      const { response, data } = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(buildPayload()),
      });

      if (!response.ok) {
        const message =
          typeof data === "object" && data !== null && "message" in data
            ? String((data as { message?: unknown }).message ?? "")
            : "";
        setFormError(message || `Gagal menyimpan produk (${response.status}).`);
      } else {
        resetForm();
        await fetchProducts();
      }
    } catch {
      setFormError("Terjadi error saat menyimpan produk.");
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
      jastiperId: product.jastiperId ?? "",
    });
    setFormError("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus produk ini?")) return;
    try {
      const { response, data } = await apiFetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setError(data?.message ?? "Gagal menghapus produk.");
      } else {
        await fetchProducts();
      }
    } catch {
      setError("Terjadi error saat menghapus produk.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">JSON Inventory</h1>
            <p className="text-sm text-gray-500">
              {isLoggedIn
                ? "Mode Jastiper: CRUD aktif"
                : "Mode guest: read-only"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk berdasarkan nama/deskripsi..."
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none ring-blue-500 focus:ring-2"
          />
        </div>

        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">
            {editingId ? "Edit Produk" : "Tambah Produk"}
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Data minimal: nama, deskripsi, harga, stok, negara asal, tanggal pembelian, jastiper
            ID.
          </p>

          {!isLoggedIn ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              Fitur pengelolaan produk dinonaktifkan di mode guest.
            </div>
          ) : (
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
              <input
                value={form.jastiperId}
                onChange={(e) => setForm((prev) => ({ ...prev, jastiperId: e.target.value }))}
                placeholder="Jastiper ID (UUID)"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
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
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting
                    ? "Menyimpan..."
                    : editingId
                      ? "Simpan Perubahan"
                      : "Tambah Produk"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    Batal Edit
                  </button>
                )}
              </div>
            </form>
          )}
        </section>

        {loading && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
            Memuat data produk dari backend...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
            Tidak ada produk untuk ditampilkan.
          </div>
        )}

        {!loading && !error && filteredProducts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h2 className="line-clamp-2 text-base font-semibold">{product.name}</h2>
                  <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                    Stok: {product.stock}
                  </span>
                </div>
                <p className="mb-4 line-clamp-3 text-sm text-gray-600">{product.description}</p>
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <p className="text-sm font-semibold">
                    Rp {Number(product.price).toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-gray-500">{product.originCountry}</p>
                </div>
                {isLoggedIn && (
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
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
