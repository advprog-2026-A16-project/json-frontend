import { expect, request as playwrightRequest, test, type APIRequestContext } from "@playwright/test";

type AuthResponse = {
  token: string;
  message: string;
  email: string;
  role: "ADMIN" | "JASTIPER" | "TITIPERS";
  userId: string;
};

type WalletResponse = {
  userId: string;
  balance: number | string;
};

type TransactionType = "TOP_UP" | "WITHDRAWAL" | "PAYMENT" | "REFUND";
type TransactionStatus = "PENDING" | "SUCCESS" | "FAILED";

type TransactionResponse = {
  id: string;
  userId: string;
  amount: number | string;
  type: TransactionType;
  status: TransactionStatus;
  referenceId?: string | null;
  description?: string | null;
  destinationAccount?: string | null;
  paymentProvider?: string | null;
  gatewayOrderId?: string | null;
  paymentToken?: string | null;
  paymentRedirectUrl?: string | null;
  createdAt?: string | null;
};

const BASE_URL =
  process.env.BACKEND_BASE_URL ??
  "https://json-backend-staging-9413d4381c05.herokuapp.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@email.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin123";
const DEFAULT_PASSWORD = process.env.TEST_USER_PASSWORD ?? "Admin123";
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.describe.serial("Wallet functional testing against staging", () => {
  let api: APIRequestContext;
  let admin: AuthResponse;
  let user: AuthResponse;

  test.beforeAll(async () => {
    api = await playwrightRequest.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        Accept: "application/json",
      },
    });

    admin = await login(api, ADMIN_EMAIL, ADMIN_PASSWORD);
    user = await registerUser(api, `wallet-${RUN_ID}`);
    user = await login(api, user.email, DEFAULT_PASSWORD);

    await getWallet(api, user);
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test("GET /api/wallet creates an authenticated user's wallet", async () => {
    const wallet = await getWallet(api, user);
    expect(wallet.userId).toBe(user.userId);
    expect(asNumber(wallet.balance)).toBe(0);

    const transactionsResponse = await api.get("/api/wallet/transactions", {
      headers: authHeader(user.token),
    });
    expect(transactionsResponse.status()).toBe(200);

    const transactions = (await transactionsResponse.json()) as TransactionResponse[];
    expect(transactions).toEqual([]);
  });

  test("Wallet endpoints reject unauthenticated and non-admin requests", async () => {
    const unauthenticatedWallet = await api.get("/api/wallet");
    expect(unauthenticatedWallet.status()).toBe(403);

    const unauthenticatedTopUp = await api.post("/api/wallet/top-up", {
      data: { amount: 10000 },
    });
    expect(unauthenticatedTopUp.status()).toBe(403);

    const unauthenticatedTransactions = await api.get("/api/wallet/transactions");
    expect(unauthenticatedTransactions.status()).toBe(403);

    const nonAdminRefund = await api.post("/api/wallet/refund", {
      headers: authHeader(user.token),
      data: { userId: user.userId, amount: 10000 },
    });
    expect(nonAdminRefund.status()).toBe(403);

    const nonAdminVerify = await api.patch(
      `/api/wallet/transactions/${randomUuid()}/verify`,
      {
        headers: authHeader(user.token),
        data: { success: true },
      },
    );
    expect(nonAdminVerify.status()).toBe(403);
  });

  test("Wallet endpoints reject invalid payloads", async () => {
    const invalidTopUp = await api.post("/api/wallet/top-up", {
      headers: authHeader(user.token),
      data: { amount: 0 },
    });
    expect(invalidTopUp.status()).toBe(400);
    await expectMessage(invalidTopUp, "Amount must be greater than zero");

    const invalidWithdrawal = await api.post("/api/wallet/withdraw/request", {
      headers: authHeader(user.token),
      data: { amount: 10000, destinationAccount: "   " },
    });
    expect(invalidWithdrawal.status()).toBe(400);
    await expectMessage(invalidWithdrawal, "Destination account is required");

    const invalidRefund = await api.post("/api/wallet/refund", {
      headers: authHeader(admin.token),
      data: { amount: 10000 },
    });
    expect(invalidRefund.status()).toBe(400);
    await expectMessage(invalidRefund, "User ID is required");

    const invalidVerify = await api.patch(
      `/api/wallet/transactions/${randomUuid()}/verify`,
      {
        headers: authHeader(admin.token),
        data: {},
      },
    );
    expect(invalidVerify.status()).toBe(400);
    await expectMessage(invalidVerify, "Verification result is required");
  });

  test("POST /api/wallet/top-up credits balance and records a success transaction", async () => {
    const before = await getWallet(api, user);
    const amount = 125000;

    const response = await api.post("/api/wallet/top-up", {
      headers: authHeader(user.token),
      data: { amount },
    });
    expect(response.status()).toBe(200);

    const wallet = (await response.json()) as WalletResponse;
    expect(wallet.userId).toBe(user.userId);
    expect(asNumber(wallet.balance)).toBe(asNumber(before.balance) + amount);

    const transactions = await getTransactions(api, user);
    expect(
      transactions.some(
        (transaction) =>
          transaction.userId === user.userId &&
          transaction.type === "TOP_UP" &&
          transaction.status === "SUCCESS" &&
          asNumber(transaction.amount) === amount,
      ),
    ).toBeTruthy();
  });

  test("POST /api/wallet/payment rejects insufficient balance", async () => {
    const insufficient = await api.post("/api/wallet/payment", {
      headers: authHeader(user.token),
      data: { amount: 999999999 },
    });
    expect(insufficient.status()).toBe(400);

    const body = (await insufficient.json()) as { error: string; message: string };
    expect(body.error).toBe("Saldo tidak mencukupi");
    expect(body.message).toContain("top-up");
  });

  test("POST /api/wallet/withdraw debits balance and withdrawal request stays pending", async () => {
    await topUp(api, user, 90000);
    const beforeWithdraw = await getWallet(api, user);
    const withdrawAmount = 20000;

    const withdraw = await api.post("/api/wallet/withdraw", {
      headers: authHeader(user.token),
      data: {
        amount: withdrawAmount,
        destinationAccount: "BCA 1234567890",
      },
    });
    expect(withdraw.status()).toBe(200);

    const wallet = (await withdraw.json()) as WalletResponse;
    expect(asNumber(wallet.balance)).toBe(
      asNumber(beforeWithdraw.balance) - withdrawAmount,
    );

    const beforeRequest = await getWallet(api, user);
    const request = await api.post("/api/wallet/withdraw/request", {
      headers: authHeader(user.token),
      data: {
        amount: 10000,
        destinationAccount: " OVO 08123456789 ",
      },
    });
    expect(request.status()).toBe(200);

    const transaction = (await request.json()) as TransactionResponse;
    expect(transaction.type).toBe("WITHDRAWAL");
    expect(transaction.status).toBe("PENDING");
    expect(transaction.destinationAccount).toBe("OVO 08123456789");

    const afterRequest = await getWallet(api, user);
    expect(asNumber(afterRequest.balance)).toBe(asNumber(beforeRequest.balance));
  });

  test("Admin can verify a pending top-up request and update wallet balance", async () => {
    const before = await getWallet(api, user);
    const amount = 45000;

    const pendingResponse = await api.post("/api/wallet/top-up/request", {
      headers: authHeader(user.token),
      data: { amount },
    });
    expect(pendingResponse.status()).toBe(200);

    const pendingTransaction = (await pendingResponse.json()) as TransactionResponse;
    expect(pendingTransaction.type).toBe("TOP_UP");
    expect(pendingTransaction.status).toBe("PENDING");

    const afterRequest = await getWallet(api, user);
    expect(asNumber(afterRequest.balance)).toBe(asNumber(before.balance));

    const description = `Verified top-up ${RUN_ID}`;
    const verifyResponse = await api.patch(
      `/api/wallet/transactions/${pendingTransaction.id}/verify`,
      {
        headers: authHeader(admin.token),
        data: { success: true, description },
      },
    );
    expect(verifyResponse.status()).toBe(200);

    const verifiedTransaction = (await verifyResponse.json()) as TransactionResponse;
    expect(verifiedTransaction.status).toBe("SUCCESS");
    expect(verifiedTransaction.description).toBe(description);

    const afterVerify = await getWallet(api, user);
    expect(asNumber(afterVerify.balance)).toBe(asNumber(before.balance) + amount);
  });

  test("POST /api/wallet/refund rejects a missing target wallet", async () => {
    const response = await api.post("/api/wallet/refund", {
      headers: authHeader(admin.token),
      data: { userId: randomUuid(), amount: 30000 },
    });
    expect(response.status()).toBe(404);

    const body = (await response.json()) as { error: string; message: string };
    expect(body.error).toBe("Wallet tidak ditemukan");
    expect(body.message).toContain("Dompet digital");
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

async function getWallet(api: APIRequestContext, actor: Pick<AuthResponse, "token">) {
  const response = await api.get("/api/wallet", {
    headers: authHeader(actor.token),
  });
  expect(response.status()).toBe(200);
  return (await response.json()) as WalletResponse;
}

async function getTransactions(
  api: APIRequestContext,
  actor: Pick<AuthResponse, "token">,
) {
  const response = await api.get("/api/wallet/transactions", {
    headers: authHeader(actor.token),
  });
  expect(response.status()).toBe(200);
  return (await response.json()) as TransactionResponse[];
}

async function topUp(
  api: APIRequestContext,
  actor: Pick<AuthResponse, "token">,
  amount: number,
) {
  const response = await api.post("/api/wallet/top-up", {
    headers: authHeader(actor.token),
    data: { amount },
  });
  expect(response.status()).toBe(200);
  return (await response.json()) as WalletResponse;
}

async function expectMessage(response: { json: () => Promise<unknown> }, message: string) {
  const body = (await response.json()) as { message?: string };
  expect(body.message).toBe(message);
}

function asNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

function randomUuid() {
  return crypto.randomUUID();
}
