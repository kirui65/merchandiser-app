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
`telemarketerId` is always taken from the authenticated user. `teamId` is
stored as `null` until team membership scoping is introduced.

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
- No client role may write `mpesaTransactions` directly.

Required composite indexes for telemarketer queries:
- `leads(telemarketerId ASC, status ASC, updatedAt DESC)`
- `leads(teamId ASC, nextFollowUpAt ASC)`
- `calls(leadId ASC, startedAt DESC)`
- `calls(telemarketerId ASC, startedAt DESC)`
