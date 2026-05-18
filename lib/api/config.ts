export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:8080"
    : "https://json-backend-staging-9413d4381c05.herokuapp.com");
