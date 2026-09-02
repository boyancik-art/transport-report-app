# v44.3 — dashboard and secure application shell

Scope: cloudflare-migration, Cloudflare Pages, additive Supabase application security. No main/Vercel/iOS changes. v44.0 financial formulas and tariff data unchanged.

## Reporting

- Five tabs retained; sign-out only in Menu.
- Six global periods. Day is one selected date; week is Monday–Sunday; month/year are calendar periods. Half-year is six calendar months ending in the selected month, compared with the immediately preceding six months. Custom uses the preceding equal number of inclusive days.
- Previous-period reads use independent operations, finance and courier snapshots. Existing functions run synchronously inside restored contexts; asynchronous I/O never swaps the active operational dataset.
- Existing invoice allocations, extra TT allocations, full-month fleet allocation and tariff-group membership remain unchanged. IDs are fetched in chunks of 150, result pages of 1000.
- Dashboard: local/courier/replenishment summaries with selectable SVG time-series metrics, previous-period lines, accessible point values and textual data disclosures. Analytics: summaries and numerical drilldowns.
- Local branches/businesses/zones/routes/TT; courier carriers first, then businesses/branches/routes/TT. SAV/STV zone expenses explicitly shown. Manual/unlinked records remain explicit.
- Pickup and unclassified Base routes excluded. Unknown partner coverage/rates remain marked incomplete; no invented average, logistics percentage or comparison when inputs are missing.
- Replenishment uses existing dated branch_replenishments, weighted cost per pallet. Monthly STV interbranch records stay in expenses, not silently spread over daily dates or double-counted.
- Base now contains only unclassified imports. Existing section_override editor persists manual classification.
- Actual courier chooser and delivery tariff editor show delivery date.

## Navigation and Menu

Edge swipe: starts within 26px of left edge, >75px horizontal displacement, <50px vertical movement, <800ms. Input widgets excluded. Existing back buttons share history. Modals close before navigation; reports restore the drilldown.

Menu: Profile, Security, Theme, Ideas, Users/rights (admin), Directories (admin), Data sync, Audit (admin), About, Logout. Themes dark/light/system stored per browser and follow OS changes in system mode. Feedback is persisted with user ownership. User role changes are server-checked and serialized to preserve the last active Administrator.

## Deletion

Recoverable tombstones for imported and manual routes. Server RPC checks active profiles.role=admin. Routes SELECT policy and restrictive manual-route SELECT policy exclude tombstones. Imported tombstones key by route date/delivery ID, so reimport does not resurrect them. Source records remain intact; audit records actor/time. Direct DELETE/TRUNCATE bypasses are not granted to application roles. No user routes were removed during tests.

## Quick unlock security

- Initial login remains email/password via Supabase Auth; password is cleared immediately and never persisted.
- PIN is 4 digits. Server-side bcrypt (cost 12), high-entropy device secret, serialized attempt counting: 5 wrong attempts lock 15 minutes; 10 require password recovery. Device-vault tables and PIN RPCs are service-only.
- An independent random 256-bit key encrypts the session with AES-GCM and a fresh 96-bit IV. Once enabled, only ciphertext, IV, device ID/secret and preferences remain in browser storage, not plaintext access/refresh tokens or PIN.
- Refresh/access tokens are validated with Supabase; expired/revoked sessions require password login. PIN does not authenticate a new account.
- Platform WebAuthn uses the actual SimpleWebAuthn server verifier (13.2.2), single-use expiring challenges, expected origin/RP ID, required user verification, stored credential public key and counter.
- The browser's system confirmation may be Face ID, Touch ID, fingerprint or device screen lock; the web app cannot insist on a specific sensor or read biometric images/templates. Platform support and HTTPS are required.
- Edge function transport-security has gateway verify_jwt=false because locked clients have no plaintext JWT. Its body verifies current Supabase JWT for enrollment/registration/disable, and device secret plus rate-limited PIN or cryptographically verified WebAuthn for unlock. Strict Cloudflare-origin allowlist and no-store responses.
- PIN change rotates the device/key and requires the previous PIN. Biometric enrollment is renewed after rotation. Auto-lock on leaving (configurable) and inactivity (1/5/15 min); reload/close always locks an enabled vault. Logout disables the device and ends the Supabase session.
- These are local quick-unlock controls, not a replacement for Supabase RLS/session authorization or protection against a compromised device/origin.

## Verification

Pure tests: existing 197 coverage cases/343 penny allocations, reporting identity/conservation, calendar leap dates/period comparisons and direction colors.
Browser: all v44.0 financial editors + v44.2 flows; v44.3 independent snapshot totals, dynamic charts, global periods, drilldowns and mobile widths. Complete built script stack is tested on desktop/mobile/phone iframe with isolated backend before and after Cloudflare deployment.
Quick unlock: shipped Edge TypeScript handler, real WebAuthn verifier and Chromium virtual platform authenticator, isolated Auth/storage; encrypted storage, PIN rotation, old PIN rejection, reload lock, valid assertion, rejected origin/unauthenticated enrollment.
Database checks run in rolled-back transactions: non-admin delete/escalation denial, service-only key access, PIN throttling, recoverable archive/audit, RLS exclusion, admin-only audit, manual-route deletion guard.

Security advisor: service-only vault deny policy is intentional. Guarded Administrator/profile RPCs intentionally use SECURITY DEFINER with fixed search_path and explicit role checks; no general client writes to profiles/tombstones are granted. Existing current_app_role/recalculate_route_cost advisor findings and leaked-password-protection setting predate this release; financial functions were not altered.
References:
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
