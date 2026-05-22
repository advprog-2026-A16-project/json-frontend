import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
} from "@playwright/test";

type AuthResponse = {
  token: string;
  message: string;
  email: string;
  role: "ADMIN" | "JASTIPER" | "TITIPERS";
  userId: string;
};

type UserStatusUpdateRequest = {
  accountStatus: "ACTIVE" | "BANNED" | "PENDING" | "PENDING_VERIFICATION";
  role: "ADMIN" | "JASTIPER" | "TITIPERS";
};

type OrderStatus =
  | "PAID"
  | "PURCHASED"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED";

type OrderResponse = {
  id: string;
  titipersId: string;
  jastiperId: string;
  productId: string;
  quantity: number;
  shippingAddress: string;
  totalPrice: number;
  status: OrderStatus;
  cancelReason?: string | null;
  jastiperRating?: number | null;
  productRating?: number | null;
  reviewNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ProductResponse = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: number | string;
  stock: number;
  originCountry: string;
  purchaseDate: string;
  jastiperId: string;
  createdAt: string;
  updatedAt: string;
};

const BASE_URL =
  process.env.BACKEND_BASE_URL ??
  "https://json-backend-staging-9413d4381c05.herokuapp.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@email.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin123";
const DEFAULT_PASSWORD = process.env.TEST_USER_PASSWORD ?? "Admin123";
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.describe.serial("Order functional testing against staging", () => {
  let api: APIRequestContext;
  let admin: AuthResponse;
  let jastiper: AuthResponse;
  let titipers: AuthResponse;
  let otherTitipers: AuthResponse;
  let product: ProductResponse;
  const createdOrderIds = new Set<string>();

  test.beforeAll(async () => {
    api = await playwrightRequest.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        Accept: "application/json",
      },
    });

    admin = await login(api, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Setup jastiper
    jastiper = await registerUser(api, `jastiper-${RUN_ID}`);
    await promoteUser(api, admin.token, jastiper.userId, {
      accountStatus: "ACTIVE",
      role: "JASTIPER",
    });
    jastiper = await login(api, jastiper.email, DEFAULT_PASSWORD);

    // Setup titipers
    titipers = await registerUser(api, `titipers-${RUN_ID}`);
    titipers = await login(api, titipers.email, DEFAULT_PASSWORD);

    otherTitipers = await registerUser(api, `other-titipers-${RUN_ID}`);
    otherTitipers = await login(api, otherTitipers.email, DEFAULT_PASSWORD);

    // Create a product owned by jastiper for use in order tests
    product = await createProduct(api, jastiper, {
      name: `Order-Test-Product-${RUN_ID}`,
      description: "Product for order functional tests",
      stock: 50,
      price: 125000,
    });
  });

  test.afterAll(async () => {
    // Cancel remaining orders so stock is not permanently consumed
    for (const orderId of createdOrderIds) {
      await api
        .post(`/api/order/${orderId}/cancel`, {
          headers: authHeader(titipers.token),
        })
        .catch(() => {
          // ignore — order may already be in a terminal state
        });
    }

    // Clean up the product created for this run
    await api.delete(`/api/admin/products/${product.id}`, {
      headers: authHeader(admin.token),
    });

    await api.dispose();
  });

  // ─────────────────────────────────────────────
  // GET /api/order
  // ─────────────────────────────────────────────

  test("GET /api/order returns 200 with list for authenticated user", async () => {
    const response = await api.get("/api/order", {
      headers: authHeader(titipers.token),
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test("GET /api/order rejects unauthenticated request", async () => {
    const response = await api.get("/api/order");
    expect(response.status()).toBe(403);
  });

  // ─────────────────────────────────────────────
  // POST /api/order
  // ─────────────────────────────────────────────

  test("POST /api/order succeeds for authenticated titipers with valid payload", async () => {
    const order = await createOrder(api, titipers, {
      productId: product.id,
      quantity: 1,
      shippingAddress: "Jl. Test No. 1, Jakarta",
    });

    expect(order.id).toBeTruthy();
    expect(order.titipersId).toBe(titipers.userId);
    expect(order.productId).toBe(product.id);
    expect(order.quantity).toBe(1);
    expect(order.status).toBe("PAID");
    createdOrderIds.add(order.id);
  });

  test("POST /api/order rejects unauthenticated request", async () => {
    const response = await api.post("/api/order", {
      data: sampleOrderPayload(titipers.userId, product.id),
    });
    expect(response.status()).toBe(403);
  });

  test("POST /api/order rejects invalid payload", async () => {
    const missingAddress = await api.post("/api/order", {
      headers: authHeader(titipers.token),
      data: {
        ...sampleOrderPayload(titipers.userId, product.id),
        shippingAddress: "   ",
      },
    });
    expect(missingAddress.status()).toBe(400);

    const invalidQuantity = await api.post("/api/order", {
      headers: authHeader(titipers.token),
      data: {
        ...sampleOrderPayload(titipers.userId, product.id),
        quantity: 0,
      },
    });
    expect(invalidQuantity.status()).toBe(400);

    const missingProduct = await api.post("/api/order", {
      headers: authHeader(titipers.token),
      data: {
        ...sampleOrderPayload(titipers.userId, product.id),
        productId: randomUuid(),
      },
    });
    expect(missingProduct.status()).toBe(404);
  });

  test("POST /api/order rejects when quantity exceeds stock", async () => {
    const response = await api.post("/api/order", {
      headers: authHeader(titipers.token),
      data: {
        ...sampleOrderPayload(titipers.userId, product.id),
        quantity: 999999,
      },
    });
    expect(response.status()).toBe(409);
  });

  // ─────────────────────────────────────────────
  // GET /api/order/:id
  // ─────────────────────────────────────────────

  test("GET /api/order/:id returns order detail for owner", async () => {
    const order = await createOrder(api, titipers, {
      productId: product.id,
      quantity: 1,
      shippingAddress: "Jl. Detail Test, Bandung",
    });
    createdOrderIds.add(order.id);

    const response = await api.get(`/api/order/${order.id}`, {
      headers: authHeader(titipers.token),
    });
    expect(response.status()).toBe(200);

    const body = (await response.json()) as OrderResponse;
    expect(body.id).toBe(order.id);
    expect(body.titipersId).toBe(titipers.userId);
  });

  test("GET /api/order/:id returns 404 for nonexistent order", async () => {
    const response = await api.get(`/api/order/${randomUuid()}`, {
      headers: authHeader(titipers.token),
    });
    expect(response.status()).toBe(404);
  });

  test("GET /api/order/:id rejects unauthenticated request", async () => {
    const order = await createOrder(api, titipers, {
      productId: product.id,
      quantity: 1,
      shippingAddress: "Jl. Unauth Test, Surabaya",
    });
    createdOrderIds.add(order.id);

    const response = await api.get(`/api/order/${order.id}`);
    expect(response.status()).toBe(403);
  });

  // ─────────────────────────────────────────────
  // PUT /api/order/:id/status
  // ─────────────────────────────────────────────

  test("PUT /api/order/:id/status allows jastiper to advance order status", async () => {
    const order = await createOrder(api, titipers, {
      productId: product.id,
      quantity: 1,
      shippingAddress: "Jl. Status Update, Yogyakarta",
    });
    createdOrderIds.add(order.id);

    const response = await api.put(`/api/order/${order.id}/status`, {
      headers: authHeader(jastiper.token),
      data: { newStatus: "PURCHASED" },
    });
    expect(response.status()).toBe(200);

    const updated = (await response.json()) as OrderResponse;
    expect(updated.status).toBe("PURCHASED");
  });

  test("PUT /api/order/:id/status rejects unauthenticated and unauthorized requests", async () => {
    const order = await createOrder(api, titipers, {
      productId: product.id,
      quantity: 1,
      shippingAddress: "Jl. Status Reject, Medan",
    });
    createdOrderIds.add(order.id);

    const unauthenticated = await api.put(`/api/order/${order.id}/status`, {
      data: { newStatus: "PURCHASED" },
    });
    expect(unauthenticated.status()).toBe(403);

    // titipers should not be able to advance order status
    const titipersUpdate = await api.put(`/api/order/${order.id}/status`, {
      headers: authHeader(titipers.token),
      data: { newStatus: "PURCHASED" },
    });
    expect(titipersUpdate.status()).toBe(403);
  });

  test("PUT /api/order/:id/status rejects invalid status transition", async () => {
    const order = await createOrder(api, titipers, {
      productId: product.id,
      quantity: 1,
      shippingAddress: "Jl. Invalid Transition, Makassar",
    });
    createdOrderIds.add(order.id);

    // Cannot jump from PAID directly to COMPLETED
    const response = await api.put(`/api/order/${order.id}/status`, {
      headers: authHeader(jastiper.token),
      data: { newStatus: "COMPLETED" },
    });
    expect(response.status()).toBe(400);
  });

  test("PUT /api/order/:id/status returns 404 for nonexistent order", async () => {
    const response = await api.put(`/api/order/${randomUuid()}/status`, {
      headers: authHeader(jastiper.token),
      data: { newStatus: "PURCHASED" },
    });
    expect(response.status()).toBe(404);
  });

  // ─────────────────────────────────────────────
  // POST /api/order/:id/cancel
  // ─────────────────────────────────────────────

  test("POST /api/order/:id/cancel allows titipers to cancel their own PAID order", async () => {
    const order = await createOrder(api, titipers, {
      productId: product.id,
      quantity: 1,
      shippingAddress: "Jl. Cancel Test, Semarang",
    });
    // Do NOT add to createdOrderIds — we're cancelling it here

    const response = await api.post(`/api/order/${order.id}/cancel`, {
      headers: authHeader(titipers.token),
    });
    expect(response.status()).toBe(200);

    const cancelled = (await response.json()) as OrderResponse;
    expect(cancelled.status).toBe("CANCELLED");
  });

  test("POST /api/order/:id/cancel rejects cancellation of non-PAID order", async () => {
    const order = await createOrder(api, titipers, {
      productId: product.id,
      quantity: 1,
      shippingAddress: "Jl. Cancel Reject, Solo",
    });
    createdOrderIds.add(order.id);

    // Advance to PURCHASED first
    await api.put(`/api/order/${order.id}/status`, {
      headers: authHeader(jastiper.token),
      data: { newStatus: "PURCHASED" },
    });

    const response = await api.post(`/api/order/${order.id}/cancel`, {
      headers: authHeader(titipers.token),
    });
    expect(response.status()).toBe(400);
  });

  test("POST /api/order/:id/cancel rejects when another titipers tries to cancel", async () => {
    const order = await createOrder(api, titipers, {
      productId: product.id,
      quantity: 1,
      shippingAddress: "Jl. Other Cancel, Palembang",
    });
    createdOrderIds.add(order.id);

    const response = await api.post(`/api/order/${order.id}/cancel`, {
      headers: authHeader(otherTitipers.token),
    });
    expect(response.status()).toBe(403);
  });

  test("POST /api/order/:id/cancel returns 404 for nonexistent order", async () => {
    const response = await api.post(`/api/order/${randomUuid()}/cancel`, {
      headers: authHeader(titipers.token),
    });
    expect(response.status()).toBe(404);
  });

  test("POST /api/order/:id/cancel rejects unauthenticated request", async () => {
    const order = await createOrder(api, titipers, {
      productId: product.id,
      quantity: 1,
      shippingAddress: "Jl. Unauth Cancel, Balikpapan",
    });
    createdOrderIds.add(order.id);

    const response = await api.post(`/api/order/${order.id}/cancel`);
    expect(response.status()).toBe(403);
  });

  // ─────────────────────────────────────────────
  // POST /api/order/:id/rating
  // ─────────────────────────────────────────────

  test("POST /api/order/:id/rating allows titipers to rate a COMPLETED order", async () => {
    const order = await createOrder(api, titipers, {
      productId: product.id,
      quantity: 1,
      shippingAddress: "Jl. Rating Test, Denpasar",
    });

    // Advance order to COMPLETED
    await advanceOrderTo(api, jastiper, order.id, "COMPLETED");

    const response = await api.post(`/api/order/${order.id}/rating`, {
      headers: authHeader(titipers.token),
      data: {
        jastiperRating: 5,
        productRating: 4,
        reviewNotes: `Great service! Run ${RUN_ID}`,
      },
    });
    expect(response.status()).toBe(200);

    const rated = (await response.json()) as OrderResponse;
    expect(rated.jastiperRating).toBe(5);
    expect(rated.productRating).toBe(4);
    expect(rated.reviewNotes).toContain(RUN_ID);
  });

  test("POST /api/order/:id/rating rejects rating a non-COMPLETED order", async () => {
    const order = await createOrder(api, titipers, {
      productId: product.id,
      quantity: 1,
      shippingAddress: "Jl. Rating Reject, Lombok",
    });
    createdOrderIds.add(order.id);

    const response = await api.post(`/api/order/${order.id}/rating`, {
      headers: authHeader(titipers.token),
      data: { jastiperRating: 5, productRating: 5 },
    });
    expect(response.status()).toBe(400);
  });

  test("POST /api/order/:id/rating rejects invalid rating values", async () => {
    const order = await createOrder(api, titipers, {
      productId: product.id,
      quantity: 1,
      shippingAddress: "Jl. Invalid Rating, Manado",
    });
    await advanceOrderTo(api, jastiper, order.id, "COMPLETED");

    const outOfRange = await api.post(`/api/order/${order.id}/rating`, {
      headers: authHeader(titipers.token),
      data: { jastiperRating: 6, productRating: 0 },
    });
    expect(outOfRange.status()).toBe(400);
  });

  test("POST /api/order/:id/rating rejects unauthenticated and non-owner requests", async () => {
    const order = await createOrder(api, titipers, {
      productId: product.id,
      quantity: 1,
      shippingAddress: "Jl. Unauth Rating, Pontianak",
    });
    await advanceOrderTo(api, jastiper, order.id, "COMPLETED");

    const unauthenticated = await api.post(`/api/order/${order.id}/rating`, {
      data: { jastiperRating: 5, productRating: 5 },
    });
    expect(unauthenticated.status()).toBe(403);

    const nonOwner = await api.post(`/api/order/${order.id}/rating`, {
      headers: authHeader(otherTitipers.token),
      data: { jastiperRating: 5, productRating: 5 },
    });
    expect(nonOwner.status()).toBe(403);
  });

  test("POST /api/order/:id/rating returns 404 for nonexistent order", async () => {
    const response = await api.post(`/api/order/${randomUuid()}/rating`, {
      headers: authHeader(titipers.token),
      data: { jastiperRating: 5, productRating: 5 },
    });
    expect(response.status()).toBe(404);
  });

  // ─────────────────────────────────────────────
  // GET /api/order/titipers/:titipersId
  // ─────────────────────────────────────────────

  test("GET /api/order/titipers/:titipersId returns orders for that titipers", async () => {
    const order = await createOrder(api, titipers, {
      productId: product.id,
      quantity: 1,
      shippingAddress: "Jl. Titipers List, Kupang",
    });
    createdOrderIds.add(order.id);

    const response = await api.get(`/api/order/titipers/${titipers.userId}`, {
      headers: authHeader(titipers.token),
    });
    expect(response.status()).toBe(200);

    const body = (await response.json()) as OrderResponse[];
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.some((o) => o.id === order.id)).toBeTruthy();
  });

  test("GET /api/order/titipers/:titipersId returns empty array when titipers has no orders", async () => {
    const response = await api.get(
      `/api/order/titipers/${otherTitipers.userId}`,
      {
        headers: authHeader(otherTitipers.token),
      },
    );
    expect(response.status()).toBe(200);

    const body = (await response.json()) as OrderResponse[];
    expect(Array.isArray(body)).toBeTruthy();
    expect(body).toEqual([]);
  });

  test("GET /api/order/titipers/:titipersId rejects unauthenticated and unauthorized requests", async () => {
    const unauthenticated = await api.get(
      `/api/order/titipers/${titipers.userId}`,
    );
    expect(unauthenticated.status()).toBe(403);

    // otherTitipers should not see titipers' orders
    const unauthorized = await api.get(
      `/api/order/titipers/${titipers.userId}`,
      {
        headers: authHeader(otherTitipers.token),
      },
    );
    expect(unauthorized.status()).toBe(403);
  });

  test("GET /api/order/titipers/:titipersId rejects malformed UUID", async () => {
    const response = await api.get("/api/order/titipers/not-a-uuid", {
      headers: authHeader(titipers.token),
    });
    expect(response.status()).toBe(400);
  });

  // ─────────────────────────────────────────────
  // GET /api/order/jastiper/:jastiperId
  // ─────────────────────────────────────────────

  test("GET /api/order/jastiper/:jastiperId returns orders for that jastiper", async () => {
    const order = await createOrder(api, titipers, {
      productId: product.id,
      quantity: 1,
      shippingAddress: "Jl. Jastiper List, Ambon",
    });
    createdOrderIds.add(order.id);

    const response = await api.get(`/api/order/jastiper/${jastiper.userId}`, {
      headers: authHeader(jastiper.token),
    });
    expect(response.status()).toBe(200);

    const body = (await response.json()) as OrderResponse[];
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.some((o) => o.id === order.id)).toBeTruthy();
  });

  test("GET /api/order/jastiper/:jastiperId rejects unauthenticated and unauthorized requests", async () => {
    const unauthenticated = await api.get(
      `/api/order/jastiper/${jastiper.userId}`,
    );
    expect(unauthenticated.status()).toBe(403);

    // titipers should not access jastiper's order list
    const unauthorized = await api.get(
      `/api/order/jastiper/${jastiper.userId}`,
      {
        headers: authHeader(titipers.token),
      },
    );
    expect(unauthorized.status()).toBe(403);
  });

  test("GET /api/order/jastiper/:jastiperId rejects malformed UUID", async () => {
    const response = await api.get("/api/order/jastiper/not-a-uuid", {
      headers: authHeader(jastiper.token),
    });
    expect(response.status()).toBe(400);
  });
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function registerUser(api: APIRequestContext, label: string) {
  const email = `${label}@mail.test`;
  const response = await api.post("/api/auth/register", {
    data: {
      email,
      password: DEFAULT_PASSWORD,
      confirmPassword: DEFAULT_PASSWORD,
    },
  });
  expect(response.status()).toBe(200);
  return (await response.json()) as AuthResponse;
}

async function login(api: APIRequestContext, email: string, password: string) {
  const response = await api.post("/api/auth/login", {
    data: { email, password },
  });
  expect(response.status()).toBe(200);
  return (await response.json()) as AuthResponse;
}

async function promoteUser(
  api: APIRequestContext,
  adminToken: string,
  userId: string,
  payload: UserStatusUpdateRequest,
) {
  const response = await api.put(`/api/admin/users/${userId}/status`, {
    headers: authHeader(adminToken),
    data: payload,
  });
  expect(response.status()).toBe(200);
}

async function createProduct(
  api: APIRequestContext,
  actor: Pick<AuthResponse, "token" | "userId">,
  overrides: Partial<{
    name: string;
    description: string;
    stock: number;
    price: number;
  }> = {},
) {
  const payload = {
    name: `Product-${RUN_ID}`,
    description: "Order test product",
    imageUrl: "https://example.com/product.png",
    price: 100000,
    stock: 50,
    originCountry: "JP",
    purchaseDate: futureDateIso(10),
    jastiperId: actor.userId,
    ...overrides,
  };
  const response = await api.post("/api/products", {
    headers: authHeader(actor.token),
    data: payload,
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as ProductResponse;
}

async function createOrder(
  api: APIRequestContext,
  actor: Pick<AuthResponse, "token" | "userId">,
  overrides: Partial<{
    productId: string;
    quantity: number;
    shippingAddress: string;
  }> = {},
) {
  const payload = {
    titipersId: actor.userId,
    productId: "",
    quantity: 1,
    shippingAddress: "Jl. Default, Jakarta",
    ...overrides,
  };
  const response = await api.post("/api/order", {
    headers: authHeader(actor.token),
    data: payload,
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as OrderResponse;
}

/** Advance an order through statuses until the target status is reached. */
async function advanceOrderTo(
  api: APIRequestContext,
  jastiper: Pick<AuthResponse, "token">,
  orderId: string,
  targetStatus: OrderStatus,
) {
  const flow: OrderStatus[] = ["PURCHASED", "SHIPPED", "COMPLETED"];
  for (const status of flow) {
    await api.put(`/api/order/${orderId}/status`, {
      headers: authHeader(jastiper.token),
      data: { newStatus: status },
    });
    if (status === targetStatus) break;
  }
}

function sampleOrderPayload(titipersId: string, productId: string) {
  return {
    titipersId,
    productId,
    quantity: 1,
    shippingAddress: `Jl. Sample ${RUN_ID}, Jakarta`,
  };
}

function futureDateIso(daysAhead: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

function randomUuid() {
  return crypto.randomUUID();
}