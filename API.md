# MaintainIQ API Reference

Base URL: `http://localhost:4000/api`

Auth: send `Authorization: Bearer <accessToken>` for protected routes. Tokens come from `/auth/login` or `/auth/register`.

Roles: `ADMIN`, `TECHNICIAN`, `SUPERVISOR`, `REPORTER`.

---

## Auth

| Method | Path | Access | Body | Description |
|--------|------|--------|------|-------------|
| POST | `/auth/register` | Public | `{ name, email, password }` | Self-register (always `TECHNICIAN`). Returns `{ accessToken, user }`. |
| POST | `/auth/login` | Public | `{ email, password }` | Returns `{ accessToken, user }`. |
| GET | `/auth/me` | Any auth | — | Current user. |
| POST | `/auth/users` | ADMIN | `{ name, email, password, role }` | Create a user with any role. |

## Users

| Method | Path | Access | Query | Description |
|--------|------|--------|-------|-------------|
| GET | `/users` | ADMIN, SUPERVISOR | `role?` | List staff (safe fields). Used to pick a technician for assignment. |

## Assets

| Method | Path | Access | Body / Query | Description |
|--------|------|--------|--------------|-------------|
| POST | `/assets` | ADMIN | `{ name, category, location, condition?, description?, code?, nextServiceDate? }` | Create asset; auto `AST-XXXX` code + `publicId`. Duplicate code → 409. |
| GET | `/assets` | Any auth | `search?, status?, category?, location?, page?, limit?` | Paginated list. |
| GET | `/assets/:id` | Any auth | — | Asset detail (+ recent issues). |
| GET | `/assets/:id/history` | Any auth | — | Append-only history timeline. |
| PATCH | `/assets/:id` | ADMIN | partial asset (+`status?`) | Update; writes history. |
| PATCH | `/assets/:id/retire` | ADMIN | — | Retire asset. |

## QR

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/assets/:id/qr` | Any auth | `{ publicUrl, qrDataUrl, code, name, location }` (base64 PNG). |
| GET | `/assets/:id/qr.png` | Any auth | Downloadable PNG. |
| GET | `/assets/:id/label` | Any auth | Print-ready label payload. |

## Issues (internal)

| Method | Path | Access | Body | Description |
|--------|------|--------|------|-------------|
| GET | `/issues` | Any auth | query: `search?, status?, priority?, assetId?, assignedTechnicianId?, page?, limit?` | Paginated list. |
| GET | `/issues/:id` | Any auth | — | Full detail (asset, technician, maintenance records). |
| PATCH | `/issues/:id/assign` | ADMIN, SUPERVISOR | `{ technicianId }` | Assign / reassign. |
| PATCH | `/issues/:id/status` | Owner / privileged | `{ status }` | Generic transition (e.g. `INSPECTION_STARTED`, `WAITING_FOR_PARTS`). |
| POST | `/issues/:id/maintenance` | Owner / privileged | `{ notes, partsReplaced?, cost?, timeSpent?, finalCondition?, completedAt? }` | Record maintenance (notes required, cost ≥ 0). |
| PATCH | `/issues/:id/resolve` | Owner / privileged | — | Resolve (requires ≥1 maintenance note). |
| PATCH | `/issues/:id/reopen` | Owner / privileged | — | Reopen a resolved/closed issue. |
| PATCH | `/issues/:id/close` | ADMIN, SUPERVISOR | — | Close a resolved issue. |

**Issue status flow:** `REPORTED → ASSIGNED → INSPECTION_STARTED → MAINTENANCE_IN_PROGRESS ⇄ WAITING_FOR_PARTS → RESOLVED → CLOSED`, with `RESOLVED/CLOSED → REOPENED`.

**Asset status flow:** `OPERATIONAL → ISSUE_REPORTED → UNDER_INSPECTION → UNDER_MAINTENANCE → OPERATIONAL`; plus `OUT_OF_SERVICE`, `RETIRED`.

## Public (no auth — QR surface)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/public/assets/:publicId` | — | Safe asset view + safe recent activity. Invalid → 404; retired is readable but flagged. |
| POST | `/public/assets/:publicId/triage` | `{ complaint }` | AI triage → structured suggestions (`source: ai\|fallback`). |
| POST | `/public/assets/:publicId/issues` | `{ title, description, priority?, category?, reporterName?, reporterContact?, aiSuggested?, aiEdited? }` | Report an issue → unique number. Retired asset → 409. |
| GET | `/public/issues/:number` | — | Safe status lookup by issue number. |

## Dashboard

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/dashboard/summary` | Any auth | Asset counts by status, issue counts by status/priority, open/critical counts, service-due, recent issues. |

---

## Common Errors

| Status | Meaning |
|--------|---------|
| 400 | Validation error (e.g. negative cost, short field) |
| 401 | Missing/invalid token |
| 403 | Role or ownership not permitted |
| 404 | Resource not found |
| 409 | Conflict (duplicate code, invalid status transition, retired asset) |
