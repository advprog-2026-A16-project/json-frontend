import { apiRequest } from "@/lib/api/client";

export type WalletResponse = {
  userId: string;
  balance: number;
};

export type WalletAmountPayload = {
  userId: string;
  amount: number;
};

export const walletApi = {
  topUp: (payload: WalletAmountPayload) =>
    apiRequest<WalletResponse>("/api/wallet/top-up", {
      method: "POST",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "Top up failed.",
    }),

  withdraw: (payload: WalletAmountPayload) =>
    apiRequest<WalletResponse>("/api/wallet/withdraw", {
      method: "POST",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "Withdraw failed.",
    }),

  payment: (payload: WalletAmountPayload) =>
    apiRequest<WalletResponse>("/api/wallet/payment", {
      method: "POST",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "Payment failed.",
    }),

  refund: (payload: WalletAmountPayload) =>
    apiRequest<WalletResponse>("/api/wallet/refund", {
      method: "POST",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "Refund failed.",
    }),
};
