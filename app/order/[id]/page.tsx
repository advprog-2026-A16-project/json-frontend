"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);

  const fetchDetail = async () => {
    const { response, data } = await apiFetch(`/api/order/${id}`);
    if (response.ok) setOrder(data);
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const updateStatus = async (newStatus: string) => {
    const { response } = await apiFetch(`/api/order/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ newStatus }),
    });
    if (response.ok) {
      alert("Status Terupdate!");
      fetchDetail();
    }
  };

  if (!order) return <p className="p-10 text-center">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-900 flex justify-center">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <button onClick={() => router.push("/order")} className="text-sm text-gray-400 mb-6 hover:text-black">← Kembali</button>
        <h1 className="text-2xl font-bold mb-2">Order Detail</h1>
        <p className="text-xs font-mono text-gray-400 mb-6">{order.id}</p>

        <div className="space-y-4 mb-8">
          <div className="flex justify-between border-b pb-2">
            <span>Status</span>
            <span className="font-bold text-orange-600">{order.status}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span>Total</span>
            <span className="font-bold">Rp {order.totalPrice.toLocaleString("id-ID")}</span>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border">
          <h3 className="text-[10px] font-black text-gray-400 uppercase mb-3">Update Status (Jastiper)</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => updateStatus("PURCHASED")} className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-[10px] font-bold">PURCHASED</button>
            <button onClick={() => updateStatus("SHIPPED")} className="bg-purple-600 text-white px-3 py-1.5 rounded-md text-[10px] font-bold">SHIPPED</button>
            <button onClick={() => updateStatus("COMPLETED")} className="bg-green-600 text-white px-3 py-1.5 rounded-md text-[10px] font-bold">COMPLETED</button>
            <button onClick={() => updateStatus("CANCELLED")} className="bg-red-600 text-white px-3 py-1.5 rounded-md text-[10px] font-bold">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
}