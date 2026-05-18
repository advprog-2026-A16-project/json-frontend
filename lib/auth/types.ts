export type UserRole = "ADMIN" | "JASTIPER" | "TITIPERS";

export type AuthSession = {
  token: string | null;
  role: UserRole | null;
  userId: string | null;
  email: string | null;
};

export type AuthResponse = {
  token?: string;
  role?: UserRole;
  userId?: string;
  email?: string;
  message?: string;
};
