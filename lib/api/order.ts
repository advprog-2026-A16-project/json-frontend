import { apiRequest } from "@/lib/api/client";

export const orderApi = {
  list: <T = unknown>() => apiRequest<T>("/api/order", { method: "GET" }),
  detail: <T = unknown>(id: string) => apiRequest<T>(`/api/order/${id}`, { method: "GET" }),
};
