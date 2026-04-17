"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function CreateOrderPage() {
  const router = useRouter();
  const [form, setForm] = useState({ titipersId: "", productId: "", quantity: "1" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { response } = await apiFetch("/api/order", {
        method: "POST",
        body: JSON.stringify({ ...form, quantity: Number(form.quantity) }),
      });
      if (response.ok) {
        router.push("/order");
      } else {
        alert("Gagal membuat order.");
      }
    } catch {
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-900 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-6">Checkout Baru</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full rounded-md border p-2 text-sm"
            placeholder="Titipers ID (UUID)"
            value={form.titipersId}
            onChange={(e) => setForm({...form, titipersId: e.target.value})}
          />
          <input
            className="w-full rounded-md border p-2 text-sm"
            placeholder="Product ID (UUID)"
            value={form.productId}
            onChange={(e) => setForm({...form, productId: e.target.value})}
          />
          <input
            type="number" className="w-full rounded-md border p-2 text-sm"
            value={form.quantity}
            onChange={(e) => setForm({...form, quantity: e.target.value})}
          />
          <button className="w-full rounded-md bg-orange-600 py-3 text-sm font-bold text-white hover:bg-orange-700">
            {submitting ? "Memproses..." : "Konfirmasi Order"}
          </button>
        </form>
      </div>
    </div>
  );
}