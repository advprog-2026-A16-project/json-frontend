import { API_BASE_URL } from "@/lib/api/config";
import { ApiError, normalizeApiErrorMessage } from "@/lib/api/errors";
import { getAccessToken } from "@/lib/auth/session";

type ApiRequestOptions = RequestInit & {
  withAuth?: boolean;
  fallbackErrorMessage?: string;
};

const parseResponseBody = async <T>(response: Response): Promise<T | null> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

export const apiRequest = async <T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> => {
  const { withAuth = true, fallbackErrorMessage = "Request failed", ...fetchOptions } = options;

  const token = withAuth ? getAccessToken() : null;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...fetchOptions.headers,
    },
  });

  const data = await parseResponseBody<T>(response);

  if (!response.ok) {
    throw new ApiError(
      normalizeApiErrorMessage(response.status, data, fallbackErrorMessage),
      response.status,
      data,
    );
  }

  return (data ?? (null as T)) as T;
};
