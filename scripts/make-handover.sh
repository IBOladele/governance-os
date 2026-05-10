#!/usr/bin/env bash
#
# make-handover.sh — bundle EntityOS for offline handover
#
# Produces a single tar.gz archive containing:
#   - all source code (no node_modules, no .next, no .git, no secrets)
#   - a Postgres dump of the local `entityos` database
#   - a README.HANDOVER.md with restore instructions
#   - a restore.sh script your colleague can run end-to-end
#
# Usage:
#   cd <repo-root>
#   bash scripts/make-handover.sh
#
# Output:
#   ../entity-os-handover-YYYYMMDD-HHMM.tar.gz
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

STAMP="$(date +%Y%m%d-%H%M)"
STAGE_DIR="$(mktemp -d)"
BUNDLE_NAME="entity-os-handover-${STAMP}"
BUNDLE_DIR="${STAGE_DIR}/${BUNDLE_NAME}"
OUT_FILE="${REPO_ROOT}/../${BUNDLE_NAME}.tar.gz"

mkdir -p "${BUNDLE_DIR}"

echo "==> Staging source code (excluding heavy/secret paths)…"
# Use rsync to copy everything except excluded paths
rsync -a \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '*.log' \
  --exclude 'tsconfig.tsbuildinfo' \
  --exclude '.DS_Store' \
  ./ "${BUNDLE_DIR}/entity-os/"

echo "==> Dumping Postgres database 'entityos'…"
if command -v pg_dump >/dev/null 2>&1; then
  # -Fc = custom format (compressed, supports pg_restore)
  # Also include a plain .sql version for easy inspection
  pg_dump -Fc -d entityos -f "${BUNDLE_DIR}/entityos.dump"         || echo "   (pg_dump custom format failed — check Postgres is running)"
  pg_dump    -d entityos -f "${BUNDLE_DIR}/entityos.sql"          || echo "   (pg_dump plain SQL failed)"
else
  echo "   pg_dump not found on PATH — skipping database dump."
  echo "   Install Postgres client tools or dump manually:"
  echo "     pg_dump -Fc -d entityos -f entityos.dump"
fi

echo "==> Writing .env.example (no secrets)…"
cp .env.example "${BUNDLE_DIR}/entity-os/.env.example" 2>/dev/null || true

echo "==> Writing handover README…"
cat > "${BUNDLE_DIR}/README.HANDOVER.md" <<'MD'
# EntityOS — Offline Handover Bundle

This archive contains everything needed to run EntityOS locally **without**
needing to clone from Bitbucket.

## What's inside

```
entity-os-handover-YYYYMMDD-HHMM/
├── entity-os/          # Full application source (no node_modules, no .next)
├── entityos.dump       # Postgres custom-format dump (for pg_restore)
├── entityos.sql        # Plain SQL dump (for inspection / psql)
├── restore.sh          # One-shot restore script (see below)
└── README.HANDOVER.md  # This file
```

## Prerequisites on the receiving machine

- Node.js 20+ and npm
- PostgreSQL 15+ running locally (or remote — adjust DATABASE_URL)
- Git (only needed if you plan to push to Bitbucket afterwards)

## Quick restore (automated)

```bash
cd entity-os-handover-YYYYMMDD-HHMM
bash restore.sh
```

The restore script will:
1. Create a Postgres database called `entityos` if it doesn't exist
2. Load the dump into it
3. Create `entity-os/.env` from `.env.example`
4. Run `npm install`
5. Run `npx prisma generate`

After it finishes:

```bash
cd entity-os
npm run dev
```

## Manual restore (if the script fails)

```bash
# 1. Create the database
createdb entityos

# 2. Restore from the custom-format dump
pg_restore -d entityos --clean --if-exists entityos.dump
#    OR from the plain SQL file:
#    psql -d entityos -f entityos.sql

# 3. Set up the app
cd entity-os
cp .env.example .env
# edit .env and set DATABASE_URL=postgresql://<user>:<pass>@localhost:5432/entityos
npm install
npx prisma generate
npm run dev
```

## Pushing to Bitbucket

Once the app runs locally:

```bash
cd entity-os
git init
git add .
git commit -m "Initial import of EntityOS"
git remote add origin <bitbucket-url>
git branch -M main
git push -u origin main
```

Do **not** commit `.env` — it contains your local DB credentials. The
`.gitignore` in this bundle already excludes it.

## Notes

- The database dump is a point-in-time snapshot from when the bundle was
  created. Any changes made on the original machine after bundling will not
  be reflected.
- `node_modules` is intentionally excluded; `npm install` will reinstall them
  from `package-lock.json`, guaranteeing a deterministic build.
- `.next` build artifacts are excluded — they'll be regenerated on first
  `npm run dev` / `npm run build`.
MD

echo "==> Writing restore.sh…"
cat > "${BUNDLE_DIR}/restore.sh" <<'SH'
#!/usr/bin/env bash
#
# restore.sh — one-shot restore for the EntityOS handover bundle
#
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "${HERE}"

DB_NAME="entityos"

echo "==> Checking prerequisites…"
for cmd in node npm psql createdb pg_restore; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "   ERROR: '$cmd' not found on PATH. Please install it and re-run."
    exit 1
  fi
done

echo "==> Creating database '${DB_NAME}' (if it doesn't already exist)…"
if psql -lqt | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
  echo "   Database '${DB_NAME}' already exists — will restore on top of it."
else
  createdb "${DB_NAME}"
fi

echo "==> Restoring database from entityos.dump…"
if [ -f "${HERE}/entityos.dump" ]; then
  pg_restore -d "${DB_NAME}" --clean --if-exists "${HERE}/entityos.dump" || true
elif [ -f "${HERE}/entityos.sql" ]; then
  psql -d "${DB_NAME}" -f "${HERE}/entityos.sql"
else
  echo "   WARNING: no database dump found in bundle. Skipping restore."
fi

echo "==> Setting up app…"
cd "${HERE}/entity-os"

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "   Created .env from .env.example — edit it to match your Postgres credentials."
  fi
fi

echo "==> Installing npm dependencies (this may take a few minutes)…"
npm install

echo "==> Running prisma generate…"
npx prisma generate

cat <<DONE

==========================================================
  Restore complete.

  Next steps:
    cd entity-os
    # Edit .env if your DATABASE_URL needs adjusting
    npm run dev

  The app will start on http://localhost:3000
==========================================================

DONE
SH
chmod +x "${BUNDLE_DIR}/restore.sh"

echo "==> Creating tarball: ${OUT_FILE}"
tar -czf "${OUT_FILE}" -C "${STAGE_DIR}" "${BUNDLE_NAME}"

echo "==> Cleaning staging dir…"
rm -rf "${STAGE_DIR}"

SIZE="$(du -h "${OUT_FILE}" | cut -f1)"
echo ""
echo "=========================================================="
echo "  Bundle ready: ${OUT_FILE}"
echo "  Size:         ${SIZE}"
echo ""
echo "  Send this single file to your colleague. They should"
echo "  extract it and run: bash restore.sh"
echo "=========================================================="
