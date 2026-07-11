# MaintainIQ

**AI-powered QR Maintenance & Asset History Platform** — SMIT Final Hackathon (Track A: Advanced Full-Stack + GenAI).

MaintainIQ gives every physical asset a digital identity, a QR-accessible public page, an AI-assisted issue-reporting workflow, and a permanent, append-only service history. The QR code is only the entry point — the real value is in issue triage, assignment, maintenance workflow, evidence, history, and accountability.

## Live Demo

| | URL |
|--|-----|
| **Web app** | https://maintainiq-web.vercel.app |
| **API** | https://maintainiq-api.vercel.app/api |
| **Repo** | https://github.com/Muhammad-Anas809282/maintainiq |

Sign in at the web app with the demo credentials below. To try the public QR flow, open any asset in the console and use "Open public page".

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 11 (TypeScript) |
| Database | PostgreSQL (Neon) + Prisma 6 ORM |
| Frontend | Next.js 16 (App Router) + React 19 + Tailwind CSS v4 |
| Auth | JWT + Passport, bcrypt, backend-enforced RBAC |
| AI | Grok (xAI) / OpenRouter — OpenAI-compatible, with safe fallback |
| QR | `qrcode` (encodes only the safe public URL) |

---

## Architecture

```
Hackathon/
├── backend/                 NestJS API
│   ├── prisma/
│   │   ├── schema.prisma     Data model (User, Asset, Issue, Maintenance, Evidence, History)
│   │   └── seed.ts           Demo users
│   └── src/
│       ├── auth/             JWT auth, guards (JwtAuthGuard, RolesGuard), @Roles/@CurrentUser
│       ├── users/            User service + admin user listing
│       ├── assets/           Asset CRUD, unique code gen, filters
│       ├── issues/           Issue reporting + workflow state machine
│       ├── maintenance/      Maintenance records (notes/parts/cost)
│       ├── history/          Append-only asset history
│       ├── ai/               Grok triage (GrokService + AiService + fallback)
│       ├── qr/               QR generation + print label
│       ├── public/           Public (no-auth) QR surface: safe view, triage, report
│       ├── dashboard/        Operational summary aggregations
│       └── prisma/           Global PrismaService
├── frontend/                Next.js app
│   └── src/
│       ├── app/
│       │   ├── login/            Sign-in
│       │   ├── (admin)/          Protected console (dashboard, assets, issues)
│       │   └── a/[publicId]/     Public QR asset page + AI triage + report
│       ├── components/       UI primitives + SVG icons
│       └── lib/              API client, auth context, types, labels
└── docker-compose.yml       Postgres (for local/Docker-bonus use)
```

---

## Getting Started

### Prerequisites
- Node.js 20+ and npm
- A PostgreSQL database URL (Neon free tier, or `docker compose up -d db`)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env          # then set DATABASE_URL (and optionally GROK_API_KEY)
npx prisma migrate dev        # creates tables
npm run prisma:seed           # seeds demo users
npm run start:dev             # http://localhost:4000/api
```

### 2. Frontend

```bash
cd frontend
npm install
# .env.local already sets NEXT_PUBLIC_API_URL=http://localhost:4000/api
npm run dev                   # http://localhost:3000
```

Open http://localhost:3000 and sign in with the demo credentials below.

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Administrator | `admin@maintainiq.com` | `Admin@123` |
| Technician | `tech@maintainiq.com` | `Tech@123` |
| Supervisor | `supervisor@maintainiq.com` | `Super@123` |

---

## Demo Scenario (end-to-end)

1. **Admin** registers "Classroom Projector 01" → system generates a unique code (`AST-0001`) and a QR-accessible public page.
2. A user opens the **public page** (scan QR or open link) and describes: *"The projector display is flickering and sometimes does not detect HDMI."*
3. **AI Issue Triage** suggests a professional title, category, priority, possible causes and safe initial checks.
4. The user **reviews/edits** the AI suggestions, then submits → unique issue number (`ISS-000001`); asset moves to `Issue Reported`.
5. Issue appears on the internal **dashboard**; admin **assigns** it to a technician.
6. Technician **starts inspection** → records the HDMI cable is damaged, **records maintenance** (notes, part, cost).
7. Technician **resolves** the issue → asset returns to `Operational`.
8. The asset's **permanent history** timeline is updated with every meaningful event.

---

## Key Product Rules (enforced server-side)

- **Backend RBAC** — roles enforced by guards, not by hiding UI buttons.
- **Unique asset codes** — duplicates rejected (409).
- **QR stability** — QR encodes a stable `publicId`; renaming/relocating an asset never breaks the mapping.
- **Public safety** — the public page exposes only safe fields (no technician notes, costs, or user details).
- **Issue state machine** — only valid transitions allowed (e.g. cannot resolve directly from `Reported`).
- **Ownership** — a technician may only modify issues assigned to them.
- **No resolve without a maintenance note.**
- **Cost cannot be negative.**
- **Append-only history** — significant actions always create a history record; no casual edit/delete.
- **AI safety** — output is advisory and user-editable; API key stays server-side; structured JSON is validated; timeout/retry/fallback handled; hazards escalate priority and recommend a qualified technician.

---

## AI Issue Triage

`POST /api/public/assets/:publicId/triage` sends asset context + the natural-language complaint to Grok and returns structured JSON:

```json
{
  "title": "Water leakage and reduced cooling",
  "category": "Leakage / Performance",
  "priority": "HIGH",
  "possibleCauses": ["Blocked drain pipe", "Dirty filter", "Frozen coil"],
  "initialChecks": ["Turn off the unit if water is near wiring", "Inspect drainage", "Check filter"],
  "recurringWarning": null,
  "source": "ai"
}
```

If no `GROK_API_KEY` is set or the service is unavailable, a safe heuristic **fallback** (`source: "fallback"`) is returned so reporting never blocks. Every stored issue records the raw AI suggestion (`aiSuggested`) and whether the reporter edited it (`aiEdited`).

To enable real AI: set `GROK_API_KEY`, `GROK_API_URL`, `GROK_MODEL` in `backend/.env`.
- xAI: `GROK_API_URL=https://api.x.ai/v1`, `GROK_MODEL=grok-2-latest`
- OpenRouter: `GROK_API_URL=https://openrouter.ai/api/v1`, `GROK_MODEL=x-ai/grok-4-fast:free`

---

## API Documentation

See [`API.md`](./API.md) for the full endpoint reference, or import
[`MaintainIQ.postman_collection.json`](./MaintainIQ.postman_collection.json) into Postman.

Base URL: `http://localhost:4000/api`

---

## Bonus / Roadmap
- Cloudinary evidence upload (model + Evidence table ready)
- Docker deployment (`docker-compose.yml` included)
- Additional AI: maintenance summaries, health analysis, multilingual complaints
