# EntityOS — Setup Guide

Complete guide to running EntityOS locally, resetting demo data, and deploying to production.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Setup (5 minutes)](#2-local-setup-5-minutes)
3. [Environment Variables](#3-environment-variables)
4. [Loading Your Own Data](#4-loading-your-own-data)
5. [Resetting / Wiping Demo Data](#5-resetting--wiping-demo-data)
6. [Running Two Instances Side-by-Side](#6-running-two-instances-side-by-side)
7. [Enabling Authentication (Okta SSO)](#7-enabling-authentication-okta-sso)
8. [Production Deployment](#8-production-deployment)
9. [Connecting Integrations](#9-connecting-integrations)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| npm | 10+ | Included with Node.js |
| PostgreSQL | 14+ | [postgresql.org](https://www.postgresql.org/download/) or [Supabase](https://supabase.com) |
| Git | Any | [git-scm.com](https://git-scm.com) |

Check your versions:
```bash
node -v     # should be v20.x.x or higher
npm -v      # should be 10.x.x or higher
psql --version
```

---

## 2. Local Setup (5 minutes)

### Step 1 — Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/governance-os.git
cd governance-os
npm install
```

### Step 2 — Create the database

```bash
psql -U postgres -c "CREATE DATABASE governanceos;"
```

> If your PostgreSQL uses a different user or password, replace `postgres` with your username.

### Step 3 — Configure environment

```bash
cp .env.example .env
```

Open `.env` and set your database connection:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/governanceos"
```

For local development, leave everything else as-is (auth is disabled by default).

### Step 4 — Run migrations

```bash
npm run db:migrate
```

This creates all 14 tables in your database.

### Step 5 — Seed demo data

```bash
npm run db:seed
```

This loads 14 demo entities (Acme group companies across Singapore, UK, Lithuania, Australia, India, Malta, Malaysia, Netherlands, Hong Kong, UAE, Canada, Japan, Brazil), demo directors, board meetings, licenses, compliance obligations, and 7 user accounts.

### Step 6 — Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You're in — no login required in development mode.

---

## 3. Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `AUTH_ENABLED` | No | `false` | Set `true` to require Okta login |
| `ANTHROPIC_API_KEY` | No | — | Enables AI clause extraction in Terms of Reference (Stage 2) |
| `NEXTAUTH_SECRET` | If auth on | — | JWT signing secret — run `openssl rand -base64 32` |
| `NEXTAUTH_URL` | If auth on | — | App base URL e.g. `https://app.yourcompany.com` |
| `OKTA_CLIENT_ID` | If auth on | — | From your Okta application |
| `OKTA_CLIENT_SECRET` | If auth on | — | From your Okta application |
| `OKTA_ISSUER` | If auth on | — | e.g. `https://yourorg.okta.com` |
| `SLACK_WEBHOOK_URL` | No | — | Incoming webhook URL for compliance alerts |
| `JIRA_BASE_URL` | No | — | e.g. `https://yourorg.atlassian.net` |
| `JIRA_EMAIL` | No | — | Jira service account email |
| `JIRA_API_TOKEN` | No | — | Jira API token |
| `JIRA_PROJECT_KEY` | No | — | Jira project key |

---

## 4. Loading Your Own Data

EntityOS ships with demo data. To replace it with your real entities:

### Option A — Use the UI (recommended for small teams)

1. Go to **Entities → Add Entity** to create each legal entity
2. Go to **Directors** to add board members per entity
3. Go to **Compliance** to add regulatory filing obligations
4. Go to **Licenses** to record each regulatory license
5. Go to **Capital** to set capital requirements

### Option B — Edit the seed file (recommended for bulk import)

1. Edit `prisma/data/seed-data.json` with your entity data following the existing structure
2. Edit `prisma/seed.ts` — update the `users` array with your team members
3. Reset and re-seed:

```bash
npm run db:reset
```

> ⚠️ `db:reset` **wipes your entire database** and re-runs migrations and seed. Only use this when you want to start fresh.

### Option C — Direct database import

Use Prisma Studio to browse and edit records visually:

```bash
npm run db:studio
```

Or connect any PostgreSQL client (TablePlus, DBeaver, pgAdmin) to your `DATABASE_URL`.

---

## 5. Resetting / Wiping Demo Data

### Wipe everything and start fresh

```bash
npm run db:reset
```

This drops all tables, re-runs all migrations, and re-seeds with demo data. **Irreversible.**

### Wipe data but keep the schema (keep your own seed)

```bash
psql $DATABASE_URL -c "TRUNCATE TABLE entities, directors, board_meetings, compliance_obligations, licenses, regulatory_capital, alerts, audit_logs, users RESTART IDENTITY CASCADE;"
```

### Remove just the demo entities and load your own

```bash
# Delete all seeded data
psql $DATABASE_URL -c "DELETE FROM entities;"

# Then add your own via the UI or by editing seed-data.json and running:
npm run db:seed
```

### Drop and recreate the database from scratch

```bash
psql -U postgres -c "DROP DATABASE governanceos;"
psql -U postgres -c "CREATE DATABASE governanceos;"
npm run db:migrate
npm run db:seed
```

---

## 6. Running Two Instances Side-by-Side

Useful for testing the public demo alongside your internal version:

```bash
# Terminal 1 — internal version on port 3000
cd ~/your-internal-governance-os
npm run dev

# Terminal 2 — public/demo version on port 3002
cd ~/governance-os
PORT=3002 npm run dev
```

Make sure each instance has a **different `DATABASE_URL`** pointing to separate databases.

---

## 7. Enabling Authentication (Okta SSO)

### Step 1 — Create an Okta application

1. Log into your Okta Admin Console
2. Go to **Applications → Create App Integration**
3. Select **OIDC – OpenID Connect** → **Web Application**
4. Set Sign-in redirect URI: `https://your-app-url.com/api/auth/callback/okta`
5. Set Sign-out redirect URI: `https://your-app-url.com`
6. Copy the **Client ID**, **Client Secret**, and **Okta domain**

### Step 2 — Update `.env`

```bash
AUTH_ENABLED=true
NEXTAUTH_SECRET="your-generated-secret"   # openssl rand -base64 32
NEXTAUTH_URL="https://your-app-url.com"
OKTA_CLIENT_ID="your-client-id"
OKTA_CLIENT_SECRET="your-client-secret"
OKTA_ISSUER="https://your-org.okta.com"
```

### Step 3 — Map Okta users to EntityOS roles

When a user logs in via Okta for the first time, they get `viewer` role by default. To promote them:

1. Go to **Admin → Users** (requires `super_admin` role)
2. Find the user and change their role
3. Or update directly in the database via Prisma Studio

### Step 4 — Configure role assignment in Jira (optional)

In `lib/jiraEntityMap.ts`, map Jira project entity names to EntityOS entity IDs so compliance obligations sync automatically.

---

## 8. Production Deployment

### Option A — Docker (recommended)

A `Dockerfile` is included. Build and run:

```bash
docker build -t governance-os .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e AUTH_ENABLED=true \
  -e NEXTAUTH_SECRET="..." \
  governance-os
```

### Option B — Vercel

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables in the Vercel dashboard
4. Set **Build Command**: `npm run build`
5. Set **Output Directory**: `.next`

For the database, use [Supabase](https://supabase.com) (free tier available) or [Neon](https://neon.tech).

### Option C — Railway / Render

Both platforms support Next.js + PostgreSQL with one-click deploys. Add environment variables via their dashboards and run:

```bash
npm run db:migrate && npm run db:seed
```

as a one-time release command.

### Pre-deployment checklist

- [ ] `AUTH_ENABLED=true` is set
- [ ] `NEXTAUTH_SECRET` is a secure random string
- [ ] `DATABASE_URL` points to your production database
- [ ] Migrations have been run: `npm run db:migrate`
- [ ] SSL is enabled on the database connection (add `?sslmode=require` to `DATABASE_URL`)
- [ ] Okta redirect URIs use `https://` (not `http://`)

---

## 9. Connecting Integrations

### Slack Alerts

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → Create App
2. Enable **Incoming Webhooks** and create a webhook for your compliance channel
3. Add to `.env`:
   ```
   SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
   ```

Alerts are sent automatically when compliance obligations become overdue or capital falls below minimums.

### Jira Sync

1. Generate a Jira API token at [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Add to `.env`:
   ```
   JIRA_BASE_URL="https://yourorg.atlassian.net"
   JIRA_EMAIL="your-service-account@company.com"
   JIRA_API_TOKEN="your-token"
   JIRA_PROJECT_KEY="COMP"
   ```
3. Edit `lib/jiraEntityMap.ts` to map Jira project names to your entity IDs
4. Set up a Jira automation rule to POST to `https://your-app.com/api/webhooks/jira` on issue transitions

### Anthropic AI (Terms of Reference Stage 2)

1. Get an API key at [console.anthropic.com](https://console.anthropic.com)
2. Add to `.env`:
   ```
   ANTHROPIC_API_KEY="sk-ant-..."
   ```

Upload your company Constitution and/or SHA on any entity's Terms of Reference page for AI-powered clause extraction.

---

## 10. Troubleshooting

### `EADDRINUSE: address already in use :::3000`
Another process is using port 3000. Use a different port:
```bash
PORT=3001 npm run dev
```

Or kill the process:
```bash
lsof -ti :3000 | xargs kill -9
```

### `Error: Cannot find module 'docx'`
The docx package isn't installed. Run:
```bash
npm install
```

### `ENOENT: no such file or directory, open '.../seed-data.json'`
The seed data file is missing. It should be at `prisma/data/seed-data.json`. If you deleted it, re-clone the repo or copy it from a backup.

### `P1001: Can't reach database server`
Check that PostgreSQL is running:
```bash
pg_isrunning   # macOS with Homebrew
sudo service postgresql start   # Linux
```
And that `DATABASE_URL` in `.env` matches your actual database credentials.

### `Prisma Client is not generated`
Run:
```bash
npx prisma generate
```

### Migrations out of sync
If you get migration drift errors:
```bash
npm run db:reset   # WARNING: drops all data
```

### Auth redirect loop
Make sure `NEXTAUTH_URL` exactly matches the URL you're accessing (including `http://` vs `https://` and trailing slashes).

---

## User Roles Reference

| Role | Can do |
|---|---|
| `super_admin` | Everything — including managing users |
| `admin` | All modules except User management |
| `legal` | Entities, Directors, Meetings, Compliance, Licenses, Documents |
| `finance` | Entities, Capital, Alerts |
| `viewer` | Dashboard and Entities (read-only) |

Default demo credentials (auth disabled):
- Signed in as **Alex Chen** (`super_admin`)
- All features unlocked

---

*EntityOS is open-source under the MIT License.*
