import { expect, request as playwrightRequest, test, type APIRequestContext } from "@playwright/test";

type AuthResponse = {
  token: string;
  message: string;
  email: string;
  role: "ADMIN" | "JASTIPER" | "TITIPERS";
  userId: string;
};

type ErrorResponse = {
  message?: string;
  error?: string;
};

const BASE_URL =
  process.env.BACKEND_BASE_URL ??
  "https://json-backend-staging-9413d4381c05.herokuapp.com";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@email.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin123";
const DEFAULT_PASSWORD = process.env.TEST_USER_PASSWORD ?? "Admin123";

test.describe.serial("Auth functional testing against staging", () => {
  let api: APIRequestContext;
  const testEmail = `user-${Date.now()}@mail.test`;

  test.beforeAll(async () => {
    api = await playwrightRequest.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        Accept: "application/json",
      },
    });
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test("POST /api/auth/register succeeds with valid payload", async () => {
    const response = await api.post("/api/auth/register", {
      data: {
        email: testEmail,
        password: DEFAULT_PASSWORD,
        confirmPassword: DEFAULT_PASSWORD,
      },
    });

    expect(response.status()).toBe(200);

    const body = (await response.json()) as AuthResponse;

    expect(body.email).toBe(testEmail);
    expect(body.token).toBeTruthy();
    expect(body.userId).toBeTruthy();
  });

  test("POST /api/auth/register fails with duplicate email (409)", async () => {
    const response = await api.post("/api/auth/register", {
      data: {
        email: testEmail,
        password: DEFAULT_PASSWORD,
        confirmPassword: DEFAULT_PASSWORD,
      },
    });

    expect([400, 409]).toContain(response.status());

    const body = (await response.json().catch(() => ({}))) as ErrorResponse;
    expect(body.message || body.error).toBeTruthy();
  });

  test("POST /api/auth/register fails when passwords do not match", async () => {
    const response = await api.post("/api/auth/register", {
      data: {
        email: `mismatch-${Date.now()}@mail.test`,
        password: DEFAULT_PASSWORD,
        confirmPassword: "DifferentPassword123",
      },
    });

    expect(response.status()).toBe(400);

    const body = (await response.json().catch(() => ({}))) as ErrorResponse;
    expect(body.message || body.error).toBeTruthy();
  });

  test("POST /api/auth/login succeeds with valid credentials", async () => {
    const response = await api.post("/api/auth/login", {
      data: {
        email: testEmail,
        password: DEFAULT_PASSWORD,
      },
    });

    expect(response.status()).toBe(200);

    const body = (await response.json()) as AuthResponse;

    expect(body.email).toBe(testEmail);
    expect(body.token).toBeTruthy();
    expect(body.role).toBeTruthy();
  });

  test("POST /api/auth/login succeeds for admin user", async () => {
    const response = await api.post("/api/auth/login", {
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
    });

    expect(response.status()).toBe(200);

    const body = (await response.json()) as AuthResponse;

    expect(body.email).toBe(ADMIN_EMAIL);
    expect(body.role).toBe("ADMIN");
    expect(body.token).toBeTruthy();
  });

  test("POST /api/auth/login fails with incorrect password", async () => {
    const response = await api.post("/api/auth/login", {
      data: {
        email: testEmail,
        password: "WrongPassword123!",
      },
    });

    expect(response.status()).toBe(401);

    const body = (await response.json().catch(() => ({}))) as ErrorResponse;
    expect(body.message || body.error).toBeTruthy();
  });

  test("POST /api/auth/login fails with unregistered email", async () => {
    const response = await api.post("/api/auth/login", {
      data: {
        email: `unregistered-${Date.now()}@mail.test`,
        password: DEFAULT_PASSWORD,
      },
    });

    expect(response.status()).toBe(404);

    const body = (await response.json().catch(() => ({}))) as ErrorResponse;
    expect(body.message || body.error).toBeTruthy();
  });

  test("POST /api/auth/login fails with missing payload fields", async () => {
    const response = await api.post("/api/auth/login", {
      data: {
        email: testEmail,
      },
    });

    expect([400, 401]).toContain(response.status());
  });
});