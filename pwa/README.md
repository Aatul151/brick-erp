# Next.js App Router PWA (Minimal Caching)

Production-ready Next.js latest App Router starter with TypeScript, Tailwind CSS, ESLint, and `next-pwa`.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Start development server:

```bash
npm run dev
```

PWA is intentionally disabled in development mode.

## Production Build

```bash
npm run build
npm run start
```

Service worker is generated only for production builds.

## PWA Notes

- Installable PWA enabled with `next-pwa`
- Runtime caching is disabled by not defining any fetch caching strategy
- Service worker is minimal and has no fetch caching logic
- `/pwa-check` route validates service worker + standalone mode
- `robots.txt` and `sitemap.xml` are generated dynamically from `NEXT_PUBLIC_APP_URL`

## Test Installability in Chrome

1. Run production server (`npm run build && npm run start`)
2. Open `http://localhost:3000`
3. Open DevTools -> Application -> Manifest and verify icons + installability
4. Use the install icon in Chrome address bar, or DevTools -> Application -> Service Workers
5. Visit `http://localhost:3000/pwa-check` and confirm:
   - Service worker registered
   - Standalone mode changes to Yes after install

## Lighthouse Checklist

- Run Lighthouse in Chrome on production build
- PWA category should detect a valid manifest
- Service worker should be present and controlled
- `start_url` should load successfully
- Theme and background colors should be valid
- Icons (192 and 512) should be reachable

## Deployment

Ready for:

- Vercel (recommended)
- Any Node.js hosting (including Hostinger Node hosting) using:
  - `npm install`
  - `npm run build`
  - `npm run start`

## Domain Configuration

Before production deployment, set:

- `NEXT_PUBLIC_APP_URL` to your real domain (for Open Graph, sitemap, robots)
- `NEXT_PUBLIC_APP_NAME` to your final product name

## Internal API Proxy (Hide External API Key)

This project includes a server-side proxy route:

- `app/api/external/[...path]/route.ts`
- Browser calls your internal endpoint: `/api/external/<external-path>`
- Server route forwards request to `EXTERNAL_API_BASE_URL/<external-path>`
- `EXTERNAL_API_KEY` is injected on the server as `Authorization: Bearer <key>`
- Key never reaches browser bundles

### Required server env variables

- `EXTERNAL_API_BASE_URL`
- `EXTERNAL_API_KEY`

### Example calls

```ts
// GET from browser/client component
const res = await fetch("/api/external/users?page=1", { method: "GET" });
const data = await res.json();
```

```ts
// POST from browser/client component
const res = await fetch("/api/external/orders", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ itemId: 123, qty: 2 }),
});
const data = await res.json();
```

## Basic Auth Layout Flow (Route Groups)

- `app/(auth)/login/page.tsx` uses auth layout
- `app/(protected)/layout.tsx` wraps authenticated pages
- `app/(protected)/page.tsx` is protected home (`/`)
- `proxy.ts` redirects unauthenticated users to `/login`
- Login sets an httpOnly cookie via `POST /api/auth/login`
- Logout clears cookie via `POST /api/auth/logout`

## TODO Before Publish

- [ ] Update `.env.local` with real `NEXT_PUBLIC_APP_NAME`
- [ ] Update `.env.local` with real `NEXT_PUBLIC_APP_URL`
- [ ] Update `.env.local` with real `EXTERNAL_API_BASE_URL`
- [ ] Update `.env.local` with real `EXTERNAL_API_KEY`
- [ ] Run `npm run build` and verify `/robots.txt` + `/sitemap.xml` reflect your real domain
- [ ] Run `npm run prepublish-check` (fails if app name/domain is missing or placeholder)
