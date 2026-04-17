"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function OrderListPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { response, data } = await apiFetch("/api/order"); // Endpoint juga singular?
        if (response.ok) setOrders(data);
      } catch (err) {
        console.error("Gagal load order", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Daftar Order</h1>
          <div className="flex gap-2">
            <Link href="/order/create" className="rounded-md bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700">
              + Tambah Order
            </Link>
            <Link href="/inventory" className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-100">
              Ke Inventory
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Memuat data order...</p>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <Link href={`/order/${order.id}`} key={order.id}>
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-orange-500">
                  <div>
                    <p className="text-xs font-mono text-gray-400">ID: {order.id.slice(0, 8)}</p>
                    <p className="font-semibold">Produk: {order.productId.slice(0, 8)}...</p>
                    <p className="text-sm text-gray-500">{order.quantity} pcs</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">Rp {order.totalPrice.toLocaleString("id-ID")}</p>
                    <span className="mt-1 inline-block rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black text-orange-700 border border-orange-200 uppercase">
                      {order.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}