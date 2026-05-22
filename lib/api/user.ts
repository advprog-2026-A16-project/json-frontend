import { apiRequest } from "@/lib/api/client";

export type PublicProfileResponse = {
  userId: string;
  username: string;
  fullName: string | null;
  bio: string | null;
  successfulTransactions: number;
  rating: number;
};

export const userApi = {
  getPublicProfile: (id: string) =>
    apiRequest<PublicProfileResponse>(`/api/users/${id}`, {
      method: "GET",
      withAuth: true, 
      fallbackErrorMessage: "Gagal memuat profil pengguna.",
    }),
};