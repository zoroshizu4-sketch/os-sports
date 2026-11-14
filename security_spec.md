# Security Specification — OS SPORTS TURF Firestore Rules

## 1. Data Invariants
1. **PII Isolation**: Customer PII (`customerName`, `customerPhone`, `notes`) exists ONLY in `/bookings/{bookingId}` and can NEVER be read, listed, updated, or deleted by unauthenticated or non-admin users.
2. **Atomic Double-Booking Prevention**: Every `/slotLocks/{slotId}` document (`YYYY-MM-DD_H`) may only be created once (`!exists` implicit in `allow create`), and non-admin creation requires `existsAfter(/databases/$(database)/documents/bookings/$(incoming().bookingId))` so orphaned locks cannot be created without a real booking.
3. **Zero Client Timestamp Spoofing**: All `createdAt` and `updatedAt` fields must equal `request.time`.
4. **Admin Verification**: Admin access requires `request.auth != null && request.auth.token.email_verified == true` and email matching `zoroshizu4@gmail.com` or membership in `/admins/{uid}`.
5. **Strict Key & Size Enforcement**: Every collection enforces `keys().hasAll(...)` and `keys().hasOnly(...)` plus `.size()` bounds on all strings and lists.

## 2. Dirty Dozen Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated read of `/bookings`** (`get` or `list`) -> Denied.
2. **Signed-in non-admin read of `/bookings/{id}`** -> Denied.
3. **Unverified email spoofing admin email (`email_verified: false`)** -> Denied.
4. **Shadow field injection on `/bookings` create** (`isAdmin: true` or `extra: 1`) -> Denied by `keys().hasOnly`.
5. **Spoofed status on public `/bookings` create** (`status: 'confirmed'`) -> Denied (`status == 'pending'`).
6. **Spoofed timestamp on `/bookings` create** (`createdAt` != `request.time`) -> Denied.
7. **1MB string poisoning in `customerName` or `notes`** -> Denied by `.size()` checks.
8. **Oversized or malformed document ID on `/bookings/{id}`** -> Denied by `isValidId`.
9. **Orphaned `/slotLocks` create without corresponding `/bookings` document** -> Denied by `existsAfter`.
10. **Duplicate `/slotLocks` overwrite / update by non-admin** -> Denied (`allow update: if isAdmin()`).
11. **Non-admin modification of `/settings/venue` rates or hours** -> Denied.
12. **Wildcard read/write on arbitrary collection `/users` or `/secret`** -> Denied by default-deny catch-all.
