import { apiRequest } from "@/lib/api/client";

export const adminApi = {
  listUsers: <T = unknown>() => apiRequest<T>("/api/admin/users", { method: "GET" }),
  listProducts: <T = unknown>() => apiRequest<T>("/api/admin/products", { method: "GET" }),
};
