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
  role: 'rep' | 'manager',
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
  active: boolean
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
- No client role may write `mpesaTransactions` directly.
