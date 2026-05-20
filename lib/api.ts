import { API_BASE_URL } from "@/lib/api/config";
import { getAccessToken } from "@/lib/auth/session";

export { API_BASE_URL };
export { authApi } from "@/lib/api/auth";
export { inventoryApi } from "@/lib/api/inventory";
export { profileApi } from "@/lib/api/profile";
export { orderApi } from "@/lib/api/order";
export { walletApi } from "@/lib/api/wallet";
export { adminApi } from "@/lib/api/admin";

export const apiFetch = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ response: Response; data: T | null }> => {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  let data: T | null = null;

  if (contentType.includes("application/json")) {
    try {
      data = (await response.json()) as T;
    } catch {
      data = null;
    }
  }

  return { response, data };
};
