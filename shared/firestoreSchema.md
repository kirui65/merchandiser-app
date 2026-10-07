# Firestore Schema Reference

Source of truth for collection shapes used by `backend/src/models/*` (Zod)
and referenced by the mobile app and admin dashboard. Keep this file in
sync whenever a model changes.

## `reps`
```
{
  id: string,
  name: string,
  phone: string,
  email: string,
  passwordHash: string,
  role: 'rep' | 'manager' | 'brand_ambassador' | 'telemarketer' | 'team_leader',
  assignedOutletIds: string[],
  active: boolean,
  createdAt: Timestamp
}
```

## `outlets`
```
{
  id: string,
  name: string,
  location: GeoPoint,
  address: string,
  assignedRepId: string,
  territoryId?: string,
  active: boolean
}
```

## `territories`
```
{
  id: string,
  name: string,
  description?: string
}
```

## `auditLog`

Manager-only audit entries for roster, product, and outlet mutations:

```js
{
  actorId: string,
  actorRole: 'manager',
  action: 'created' | 'edited' | 'deactivated' | 'reactivated' | 'password_reset',
  entityType: 'rep' | 'product' | 'outlet',
  entityId: string,
  entityName: string,
  changedFields: string[],
  createdAt: Timestamp
}
```

## `products`
```
{
  id: string,
  name: string,
  sku: string,
  defaultPrice: number,
  category: string,
  active: boolean
}
```

## `sales`
```
{
  id: string,
  localId: string,        // client-generated UUID, idempotency key
  repId: string,
  teamId: string | null,
  outletId: string,
  productId: string,
  qty: number,
  unitPrice: number,
  total: number,
  timestamp: Timestamp,
  photoUrl: string | null,
  syncStatus: 'pending' | 'synced' | 'failed',
  createdAt: Timestamp
}
```
`teamId` is resolved server-side from the rep's active team membership.
Idempotency: `(repId, localId)` must be unique. A duplicate write with the
same `localId` from the same rep returns the existing record, not an error.

## `leads`
```
{
  id: string,
  telemarketerId: string,
  teamId: string | null,
  campaignId: string | null,
  name: string,
  organization?: string,
  phone: string,
  email?: string,
  source?: string,
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'not_interested' | 'closed',
  score: 'hot' | 'warm' | 'cold' | 'unscored',
  scoreValue?: number,
  nextFollowUpAt?: Timestamp,
  lastCalledAt?: Timestamp,
  callCount: number,
  notes?: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```
`teamId` is resolved by the backend from the submitter's current active
`teamMemberships` record and active team; values supplied by clients are
never trusted. If a user has no active team, the record stores `null`. If a
user has multiple active teams, field writes are rejected until membership
is corrected.
`telemarketerId` is always taken from the authenticated user. `teamId` is
resolved from the authenticated user's active team membership at write time.

## `calls`
```
{
  id: string,
  leadId: string,
  telemarketerId: string,
  teamId: string | null,
  campaignId?: string,
  startedAt: Timestamp,
  endedAt?: Timestamp,
  durationSeconds?: number,
  outcome: 'answered' | 'no_answer' | 'busy' | 'voicemail' | 'callback_requested' | 'wrong_number',
  notes?: string,
  followUpAt?: Timestamp,
  statusAfterCall?: 'new' | 'contacted' | 'qualified' | 'converted' | 'not_interested' | 'closed',
  scoreAfterCall?: 'hot' | 'warm' | 'cold' | 'unscored',
  createdAt: Timestamp
}
```
Calls are created in the same Firestore transaction that increments the
lead's `callCount`, sets `lastCalledAt`, and applies any follow-up/status/
score changes.

## `activations`
```
{
  id: string,
  ambassadorId: string,
  teamId: string | null,
  campaignId: string | null,
  activityType: 'product_sampling' | 'roadshow' | 'in_store_demo' | 'street_activation',
  status: 'draft' | 'submitted' | 'approved' | 'rejected',
  location: GeoPoint,
  startedAt: Timestamp,
  endedAt?: Timestamp,
  footfallCount: number,
  media: [{ storageUri: string, mediaType: 'photo' | 'video', contentType: string, capturedAt: Timestamp }],
  surveyResponses: [{ questionId: string, answer: string, respondentConsent: boolean, capturedAt: Timestamp }],
  samplesDistributed: [{ productId: string, quantity: number, unit?: string }],
  floatAmount: number,
  expenses: [{ expenseType: string, amount: number, receiptStorageUri?: string, description?: string, incurredAt: Timestamp }],
  floatRemaining?: number,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```
Activity types are currently controlled to `product_sampling`, `roadshow`,
`in_store_demo`, and `street_activation`. Float and expense amounts are
plain KES numbers, consistent with `sales.total`. Brand ambassadors own
their activation records; they can edit drafts and submit them. Managers
can approve/reject submitted activations. Team-leader review scope is
deferred to Phase 4.

## `merchandisingAudits`
```
{
  id: string,
  merchandiserId: string,
  teamId: string | null,
  outletId: string,
  campaignId?: string,
  location?: { lat: number, lng: number },
  observedAt: Timestamp,
  stockChecks: [{ productId: string, shelfQuantity?: number, backroomQuantity?: number, lowStock: boolean, reorderRequested: boolean }],
  planogram: { standardId?: string, compliant: boolean, compliancePercent?: number, deviations: [{ productId?: string, expectedPosition?: string, actualPosition?: string, description?: string }] },
  photoStorageUris: string[],
  notes?: string,
  createdAt: Timestamp
}
```

## `competitorPrices`
```
{
  id: string,
  merchandiserId: string,
  teamId: string | null,
  outletId: string,
  campaignId?: string,
  competitorName: string,
  competitorProductName: string,
  competitorSku?: string,
  ourProductId?: string,
  price: number,
  observedAt: Timestamp,
  photoStorageUri?: string,
  createdAt: Timestamp
}
```
Prices are plain float KES values, consistent with `sales.total`.

## `outletOnboarding`
```
{
  id: string,
  submittedBy: string,
  name: string,
  address: string,
  location: { lat: number, lng: number },
  photoStorageUri: string,
  status: 'pending_review' | 'approved' | 'rejected',
  outletId?: string,
  createdAt: Timestamp,
  reviewedAt?: Timestamp,
  reviewedBy?: string
}
```
New field-sourced outlets remain in `outletOnboarding` until a manager
approves them. Approval creates the active `outlets` document and links its
ID back to the request; rejected/pending submissions never appear in the
operational outlet list.

## `salesTargets`

One deterministic document per representative and calendar month (`{repId}_{YYYY-MM}`):

```js
{
  repId: string,
  month: 'YYYY-MM',
  amount: number,
  createdAt: Timestamp
}
```

## `routes` (one doc per rep per day)
```
{
  id: string,             // e.g. `${repId}_${YYYY-MM-DD}`
  repId: string,
  date: string,            // YYYY-MM-DD
  pings: [{ lat: number, lng: number, timestamp: Timestamp }],
  plannedOutletIds: string[],
  visitedOutletIds: string[]
}
```

## `mpesaTransactions`
```
{
  id: string,
  repId: string,
  outletId: string | null,   // inferred later by reconciliation
  amount: number,
  mpesaReceiptNumber: string,
  phoneNumber: string,
  timestamp: Timestamp,
  status: string,
  matchedSaleId: string | null
}
```
Written only by the backend via the Daraja callback — never directly by
a client.

## Access control

All writes go through the Express API using the Firebase **Admin SDK**,
which bypasses `firestore/firestore.rules`. The rules file is a
defense-in-depth backstop only. Real authorization lives in
`backend/src/middleware/auth.middleware.js` and must be enforced in every
controller:
- A rep may only read/write `sales` and `routes` docs where `repId` matches
  their own JWT-authenticated `uid`.
- A manager (`role === 'manager'`) may read everything.
- A telemarketer may only read and update leads/calls owned by their JWT uid.
- A brand ambassador may only read/write activations owned by their JWT uid.
- A manager may read all activations and review submitted activations.
- A merchandiser (`role === 'rep'`) may only read/write their own
  merchandising audits, competitor prices, and outlet onboarding requests.
- Managers can read and manage all merchandising records, review outlet
  onboarding, and create the approved outlet.
- No client role may write `mpesaTransactions` directly.

Required composite indexes for telemarketer queries:
- `leads(telemarketerId ASC, status ASC, updatedAt DESC)`
- `leads(teamId ASC, nextFollowUpAt ASC)`
- `calls(leadId ASC, startedAt DESC)`
- `calls(telemarketerId ASC, startedAt DESC)`
- `activations(ambassadorId ASC, startedAt DESC)`
- `activations(teamId ASC, startedAt DESC)`
- `merchandisingAudits(merchandiserId ASC, observedAt DESC)`
- `merchandisingAudits(outletId ASC, observedAt DESC)`
- `competitorPrices(outletId ASC, observedAt DESC)`
- `competitorPrices(ourProductId ASC, observedAt DESC)`
- `outletOnboarding(submittedBy ASC, createdAt DESC)`

The new composites are defined in `firestore/firestore.indexes.json` but
are not live until a project administrator deploys them with
`firebase deploy --only firestore:indexes`.
