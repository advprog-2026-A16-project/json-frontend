import { apiRequest } from "@/lib/api/client";

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  originCountry: string;
  purchaseDate?: string;
  jastiperId?: string;
};

export type ProductPayload = {
  name: string;
  description: string;
  price: number;
  stock: number;
  originCountry: string;
  purchaseDate: string;
  jastiperId: string;
};

export const inventoryApi = {
  list: () =>
    apiRequest<Product[]>("/api/products", {
      method: "GET",
      withAuth: false,
      fallbackErrorMessage: "Failed to fetch products.",
    }),

  create: (payload: ProductPayload) =>
    apiRequest<Product>("/api/products", {
      method: "POST",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "Failed to create product.",
    }),

  update: (id: string, payload: ProductPayload) =>
    apiRequest<Product>(`/api/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "Failed to update product.",
    }),

  delete: (id: string) =>
    apiRequest<void>(`/api/products/${id}`, {
      method: "DELETE",
      fallbackErrorMessage: "Failed to delete product.",
    }),
};
