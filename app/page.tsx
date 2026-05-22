"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductImage } from "@/components/ui/product-image";
import { inventoryApi, type Product } from "@/lib/api/inventory";

const categories = ["Camilan Jepang", "Kecantikan Korea", "Fashion Eropa", "Elektronik Amerika"];

const toIdr = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchProducts = async () => {
      try {
        const data = await inventoryApi.list({ page: 0, size: 12, sortBy: "createdAt", direction: "desc" });
        if (!mounted) return;
        setProducts(Array.isArray(data) ? data : []);
      } catch {
        if (!mounted) return;
        setProducts([]);
      } finally {
        if (!mounted) return;
        setLoadingProducts(false);
      }
    };

    fetchProducts();

    return () => {
      mounted = false;
    };
  }, []);

  const featuredProducts = useMemo(() => products.slice(0, 8), [products]);

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <section className="mx-auto w-full max-w-7xl px-6 pt-8">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-8 px-8 py-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="mb-3 inline-flex rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
                Jastip Marketplace
              </p>

              <h1 className="text-4xl font-black leading-tight text-slate-900 md:text-6xl">
                Titip Barang Lintas Negara
                <span className="block text-[#2563eb]">dalam Satu Platform</span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-slate-600">
                Cari produk dari jastiper terpercaya, buat order, lalu pantau status pesanan dari satu aplikasi.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/inventory"
                  className="rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Jelajahi Produk
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Buat Akun
                </Link>
              </div>
            </div>

            <div className="flex items-start justify-center lg:justify-end">
              <Image
                src="/logo.png"
                alt="JSON Market"
                width={560}
                height={360}
                className="h-auto w-full max-w-md object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-8">
        <h2 className="mb-4 text-4xl font-black text-slate-900">Kategori Pilihan</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category}
              href="/inventory"
              className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-lg font-semibold text-slate-800 shadow-sm hover:border-blue-300 hover:text-blue-700"
            >
              {category}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-10">
        <div className="rounded-3xl bg-[#2563eb] px-8 py-8 text-white">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-3xl font-black">Featured Products</h2>
            <Link href="/inventory" className="rounded-lg border border-white/40 px-4 py-2 text-sm font-semibold hover:bg-white/10">
              Semua Produk
            </Link>
          </div>

          {!loadingProducts && featuredProducts.length === 0 && (
            <div className="rounded-2xl bg-white p-6 text-sm font-semibold text-slate-700">Belum ada produk terbaru yang tampil.</div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((item) => (
              <article key={item.id} className="rounded-2xl bg-white p-4 text-slate-900 shadow-sm">
                <ProductImage
                  src={item.imageUrl}
                  alt={item.name}
                  className="aspect-[16/10] overflow-hidden rounded-xl border border-slate-100 bg-slate-100"
                  imgClassName="h-full w-full object-contain"
                />
                <p className="mt-3 text-sm font-semibold">{item.name}</p>
                <p className="text-sm text-slate-600">{toIdr(item.price)}</p>
                <Link
                  href={`/products/${item.id}`}
                  className="mt-3 inline-block rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                >
                  Lihat Produk
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}