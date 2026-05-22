import { expect, request as playwrightRequest, test, type APIRequestContext } from "@playwright/test";

type AuthResponse = {
  token: string;
  message: string;
  email: string;
  role: "ADMIN" | "JASTIPER" | "TITIPERS";
  userId: string;
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

type UserStatusUpdateRequest = {
  accountStatus: "ACTIVE" | "BANNED" | "PENDING" | "PENDING_VERIFICATION";
  role: "ADMIN" | "JASTIPER" | "TITIPERS";
};

const BASE_URL =
  process.env.BACKEND_BASE_URL ??
  "https://json-backend-staging-9413d4381c05.herokuapp.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@email.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin123";
const DEFAULT_PASSWORD = process.env.TEST_USER_PASSWORD ?? "Admin123";
const RUN_ID = `${Date.now()}`;

test.describe.serial("Inventory functional testing against staging", () => {
  let api: APIRequestContext;
  let admin: AuthResponse;
  let owner: AuthResponse;
  let otherJastiper: AuthResponse;
  let titipers: AuthResponse;
  const createdProductIds = new Set<string>();

  test.beforeAll(async () => {
    api = await playwrightRequest.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        Accept: "application/json",
      },
    });

    admin = await login(api, ADMIN_EMAIL, ADMIN_PASSWORD);
    owner = await registerUser(api, `owner-${RUN_ID}`);
    await promoteUser(api, admin.token, owner.userId, {
      accountStatus: "ACTIVE",
      role: "JASTIPER",
    });
    owner = await login(api, owner.email, DEFAULT_PASSWORD);

    otherJastiper = await registerUser(api, `other-${RUN_ID}`);
    await promoteUser(api, admin.token, otherJastiper.userId, {
      accountStatus: "ACTIVE",
      role: "JASTIPER",
    });
    otherJastiper = await login(api, otherJastiper.email, DEFAULT_PASSWORD);

    titipers = await registerUser(api, `titipers-${RUN_ID}`);
    titipers = await login(api, titipers.email, DEFAULT_PASSWORD);
  });

  test.afterAll(async () => {
    for (const productId of createdProductIds) {
      await api.delete(`/api/admin/products/${productId}`, {
        headers: authHeader(admin.token),
      });
    }
    await api.dispose();
  });

  test("GET /api/products returns 200 with default pagination", async () => {
    const response = await api.get("/api/products");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test("GET /api/products supports page/size/sort/direction", async () => {
    const response = await api.get(
      "/api/products?page=0&size=5&sortBy=createdAt&direction=desc",
    );
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeLessThanOrEqual(5);
  });

  test("GET /api/products rejects invalid list params", async () => {
    const invalidPage = await api.get("/api/products?page=-1");
    expect(invalidPage.status()).toBe(400);

    const invalidSize = await api.get("/api/products?size=0");
    expect(invalidSize.status()).toBe(400);

    const invalidSort = await api.get("/api/products?sortBy=dropTable");
    expect(invalidSort.status()).toBe(400);

    const invalidDirection = await api.get("/api/products?direction=sideways");
    expect(invalidDirection.status()).toBe(400);
  });

  test("JASTIPER can POST /api/products and GET /api/products/{id}", async () => {
    const product = await createProduct(api, owner, {
      name: `Inventory Product ${RUN_ID}`,
      description: "Functional testing product",
      stock: 7,
    });

    expect(product.id).toBeTruthy();
    expect(product.jastiperId).toBe(owner.userId);
    expect(product.name).toContain(RUN_ID);
    createdProductIds.add(product.id);

    const detailResponse = await api.get(`/api/products/${product.id}`);
    expect(detailResponse.status()).toBe(200);
    const detail = (await detailResponse.json()) as ProductResponse;
    expect(detail.id).toBe(product.id);
    expect(detail.name).toBe(product.name);
  });

  test("GET /api/products/{id} returns 404 for nonexistent product", async () => {
    const response = await api.get(`/api/products/${randomUuid()}`);
    expect(response.status()).toBe(404);
  });

  test("GET /api/products/{id} rejects malformed UUID", async () => {
    const response = await api.get("/api/products/not-a-uuid");
    expect(response.status()).toBe(400);

    const body = (await response.json()) as { message: string };
    expect(body.message).toBe("Invalid UUID value for parameter: id");
  });

  test("GET /api/products/search returns matching product results", async () => {
    const uniqueKeyword = `Searchable-${RUN_ID}`;
    const product = await createProduct(api, owner, {
      name: uniqueKeyword,
      description: "search target",
      stock: 5,
    });
    createdProductIds.add(product.id);

    const response = await api.get(
      `/api/products/search?keyword=${encodeURIComponent(uniqueKeyword)}`,
    );
    expect(response.status()).toBe(200);

    const body = (await response.json()) as ProductResponse[];
    expect(body.some((item) => item.id === product.id)).toBeTruthy();
  });

  test("GET /api/products/search returns empty array when no match", async () => {
    const response = await api.get(
      `/api/products/search?keyword=${encodeURIComponent(`missing-${RUN_ID}`)}`,
    );
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test("GET /api/products/search rejects invalid pagination params", async () => {
    const invalidPage = await api.get(
      `/api/products/search?keyword=${encodeURIComponent(`search-${RUN_ID}`)}&page=-1`,
    );
    expect(invalidPage.status()).toBe(400);

    const invalidSize = await api.get(
      `/api/products/search?keyword=${encodeURIComponent(`search-${RUN_ID}`)}&size=0`,
    );
    expect(invalidSize.status()).toBe(400);
  });

  test("GET /api/products/jastiper/{jastiperId} returns owner products", async () => {
    const product = await createProduct(api, owner, {
      name: `ByJastiper-${RUN_ID}`,
      description: "owner list target",
      stock: 4,
    });
    createdProductIds.add(product.id);

    const response = await api.get(`/api/products/jastiper/${owner.userId}`);
    expect(response.status()).toBe(200);

    const body = (await response.json()) as ProductResponse[];
    expect(body.some((item) => item.id === product.id)).toBeTruthy();
  });

  test("GET /api/products/jastiper/{jastiperId} returns empty array when jastiper has no products", async () => {
    const response = await api.get(`/api/products/jastiper/${otherJastiper.userId}`);
    expect(response.status()).toBe(200);

    const body = (await response.json()) as ProductResponse[];
    expect(body).toEqual([]);
  });

  test("GET /api/products/jastiper/{jastiperId} rejects invalid list params", async () => {
    const invalidPage = await api.get(`/api/products/jastiper/${owner.userId}?page=-1`);
    expect(invalidPage.status()).toBe(400);

    const invalidSize = await api.get(`/api/products/jastiper/${owner.userId}?size=0`);
    expect(invalidSize.status()).toBe(400);
  });

  test("GET /api/products/jastiper/{jastiperId} rejects malformed UUID", async () => {
    const response = await api.get("/api/products/jastiper/not-a-uuid");
    expect(response.status()).toBe(400);

    const body = (await response.json()) as { message: string };
    expect(body.message).toBe("Invalid UUID value for parameter: jastiperId");
  });

  test("POST /api/products normalizes blank imageUrl to null", async () => {
    const product = await createProduct(api, owner, {
      name: `BlankImage-${RUN_ID}`,
      description: "blank image normalization",
      imageUrl: "   ",
    });
    createdProductIds.add(product.id);

    expect(product.imageUrl).toBeNull();
  });

  test("POST /api/products rejects unauthenticated, titipers, and invalid payload", async () => {
    const unauthenticated = await api.post("/api/products", {
      data: sampleProductPayload(owner.userId, `Unauth-${RUN_ID}`),
    });
    expect(unauthenticated.status()).toBe(403);

    const titipersCreate = await api.post("/api/products", {
      headers: authHeader(titipers.token),
      data: sampleProductPayload(titipers.userId, `Titipers-${RUN_ID}`),
    });
    expect(titipersCreate.status()).toBe(403);

    const wrongOwner = await api.post("/api/products", {
      headers: authHeader(owner.token),
      data: sampleProductPayload(otherJastiper.userId, `WrongOwner-${RUN_ID}`),
    });
    expect(wrongOwner.status()).toBe(403);

    const invalidPayload = await api.post("/api/products", {
      headers: authHeader(owner.token),
      data: {
        ...sampleProductPayload(owner.userId, `Invalid-${RUN_ID}`),
        stock: -1,
        price: 0,
        imageUrl: "not-a-url",
      },
    });
    expect(invalidPayload.status()).toBe(400);
  });

  test("POST /api/products rejects oversized imageUrl", async () => {
    const oversizedImageUrl = `https://example.com/${"a".repeat(2050)}`;
    const response = await api.post("/api/products", {
      headers: authHeader(owner.token),
      data: {
        ...sampleProductPayload(owner.userId, `OversizedImage-${RUN_ID}`),
        imageUrl: oversizedImageUrl,
      },
    });

    expect(response.status()).toBe(400);
  });

  test("JASTIPER owner can PUT /api/products/{id}", async () => {
    const product = await createProduct(api, owner, {
      name: `OwnerUpdate-${RUN_ID}`,
      description: "before update",
      stock: 6,
    });
    createdProductIds.add(product.id);

    const response = await api.put(`/api/products/${product.id}`, {
      headers: authHeader(owner.token),
      data: {
        ...sampleProductPayload(owner.userId, `OwnerUpdated-${RUN_ID}`),
        description: "after update",
        stock: 9,
      },
    });
    expect(response.status()).toBe(200);

    const updated = (await response.json()) as ProductResponse;
    expect(updated.name).toBe(`OwnerUpdated-${RUN_ID}`);
    expect(updated.description).toBe("after update");
    expect(updated.stock).toBe(9);
  });

  test("PUT /api/products/{id} rejects non-owner, titipers, invalid payload, and nonexistent product", async () => {
    const product = await createProduct(api, owner, {
      name: `UpdateReject-${RUN_ID}`,
      description: "update reject target",
    });
    createdProductIds.add(product.id);

    const nonOwner = await api.put(`/api/products/${product.id}`, {
      headers: authHeader(otherJastiper.token),
      data: sampleProductPayload(otherJastiper.userId, `NonOwner-${RUN_ID}`),
    });
    expect(nonOwner.status()).toBe(403);

    const titipersUpdate = await api.put(`/api/products/${product.id}`, {
      headers: authHeader(titipers.token),
      data: sampleProductPayload(titipers.userId, `TitipersUpdate-${RUN_ID}`),
    });
    expect(titipersUpdate.status()).toBe(403);

    const invalidPayload = await api.put(`/api/products/${product.id}`, {
      headers: authHeader(owner.token),
      data: {
        ...sampleProductPayload(owner.userId, `InvalidUpdate-${RUN_ID}`),
        price: 0,
      },
    });
    expect(invalidPayload.status()).toBe(400);

    const missing = await api.put(`/api/products/${randomUuid()}`, {
      headers: authHeader(owner.token),
      data: sampleProductPayload(owner.userId, `Missing-${RUN_ID}`),
    });
    expect(missing.status()).toBe(404);
  });

  test("JASTIPER owner can DELETE /api/products/{id}", async () => {
    const product = await createProduct(api, owner, {
      name: `OwnerDelete-${RUN_ID}`,
      description: "delete target",
    });

    const response = await api.delete(`/api/products/${product.id}`, {
      headers: authHeader(owner.token),
    });
    expect(response.status()).toBe(204);
  });

  test("DELETE /api/products/{id} rejects unauthenticated, non-owner, titipers, and nonexistent product", async () => {
    const product = await createProduct(api, owner, {
      name: `DeleteReject-${RUN_ID}`,
      description: "delete reject target",
    });
    createdProductIds.add(product.id);

    const unauthenticated = await api.delete(`/api/products/${product.id}`);
    expect(unauthenticated.status()).toBe(403);

    const nonOwner = await api.delete(`/api/products/${product.id}`, {
      headers: authHeader(otherJastiper.token),
    });
    expect(nonOwner.status()).toBe(403);

    const titipersDelete = await api.delete(`/api/products/${product.id}`, {
      headers: authHeader(titipers.token),
    });
    expect(titipersDelete.status()).toBe(403);

    const missing = await api.delete(`/api/products/${randomUuid()}`, {
      headers: authHeader(owner.token),
    });
    expect(missing.status()).toBe(404);
  });

  test("POST /api/products/{id}/reserve succeeds for authenticated user", async () => {
    const product = await createProduct(api, owner, {
      name: `ReserveSuccess-${RUN_ID}`,
      description: "reserve success target",
      stock: 3,
    });
    createdProductIds.add(product.id);

    const response = await api.post(
      `/api/products/${product.id}/reserve?quantity=1`,
      {
        headers: authHeader(titipers.token),
      },
    );
    expect(response.status()).toBe(204);

    const detailResponse = await api.get(`/api/products/${product.id}`);
    expect(detailResponse.status()).toBe(200);
    const detail = (await detailResponse.json()) as ProductResponse;
    expect(detail.stock).toBe(2);
  });

  test("POST /api/products/{id}/reserve rejects unauthenticated, invalid quantity, missing product, and insufficient stock", async () => {
    const product = await createProduct(api, owner, {
      name: `ReserveReject-${RUN_ID}`,
      description: "reserve reject target",
      stock: 2,
    });
    createdProductIds.add(product.id);

    const unauthenticated = await api.post(
      `/api/products/${product.id}/reserve?quantity=1`,
    );
    expect(unauthenticated.status()).toBe(403);

    const invalidQuantity = await api.post(
      `/api/products/${product.id}/reserve?quantity=0`,
      {
        headers: authHeader(titipers.token),
      },
    );
    expect(invalidQuantity.status()).toBe(400);

    const missing = await api.post(
      `/api/products/${randomUuid()}/reserve?quantity=1`,
      {
        headers: authHeader(titipers.token),
      },
    );
    expect(missing.status()).toBe(404);

    const insufficient = await api.post(
      `/api/products/${product.id}/reserve?quantity=999`,
      {
        headers: authHeader(titipers.token),
      },
    );
    expect(insufficient.status()).toBe(409);
  });

  test("POST /api/products/{id}/reserve cannot make stock negative across repeated requests", async () => {
    const product = await createProduct(api, owner, {
      name: `ReserveDrain-${RUN_ID}`,
      description: "reserve depletion target",
      stock: 2,
    });
    createdProductIds.add(product.id);

    const firstReserve = await api.post(
      `/api/products/${product.id}/reserve?quantity=1`,
      {
        headers: authHeader(titipers.token),
      },
    );
    expect(firstReserve.status()).toBe(204);

    const secondReserve = await api.post(
      `/api/products/${product.id}/reserve?quantity=1`,
      {
        headers: authHeader(titipers.token),
      },
    );
    expect(secondReserve.status()).toBe(204);

    const thirdReserve = await api.post(
      `/api/products/${product.id}/reserve?quantity=1`,
      {
        headers: authHeader(titipers.token),
      },
    );
    expect(thirdReserve.status()).toBe(409);

    const detailResponse = await api.get(`/api/products/${product.id}`);
    expect(detailResponse.status()).toBe(200);
    const detail = (await detailResponse.json()) as ProductResponse;
    expect(detail.stock).toBe(0);
  });

  test("GET /api/admin/products allows admin and rejects non-admin or unauthenticated", async () => {
    const adminResponse = await api.get("/api/admin/products", {
      headers: authHeader(admin.token),
    });
    expect(adminResponse.status()).toBe(200);
    expect(Array.isArray(await adminResponse.json())).toBeTruthy();

    const nonAdmin = await api.get("/api/admin/products", {
      headers: authHeader(owner.token),
    });
    expect(nonAdmin.status()).toBe(403);

    const unauthenticated = await api.get("/api/admin/products");
    expect(unauthenticated.status()).toBe(403);
  });

  test("PUT /api/admin/products/{id} allows admin and rejects invalid or unauthorized requests", async () => {
    const product = await createProduct(api, owner, {
      name: `AdminUpdateTarget-${RUN_ID}`,
      description: "admin update target",
      stock: 4,
    });
    createdProductIds.add(product.id);

    const adminUpdate = await api.put(`/api/admin/products/${product.id}`, {
      headers: authHeader(admin.token),
      data: {
        ...sampleProductPayload(owner.userId, `AdminUpdated-${RUN_ID}`),
        description: "updated by admin",
        stock: 12,
      },
    });
    expect(adminUpdate.status()).toBe(200);
    const updated = (await adminUpdate.json()) as ProductResponse;
    expect(updated.description).toBe("updated by admin");
    expect(updated.stock).toBe(12);

    const invalidPayload = await api.put(`/api/admin/products/${product.id}`, {
      headers: authHeader(admin.token),
      data: {
        ...sampleProductPayload(owner.userId, `AdminInvalid-${RUN_ID}`),
        stock: -1,
      },
    });
    expect(invalidPayload.status()).toBe(400);

    const nonAdmin = await api.put(`/api/admin/products/${product.id}`, {
      headers: authHeader(owner.token),
      data: sampleProductPayload(owner.userId, `ForbiddenAdmin-${RUN_ID}`),
    });
    expect(nonAdmin.status()).toBe(403);

    const missing = await api.put(`/api/admin/products/${randomUuid()}`, {
      headers: authHeader(admin.token),
      data: sampleProductPayload(owner.userId, `MissingAdmin-${RUN_ID}`),
    });
    expect(missing.status()).toBe(404);
  });

  test("DELETE /api/admin/products/{id} allows admin and rejects unauthorized or missing product", async () => {
    const product = await createProduct(api, owner, {
      name: `AdminDeleteTarget-${RUN_ID}`,
      description: "admin delete target",
    });

    const nonAdmin = await api.delete(`/api/admin/products/${product.id}`, {
      headers: authHeader(owner.token),
    });
    expect(nonAdmin.status()).toBe(403);

    const adminDelete = await api.delete(`/api/admin/products/${product.id}`, {
      headers: authHeader(admin.token),
    });
    expect(adminDelete.status()).toBe(204);

    const missing = await api.delete(`/api/admin/products/${randomUuid()}`, {
      headers: authHeader(admin.token),
    });
    expect(missing.status()).toBe(404);
  });
});

function authHeader(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
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
  overrides: Partial<ReturnType<typeof sampleProductPayload>> = {},
) {
  const payload = {
    ...sampleProductPayload(actor.userId, `Inventory-${RUN_ID}`),
    ...overrides,
  };
  const response = await api.post("/api/products", {
    headers: authHeader(actor.token),
    data: payload,
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as ProductResponse;
}

function sampleProductPayload(jastiperId: string, name: string) {
  return {
    name,
    description: `Functional test payload ${name}`,
    imageUrl: "https://example.com/product.png",
    price: 125000,
    stock: 5,
    originCountry: "JP",
    purchaseDate: futureDateIso(10),
    jastiperId,
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
