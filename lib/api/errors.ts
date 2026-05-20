export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const pickMessageFromData = (data: unknown): string | null => {
  if (!data || typeof data !== "object") return null;

  if ("message" in data && typeof (data as { message?: unknown }).message === "string") {
    return (data as { message: string }).message;
  }

  if ("error" in data && typeof (data as { error?: unknown }).error === "string") {
    return (data as { error: string }).error;
  }

  return null;
};

export const normalizeApiErrorMessage = (status: number, data: unknown, fallback: string) => {
  if (status === 401) return "Unauthorized. Please login again.";
  if (status === 403) return "Forbidden. You do not have access to this action.";
  if (status === 404) return "Resource not found.";

  return pickMessageFromData(data) ?? fallback;
};
