# Өрөө — Mongolian real-estate platform

[Consumer site](https://oroo.gantuutour.workers.dev/) · [PRO](https://oroo.gantuutour.workers.dev/#/pro) · [ADMIN](https://oroo.gantuutour.workers.dev/#/admin)

The Cloudflare deployment uses real server sessions, D1 and a private R2 bucket. The local prototype remains a separate demo mode. This is an initial backend release, not a completed nationwide commercial launch.

## Connected paths

- Email/password registration and login, profile updates, password changes, logout and account closure. Public registration cannot assign staff roles. The initial administrator sets their own password through a reserved, expiring, one-use activation flow. Activation secrets and administrator identity are excluded from this repository.
- User/organization-scoped listing registration, photos, revisions, archived records and review status. Every new or edited listing enters review; agent listings also require a verified organization before public display.
- Browser-generated full JPEG and thumbnail variants stream through an authenticated API into private R2. D1 stores metadata and order. Photos do not enter database rows or localStorage as base64 in cloud mode.
- Consumer map bounds/search/filters, separate map clusters, keyset pages, favorites, listing inquiries, reports, support, public office profiles and office inventories.
- PRO organization submissions and private work records; ADMIN listing review, independent two-person organization review, moderation queues, staff role assignment with password re-entry, account status and append-only audit records.
- Region summaries use published asking prices and actual sample counts. They are not transaction-price reports. Public data starts empty; prototype fixtures are not copied to production.

## Development and verification

Use Node 24.12.0 (see .nvmrc). Run:

    node verify-all.cjs

There are 18 verification suites. The core server suite executes real SQLite/FTS constraints and 71 synthetic HTTP requests. JOURNAL adds 47 requests for publication visibility, role checks, photo isolation, revisions, transactions, pagination and cleanup, plus frontend rendering checks. Prototype suites continue to run in local mode.

    node preview.cjs

opens the local demo at http://127.0.0.1:4173. That command does not use production accounts or data. Production cloud mode is enabled by the Worker's runtime-config.js response.

Live verification on 2026-11-10 confirmed private R2 upload, pending listing create/edit, duplicate-request prevention, anonymous access denial and synthetic account closure. A small sample of 50 public queries at concurrency 10 had no errors: median 593 ms, p95 2661 ms from the development machine against an empty public dataset. These numbers do not measure Mongolian user latency or national-scale capacity.

## JOURNAL publishing

Open [ADMIN → Өрөө JOURNAL](https://oroo.gantuutour.workers.dev/#/admin/journal) as a platform administrator. Create a title, summary, category, author, cover photo and ordered text, heading, quote or image blocks. Save a draft and inspect its private preview, then publish when ready. Only published articles are public. The latest three published articles with the home checkbox enabled appear on the home page and link to their news-style detail pages; all published articles appear in JOURNAL. Archiving or reverting to draft hides an article without deleting its content. There are no fabricated production articles.

Article content and revisions live in D1, images in private R2. Publication, edits and archiving are recorded in the audit log. Apply `migrations/0002_journal.sql` before deploying the JOURNAL API.

## Deployment and operations

GitHub main is connected to the oroo Cloudflare Worker. Workers Builds runs node verify-all.cjs before npx wrangler deploy. The Worker binds DB to oroo-main and MEDIA to oroo-media; the bucket stays private. The initial schema was applied to the dedicated D1 database. Subsequent schema changes require a reviewed migration before application deployment.

See [CLOUD-OPERATIONS.md](CLOUD-OPERATIONS.md) for upload limits, caching, session controls, cleanup, migrations, recovery planning and growth limits. Existing local browser demo data remains isolated and is not automatically uploaded.

DAN, government registry lookups, email ownership/recovery delivery, staff MFA, payments and e-contract execution are not connected. Automated backups/restore drills, operational alerts, legal policies and realistic Mongolia-based load tests remain launch work. Advertising currently records requests and does not charge money or automatically buy placement.
