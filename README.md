# JSON Frontend

Next.js frontend for JaStip Online Nasional (JSON).

## Stack

1. Next.js 16
2. React
3. TypeScript
4. Tailwind CSS

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Configure backend URL:

```bash
cp .env.example .env.local
```

Set:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

3. Start dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Build and Quality

```bash
npm run lint
npm run build
```

## Key Routes

1. `/auth/login`
2. `/auth/register`
3. `/inventory`
4. `/products/[id]`
5. `/my/inventory`
6. `/orders`
7. `/orders/[id]`
8. `/wallet`
9. `/profile/me`
10. `/kyc`
11. `/admin/products`
12. `/admin/users`
13. `/admin/kyc`

## Notes

1. Frontend is role-aware (`ADMIN`, `JASTIPER`, `TITIPERS`) using auth guard and role gate.
2. Inventory checkout path is aligned with backend event-driven reserve flow.
