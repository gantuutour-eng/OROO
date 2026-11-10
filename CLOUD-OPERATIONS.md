# OR​OO cloud operations

This is an initial server-backed release, not a claim of nationwide capacity or a completed commercial launch.

## Deployed design

- One Cloudflare Worker serves static assets and same-origin `/api/*` routes. GitHub `main` is the deployment source. Run `node verify-all.cjs` with Node 24 before deployment.
- D1 `oroo-main`, initially placed in Asia Pacific, stores accounts, hashed sessions, listings, organization verification, photo metadata, favorites, inquiries, work records and append-only audit events. SQL schema is in `migrations/0001_core.sql`.
- Private R2 `oroo-media` stores JPEG photos. There is no public bucket URL. Each read checks owner/staff access or current listing visibility before returning an object or a cached copy.
- The local `node preview.cjs` prototype keeps its local demo behavior. The Worker overrides `/runtime-config.js` to enable cloud mode. Existing browser demo data is not automatically copied to the server.

## Authentication and permissions

- Passwords use scrypt N=32768, r=8, p=3, random 16-byte salts. Hash operations are serialized with a small bounded queue per isolate to bound memory. Do not reduce this work factor to fit a hosting limit; use a suitable paid CPU allowance or an external authentication service.
- Seven-day `__Host-` session cookie: Secure, HttpOnly, SameSite=Lax. D1 stores only its SHA-256 digest. Mutations require matching Origin and a per-session CSRF token. All listing, photo and work-record ownership is checked on the server.
- Public registration always creates `user` accounts. Email is not yet verified. DAN is not integrated. No badge claims government verification.
- The first administrator is reserved through the private Cloudflare console. A random, hashed, expiring, one-use activation token allows that person to set their own password. Never commit an activation URL, raw token, administrator email, password or deployment credential.
- An administrator can assign an existing user the moderator role after re-entering their current password. A moderator cannot promote accounts or create administrators.
- Organization verification requires six evidence checks and two different authenticated reviewers. Reviewers cannot approve their own organization. The first review expires after 30 days; final verification lasts at most 90 days and cannot exceed the submitted license expiry. Editing the organization revokes approval. This is a platform review, not a government database lookup.

## Listing and media path

1. A signed-in owner completes the shared listing form and confirms an exact Mongolia map point.
2. The browser creates JPEG full-size (long edge <=1920) and thumbnail (<=480) variants. Two upload jobs run at once. Each upload reservation has an idempotency key. Blobs stream through an authenticated Worker into private R2; this is **not a presigned browser-to-S3 upload**.
3. The server caps each full image at 2 MiB, thumbnail at 200 KiB, checks JPEG structure/dimensions, and prevents an uploaded variant from being overwritten. At most ten owned, completed photos attach to a listing.
4. A D1 transaction saves the listing, ordered media links and audit record. A registration request key prevents duplicate listings after a retry. Edits require a matching revision and return to pending review. Failed writes keep the local draft.
5. Published listings become public only after approval; agent listings additionally require a currently approved organization and an active owner. A pending listing can be inspected by its owner/staff, not visitors.
6. The hourly job removes at most ten expired orphan photo pairs and bounded expired session/rate-limit rows. Unattached photos expire after 48 hours. Monitor backlog; high volume requires a larger cleanup job/queue, not an unbounded request.

## Query and delivery bounds

- Keyset pages default to 30 and cap at 60; public price/date/region/map/owner indexes and FTS5 support scoped search. Map clusters are queried separately from the visible list and cap at 250 cells; zoom in when truncated.
- Public list/cluster/region results use a 30-second edge cache keyed by the current D1 publication version and UTC date. Moderation/organization/account changes invalidate the namespace. Private responses use no-store.
- Public photo bytes can be cached at the edge for one day, after a fresh D1 visibility check on every server read. Browser photo cache is private and lasts at most 60 seconds. An already loaded image cannot be recalled from a user's device.
- Photos never enter D1 rows or localStorage as base64 in cloud mode. Browser drafts contain form values and same-origin media references, scoped to the signed-in user. Local prototype records remain isolated.
- Request IDs, Server-Timing and sampled Worker observability support diagnosis without logging bodies, passwords or session tokens. Inspect resource metrics and configure operational alerts before public launch.

## Migrations and recovery

The initial schema can be applied in the D1 console. For subsequent releases, use `npx wrangler d1 migrations apply DB --remote` with an appropriately scoped deployment identity, then `npx wrangler deploy`. Do not create a new production database on every build. Never modify unrelated account databases/buckets.

D1 Time Travel availability/retention depends on the account plan. Before launch, record a bookmark and perform an isolated restore exercise, define recovery point/time objectives, and automate encrypted off-account exports. The existence of Time Travel is not proof of a tested restore. R2 photo recovery/versioned copies require their own plan; database recovery does not restore deleted objects.

## Remaining launch work

Actual load tests from Mongolia, paid resource/CPU sizing, email ownership and recovery, MFA/step-up for staff, legal privacy/retention policies, security review, monitoring/on-call, automated backups and restore drills remain launch requirements. Payments, e-contracts, government DAN and registry lookups, verified neighborhood facilities and a real transaction-price database are not connected. PRO advertising currently records requests; it does not charge a card or automatically buy placement.

D1 has per-database limits; this release does not provide unlimited storage. Measure dataset/query growth, shard listings by a stable region/tenant key when warranted, and evaluate a dedicated search index or PostgreSQL before the current database becomes a bottleneck. R2 photo storage scales separately from transactional data. Do not estimate national capacity from an empty-data smoke test.
