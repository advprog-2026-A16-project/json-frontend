const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const productionBackendOrigin =
  process.env.BACKEND_ORIGIN?.trim() || "http://100.51.43.194";

const isBrowser = typeof window !== "undefined";

export const API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? configuredApiBaseUrl || "http://localhost:8080"
    : isBrowser
      ? "/backend-api"
      : productionBackendOrigin;
