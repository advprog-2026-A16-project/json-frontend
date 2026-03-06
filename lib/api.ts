// lib/api.ts
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:8080"
    : "https://json-backend-staging-9413d4381c05.herokuapp.com");

export const apiFetch = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ response: Response; data: T | null }> => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
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
