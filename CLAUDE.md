# GovernanceOS — Claude Code Guide

This file tells Claude how to work with this project. When a user asks to set up,
run, or develop GovernanceOS, follow the instructions below.

---

## What this project is

GovernanceOS is an open-source corporate entity governance platform built with
Next.js 16, TypeScript, PostgreSQL, and Prisma 7. It manages legal entities,
directors, board meetings, regulatory compliance, licenses, and capital
requirements across a global portfolio.

---

## Key commands

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server at http://localhost:3002 |
| `npm run db:migrate` | Apply all Prisma migrations to the database |
| `npm run db:seed` | Seed demo data (Acme entities, directors, meetings, licenses) |
| `npm run db:studio` | Open Prisma Studio to browse the database |
| `npx prisma generate` | Regenerate the Prisma client after schema changes |
| `npx prisma migrate dev --name <name>` | Create and apply a new migration |
| `npx prisma migrate reset` | Drop DB, re-migrate, and re-seed (destructive) |

---

## First-time setup

When a user asks to set up or install this project, run these steps in order:

```bash
# 1. Install dependencies
npm install

# 2. Create the .env file
cp .env.example .env
```

Then ask the user for their PostgreSQL connection string and write it to `.env`:
```
DATABASE_URL="postgresql://user:password@host:5432/governanceos"
```

For a quick local database, suggest [Supabase](https://supabase.com) (free tier,
no local install needed). The connection string is on the Supabase dashboard under
Settings → Database → Connection string (URI mode).

```bash
# 3. Run migrations to create all tables
npm run db:migrate

# 4. Seed demo data
npm run db:seed

# 5. Start the dev server
npm run dev
```

The app runs at **http://localhost:3002**. Authentication is disabled by default —
the user is auto-signed in as super_admin.

---

## Project structure

```
app/                    # Next.js App Router pages and API routes
  dashboard/            # KPI dashboard
  entities/             # Entity registry + detail pages
    [id]/tor/           # Terms of Reference generator
  directors/            # Director registry
  board-meetings/       # Meeting management
  compliance/           # Compliance obligations tracker
  licenses/             # License registry
  capital/              # Regulatory capital
  alerts/               # Alert centre
  org-chart/            # Interactive corporate structure chart
  calendar/             # Key dates calendar
  settings/members/     # Team member management (invite, roles)
  api/                  # REST API handlers
    organisations/      # GET/PATCH org; POST/PATCH/DELETE members

components/             # Shared React components
lib/
  db/                   # Prisma queries and schema types
  tor/                  # Terms of Reference jurisdiction templates
  prisma.ts             # Prisma singleton
  audit.ts              # Audit log helper
  org.ts                # Multitenancy helpers (getOrgId, getOrgContext)
prisma/
  schema.prisma         # 14 models, 10 enums
  seed.ts               # Demo data seed script
  data/seed-data.json   # Seed data source (Acme demo entities)
  migrations/           # SQL migration history
```

---

## Database schema

16 models: `Organisation`, `OrganisationMember`, `Entity`, `Director`, `BoardMeeting`, `MeetingAttendee`,
`MeetingDocument`, `MeetingResolution`, `ComplianceObligation`, `License`,
`RegulatoryCapital`, `BankAccount`, `Alert`, `Document`, `AuditLog`, `User`,
`Shareholder`, `ShareholderLoan`, `KeyDate`, `Submission`

Key relationships:
- `Organisation` is the tenancy root; `Entity` belongs to `Organisation`
- `OrganisationMember` links `User` → `Organisation` with a per-org role
- `Entity` is self-referential (parent/subsidiary tree via `parentEntityId`)
- `Director`, `License`, `BoardMeeting`, `ComplianceObligation` all belong to `Entity`
- `isLegacyEntity` flag marks legacy acquired entities
- `KeyDate` can be group-wide (only `organisationId`) or entity-scoped (`entityId`)

Multitenancy helpers:
- `lib/org.ts` — `getOrgId()` and `getOrgContext()` resolve tenancy from session
- All entity queries filter by `organisationId` from session
- `AUTH_ENABLED=false` bypasses auth and uses `org-default-001`

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | **Yes (prod)** | Random secret for JWT signing |
| `NEXTAUTH_URL` | **Yes (prod)** | Public app URL e.g. `https://your-app.up.railway.app` |
| `AUTH_ENABLED` | No | Set `true` to enable login (default: `false` = open access) |
| `ANTHROPIC_API_KEY` | No | For Terms of Reference Stage 2 AI analysis |
| `SLACK_WEBHOOK_URL` | No | Slack webhook for compliance alerts |

---

## Common tasks

**Add a new entity** — use the "+ Add Entity" button in the UI, or insert directly
via Prisma Studio (`npm run db:studio`).

**Generate a Terms of Reference document** — navigate to any entity → click
"Terms of Reference". Stage 1 works without an API key. Stage 2 (AI clause
extraction) requires `ANTHROPIC_API_KEY` in `.env`.

**Manage team members** — go to Settings → Team Members (`/settings/members`).
Invite by email; assign roles. Roles are per-organisation.

**Connect Slack** — set `SLACK_WEBHOOK_URL` in `.env`. Compliance alerts will be
posted automatically when obligations become overdue.

**After any schema change** — always run `npx prisma generate` to update the
TypeScript client, then `npx prisma migrate dev --name <description>` to apply
it to the database.

---

## Troubleshooting

**"localhost refused to connect"** — the dev server is not running. Run `npm run dev`.

**Stale build / Runtime Error about build-manifest.json** — delete the `.next`
folder and restart: `rm -rf .next && npm run dev`.

**PrismaClientKnownRequestError: column does not exist** — the Prisma client is
out of sync with the schema. Run `npx prisma generate`, then restart the dev server.
