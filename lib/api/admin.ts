import { apiRequest } from "@/lib/api/client";
import type { Product, ProductPayload } from "@/lib/api/inventory";
import type { UserRole } from "@/lib/auth/types";

export type AccountStatus = "ACTIVE" | "BANNED" | "PENDING" | "PENDING_VERIFICATION";

export type AdminUser = {
  userId: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  username: string | null;
  fullName: string | null;
};

export type UserStatusUpdatePayload = {
  accountStatus: AccountStatus;
  role: UserRole;
};

export type KycStatus = "REQUESTED" | "APPROVED" | "REJECTED";

export type KycSubmission = {
  submissionId: string;
  userId: string;
  email: string;
  kycFullName: string;
  identityNumber: string;
  socialMediaLink: string;
  status: KycStatus;
  submittedAt: string;
  processedAt?: string | null;
};

export const adminApi = {
  listUsers: () =>
    apiRequest<AdminUser[]>("/api/admin/users", {
      method: "GET",
      fallbackErrorMessage: "Failed to fetch users.",
    }),

  updateUserStatus: (userId: string, payload: UserStatusUpdatePayload) =>
    apiRequest<AdminUser>(`/api/admin/users/${userId}/status`, {
      method: "PUT",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "Failed to update user status.",
    }),

  listProducts: () =>
    apiRequest<Product[]>("/api/admin/products", {
      method: "GET",
      fallbackErrorMessage: "Failed to fetch admin products.",
    }),

  updateProduct: (id: string, payload: ProductPayload) =>
    apiRequest<Product>(`/api/admin/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "Failed to update product.",
    }),

  deleteProduct: (id: string) =>
    apiRequest<void>(`/api/admin/products/${id}`, {
      method: "DELETE",
      fallbackErrorMessage: "Failed to delete product.",
    }),

  listPendingKyc: () =>
    apiRequest<KycSubmission[]>("/api/admin/kyc/pending", {
      method: "GET",
      fallbackErrorMessage: "Failed to fetch pending KYC.",
    }),

  approveKyc: (submissionId: string) =>
    apiRequest<void>(`/api/admin/kyc/${submissionId}/approve`, {
      method: "PUT",
      fallbackErrorMessage: "Failed to approve KYC.",
    }),

  rejectKyc: (submissionId: string) =>
    apiRequest<void>(`/api/admin/kyc/${submissionId}/reject`, {
      method: "PUT",
      fallbackErrorMessage: "Failed to reject KYC.",
    }),
};
