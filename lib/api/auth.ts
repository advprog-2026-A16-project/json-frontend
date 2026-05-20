import { apiRequest } from "@/lib/api/client";
import type { AuthResponse } from "@/lib/auth/types";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  confirmPassword: string;
};

export const authApi = {
  login: (payload: LoginPayload) =>
    apiRequest<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
      withAuth: false,
      fallbackErrorMessage: "Login failed. Please check your credentials.",
    }),

  register: (payload: RegisterPayload) =>
    apiRequest<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
      withAuth: false,
      fallbackErrorMessage: "Registration failed. Please try again.",
    }),
};
