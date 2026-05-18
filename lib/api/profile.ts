import { apiRequest } from "@/lib/api/client";
import type { UserRole } from "@/lib/auth/types";

export type MyProfileResponse = {
  profileId: string;
  email: string;
  username: string;
  fullName: string | null;
  bio: string | null;
  role: UserRole;
  successfulTransactions: number;
  rating: number;
};

export const profileApi = {
  me: () => apiRequest<MyProfileResponse>("/api/profile/me", { method: "GET" }),
  updateMe: <T = unknown>(payload: unknown) =>
    apiRequest<T>("/api/profile/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};
