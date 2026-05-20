import { apiRequest } from "@/lib/api/client";

export type OrderStatus = "PAID" | "PURCHASED" | "SHIPPED" | "COMPLETED" | "CANCELLED";

export type Order = {
  id: string;
  titipersId: string;
  jastiperId: string;
  productId: string;
  quantity: number;
  shippingAddress: string;
  totalPrice: number;
  status: OrderStatus;
  jastiperRating?: number | null;
  productRating?: number | null;
  reviewNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateOrderPayload = {
  titipersId: string;
  productId: string;
  quantity: number;
  shippingAddress: string;
};

export type UpdateOrderStatusPayload = {
  newStatus: OrderStatus;
};

export const orderApi = {
  list: () => apiRequest<Order[]>("/api/order", { method: "GET" }),

  detail: (id: string) => apiRequest<Order>(`/api/order/${id}`, { method: "GET" }),

  create: (payload: CreateOrderPayload) =>
    apiRequest<Order>("/api/order", {
      method: "POST",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "Failed to create order.",
    }),

  updateStatus: (id: string, payload: UpdateOrderStatusPayload) =>
    apiRequest<Order>(`/api/order/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "Failed to update order status.",
    }),

  listByTitipers: (titipersId: string) =>
    apiRequest<Order[]>(`/api/order/titipers/${titipersId}`, {
      method: "GET",
      fallbackErrorMessage: "Failed to fetch titipers orders.",
    }),

  listByJastiper: (jastiperId: string) =>
    apiRequest<Order[]>(`/api/order/jastiper/${jastiperId}`, {
      method: "GET",
      fallbackErrorMessage: "Failed to fetch jastiper orders.",
    }),
};
