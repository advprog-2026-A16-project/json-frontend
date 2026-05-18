import { apiRequest } from "@/lib/api/client";

export const profileApi = {
  me: <T = unknown>() => apiRequest<T>("/api/profile/me", { method: "GET" }),
  updateMe: <T = unknown>(payload: unknown) =>
    apiRequest<T>("/api/profile/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};
