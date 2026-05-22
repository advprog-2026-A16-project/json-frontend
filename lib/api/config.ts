const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

export const API_BASE_URL =
  configuredApiBaseUrl ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:8080"
    : "http://100.51.43.194");
