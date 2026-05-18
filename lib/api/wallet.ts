import { apiRequest } from "@/lib/api/client";

export const walletApi = {
  topUp: <T = unknown>(payload: unknown) =>
    apiRequest<T>("/api/wallet/top-up", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
