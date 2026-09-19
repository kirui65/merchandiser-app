# Merchandiser Sales, Route & Revenue Tracking App

Full-stack field-sales tracking system: offline-first mobile app for
merchandisers, an Express/Firestore backend, and an admin dashboard for
managers — with M-Pesa reconciliation as the core differentiator.

Three independent sub-projects: `mobile/`, `backend/`, `admin-dashboard/`.
Each has its own `package.json` and runs independently.

---

## Phase 1 — Sales logging + basic dashboard (this build)

### What was built

**Backend** (`backend/`) — fully implemented and tested:
- Express app skeleton with CORS, JSON body parsing, centralized error handling
- Firebase Admin SDK init (`src/config/firebase.js`), lazy — only touches
  Firestore on first real query, so the server boots cleanly even without
  credentials configured (verified locally)
- JWT auth middleware (`src/middleware/auth.middleware.js`) — **this is the
  real authorization boundary for the whole app**, not `firestore.rules`
  (see note below)
- `POST /api/auth/login` — email/password against `reps`, bcrypt-verified,
  issues a JWT carrying `{ uid, role }`
- CRUD for `sales`, `outlets`, `products`, `reps`, scoped so a rep can only
  read/write their own sales, and only managers can manage the roster/catalog
- **Idempotent sales writes**: a duplicate `localId` from the same rep
  returns the existing record with a 200 (not an error), so the mobile sync
  manager can safely retry after a dropped acknowledgment without creating
  duplicate sales or getting stuck in a retry loop
- `GET /api/dashboard/totals` — aggregates sales by rep/outlet/product/day
  (manager-only)
- Phase 2/3 route files (`routes.routes.js`, `mpesa.routes.js`) are mounted
  as minimal 501 stubs rather than left broken, so the app boots today

**Mobile** (`mobile/`):
- `src/offline/syncManager.js` — built and unit-tested standalone with
  mocked network state and a mocked queue, **before** any UI was wired to
  it, per the build order. Covers: successful sync, offline no-op, the
  dropped-ack/duplicate case (server says "already have this `localId`" →
  still marked synced, no infinite retry), transient network failure
  (marked failed, retried next cycle), and concurrent sync calls (second
  call is skipped, no double-submit). All 5 scenarios pass.
- `src/offline/db.js` + `src/offline/salesQueue.js` — SQLite-backed local
  queue (`pending_sales` table): every sale write lands here first, marked
  `pending`, before any network call is attempted
- `src/api/` — axios client with auth header injection, login/logout,
  a `postSale` wrapper shaped to return `{status, data}` (not throw on
  4xx/5xx) so `syncManager` can branch on status codes
- `src/auth/` — `AuthContext` + `LoginScreen`, functional
- Remaining screens (`SaleEntryScreen`, `HomeScreen`, `OutletListScreen`,
  `HistoryScreen`), components, and navigation are still stub files with
  `// TODO` markers — **not yet built**. Wiring the sale-entry form to
  `salesQueue.enqueueSale()` + `syncManager` is the next piece of work.

**Admin dashboard** (`admin-dashboard/`) — functional:
- Vite + React, manager-only login (rejects non-manager tokens client-side
  as a UX nicety; the backend enforces it regardless), protected routing
- `Dashboard` page: fetches `/api/dashboard/totals`, renders a bar chart
  (sales by day, Recharts) and a totals-by-rep table
- `RepsPage`, `OutletsPage`, `RouteReplayPage`, `ReconciliationPage` remain
  stubs — not built yet (RouteReplayPage and ReconciliationPage are Phase
  2/3 anyway; RepsPage/OutletsPage management UIs are a Phase 1 gap)

**Firestore** (`firestore/`):
- `firestore.rules` written as a defense-in-depth backstop mirroring the
  backend's scoping logic — **not the primary access control layer**, since
  all writes go through the Admin SDK and bypass rules entirely. See the
  note at the top of the file and in `shared/firestoreSchema.md`.
- `firestore.indexes.json` — composite indexes for the sales/routes/mpesa
  queries the dashboard and sync logic actually run

### What was verified

- All backend source files pass `node --check` (syntax)
- Backend installed (`npm install`) and boot-tested locally: `/health`
  returns 200, an unauthenticated `/api/sales` request correctly returns
  401, an unknown route correctly returns 404
- `syncManager.js` unit-tested standalone (5/5 scenarios passing) with a
  mocked queue and mocked API client — no SQLite or React Native runtime
  required for this test

### What was NOT done in this pass (known gaps)

- Mobile: `SaleEntryScreen`, `HomeScreen`, `OutletListScreen`,
  `HistoryScreen`, all `components/`, `AppNavigator.js` — stubs only
- Admin dashboard: `RepsPage`, `OutletsPage` management UIs — stubs only
- No automated test suite wired into `backend/tests/` or a mobile test
  runner yet — the verification above was done ad hoc in this session
- `products.routes.js` uses an inline Zod schema rather than a
  `models/product.model.js` file, since the original folder structure
  didn't list one — flag if you'd rather it match the `sale`/`outlet`/`rep`
  pattern

### How to run locally

**Backend**
```bash
cd backend
npm install
cp .env.example .env   # fill in JWT_SECRET and Firebase service account values
npm run dev            # nodemon, http://localhost:4000
```

**Admin dashboard**
```bash
cd admin-dashboard
npm install
cp .env.example .env   # VITE_API_URL, defaults to localhost:4000/api
npm run dev             # http://localhost:5173
```

**Mobile**
```bash
cd mobile
npm install
cp .env.example .env   # EXPO_PUBLIC_API_URL — use your LAN IP for a physical device
npx expo start
```

To create your first manager login, either seed one directly in Firestore
(`reps` collection, with a bcrypt-hashed password and `role: "manager"`),
or temporarily call `POST /api/reps` with a manually-issued JWT before any
real access control is in place — document whichever approach you use in
this README once decided.

---

## Phase 2 — Route/GPS tracking
Not started.

## Phase 3 — M-Pesa reconciliation
Not started.
