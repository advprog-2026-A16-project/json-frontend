import { apiRequest } from "@/lib/api/client";
import type { UserRole } from "@/lib/auth/types";

export type MyProfileResponse = {
  profileId: string;
  userId?: string;
  email: string;
  username: string;
  fullName: string | null;
  bio: string | null;
  role: UserRole;
  successfulTransactions: number;
  rating: number;
};

export type UpdateProfilePayload = {
  username: string;
  fullName: string;
  bio: string;
};

export type KycSubmitPayload = {
  fullName: string;
  identityNumber: string;
  socialMediaLink: string;
};

export const profileApi = {
  me: () => apiRequest<MyProfileResponse>("/api/profile/me", { method: "GET" }),
  updateMe: (payload: UpdateProfilePayload) =>
    apiRequest<MyProfileResponse>("/api/profile/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  submitKyc: (payload: KycSubmitPayload) =>
    apiRequest<null>("/api/kyc/submit", {
      method: "POST",
      body: JSON.stringify(payload),
      fallbackErrorMessage: "KYC submission failed.",
    }),
};
