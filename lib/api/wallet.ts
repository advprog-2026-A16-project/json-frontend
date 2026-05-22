import { apiRequest } from "@/lib/api/client";

export type WalletResponse = {
  userId: string;
  balance: number;
};

export type WalletAmountPayload = {
  amount: number;
};

export type WalletWithdrawPayload = WalletAmountPayload & {
  destinationAccount: string;
};

export type WalletRefundPayload = WalletAmountPayload & {
  userId: string;
};

export type VerifyTransactionPayload = {
  success: boolean;
  description?: string;
};

export type TransactionType = "TOP_UP" | "WITHDRAWAL" | "PAYMENT" | "REFUND";
export type TransactionStatus = "PENDING" | "SUCCESS" | "FAILED";

export type TransactionResponse = {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  referenceId?: string | null;
  description?: string | null;
  destinationAccount?: string | null;
  paymentProvider?: string | null;
  gatewayOrderId?: string | null;
  paymentToken?: string | null;
  paymentRedirectUrl?: string | null;
  createdAt?: string | null;
};

export type PaymentGatewayTopUpResponse = {
  transaction: TransactionResponse;
  paymentToken?: string | null;
  paymentRedirectUrl?: string | null;
};

export const walletApi = {
  getWallet: () =>
    apiRequest<WalletResponse>("/api/wallet", {
      method: "GET",
      fallbackErrorMessage: "Failed to load wallet balance.",
    }),

  topUp: (payload: WalletAmountPayload) =>
    apiRequest<WalletResponse>("/api/wallet/top-up", {
      method: "POST",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "Top up failed.",
    }),

  requestTopUp: (payload: WalletAmountPayload) =>
    apiRequest<TransactionResponse>("/api/wallet/top-up/request", {
      method: "POST",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "Top up request failed.",
    }),

  requestTopUpPayment: (payload: WalletAmountPayload) =>
    apiRequest<PaymentGatewayTopUpResponse>("/api/wallet/top-up/payment", {
      method: "POST",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "Top up payment failed.",
    }),

  withdraw: (payload: WalletWithdrawPayload) =>
    apiRequest<WalletResponse>("/api/wallet/withdraw", {
      method: "POST",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "Withdraw failed.",
    }),

  requestWithdrawal: (payload: WalletWithdrawPayload) =>
    apiRequest<TransactionResponse>("/api/wallet/withdraw/request", {
      method: "POST",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "Withdrawal request failed.",
    }),

  payment: (payload: WalletAmountPayload) =>
    apiRequest<WalletResponse>("/api/wallet/payment", {
      method: "POST",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "Payment failed.",
    }),

  refund: (payload: WalletRefundPayload) =>
    apiRequest<WalletResponse>("/api/wallet/refund", {
      method: "POST",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "Refund failed.",
    }),

  verifyTransaction: (transactionId: string, payload: VerifyTransactionPayload) =>
    apiRequest<TransactionResponse>(`/api/wallet/transactions/${transactionId}/verify`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "Transaction verification failed.",
    }),

  getTransactions: () =>
    apiRequest<TransactionResponse[]>("/api/wallet/transactions", {
      method: "GET",
      fallbackErrorMessage: "Failed to load wallet transactions.",
    }),
};
