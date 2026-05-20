import { apiRequest } from "@/lib/api/client";

export type Product = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  price: number;
  stock: number;
  originCountry: string;
  purchaseDate?: string;
  jastiperId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductPayload = {
  name: string;
  description: string;
  imageUrl?: string;
  price: number;
  stock: number;
  originCountry: string;
  purchaseDate: string;
  jastiperId: string;
};

export type ProductQuery = {
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: "asc" | "desc";
};

const toQueryString = (query: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.append(key, String(value));
    }
  }

  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
};

export const inventoryApi = {
  list: (query: ProductQuery = {}) =>
    apiRequest<Product[]>(`/api/products${toQueryString(query)}`, {
      method: "GET",
      withAuth: false,
      fallbackErrorMessage: "Failed to fetch products.",
    }),

  search: (keyword: string, query: ProductQuery = {}) =>
    apiRequest<Product[]>(
      `/api/products/search${toQueryString({ keyword, ...query })}`,
      {
        method: "GET",
        withAuth: false,
        fallbackErrorMessage: "Failed to search products.",
      },
    ),

  listByJastiper: (jastiperId: string, query: ProductQuery = {}) =>
    apiRequest<Product[]>(
      `/api/products/jastiper/${jastiperId}${toQueryString(query)}`,
      {
        method: "GET",
        withAuth: false,
        fallbackErrorMessage: "Failed to fetch jastiper products.",
      },
    ),

  detail: (id: string) =>
    apiRequest<Product>(`/api/products/${id}`, {
      method: "GET",
      withAuth: false,
      fallbackErrorMessage: "Failed to fetch product detail.",
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
