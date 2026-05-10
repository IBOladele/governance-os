#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# EntityOS — Local PostgreSQL Setup Script
# Run this once after cloning / downloading the project.
# Usage:  chmod +x setup-local.sh && ./setup-local.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e  # exit on any error

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # no colour

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   EntityOS — Local Database Setup        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Check .env exists ─────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}⚠  No .env file found. Creating one from .env.example...${NC}"
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo -e "${YELLOW}   → .env created. Open it and fill in your DATABASE_URL before continuing.${NC}"
    echo ""
    echo "   Example for local Postgres (Postgres.app / pgAdmin / EDB):"
    echo "   DATABASE_URL=\"postgresql://postgres:yourpassword@localhost:5432/entityos\""
    echo ""
    echo "   Example for Postgres.app with no password:"
    echo "   DATABASE_URL=\"postgresql://postgres@localhost:5432/entityos\""
    echo ""
    read -p "   Press Enter once you have filled in .env to continue..."
  else
    echo -e "${RED}✗  No .env.example found either. Create a .env file manually with:${NC}"
    echo "   DATABASE_URL=\"postgresql://postgres:yourpassword@localhost:5432/entityos\""
    exit 1
  fi
fi

# ── Step 2: Load DATABASE_URL from .env ───────────────────────────────────────
export $(grep -v '^#' .env | xargs)

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}✗  DATABASE_URL is not set in .env. Please fill it in and re-run.${NC}"
  exit 1
fi

echo -e "${GREEN}✓  .env loaded${NC}"
echo "   DATABASE_URL: ${DATABASE_URL:0:40}..."
echo ""

# ── Step 3: Check psql is available (to create the DB) ───────────────────────
# Extract DB name from connection string (last path segment)
DB_NAME=$(echo "$DATABASE_URL" | sed 's/.*\///')
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's/.*@([^:\/]+).*/\1/')
DB_PORT=$(echo "$DATABASE_URL" | grep -oE ':[0-9]+/' | tr -d ':/')
DB_USER=$(echo "$DATABASE_URL" | sed -E 's/postgresql:\/\/([^:@]+).*/\1/')
DB_PORT=${DB_PORT:-5432}

echo -e "${CYAN}→ Creating database '${DB_NAME}' if it doesn't exist...${NC}"

# Try creating the database (ignore error if it already exists)
if command -v psql &> /dev/null; then
  psql "postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/postgres" \
    -c "CREATE DATABASE \"${DB_NAME}\";" 2>/dev/null \
    && echo -e "${GREEN}✓  Database '${DB_NAME}' created${NC}" \
    || echo -e "${YELLOW}   Database '${DB_NAME}' already exists — skipping${NC}"
else
  echo -e "${YELLOW}⚠  psql not found in PATH — skipping auto-create.${NC}"
  echo "   Please manually create a database named '${DB_NAME}' in pgAdmin or Postgres.app."
  echo "   Then press Enter to continue..."
  read -p ""
fi

echo ""

# ── Step 4: Install npm dependencies ─────────────────────────────────────────
echo -e "${CYAN}→ Installing npm packages...${NC}"
npm install --silent
echo -e "${GREEN}✓  npm packages installed${NC}"
echo ""

# ── Step 5: Generate Prisma client ───────────────────────────────────────────
echo -e "${CYAN}→ Generating Prisma client...${NC}"
npx prisma generate
echo -e "${GREEN}✓  Prisma client generated${NC}"
echo ""

# ── Step 6: Run database migrations ──────────────────────────────────────────
echo -e "${CYAN}→ Running database migrations...${NC}"
npx prisma migrate dev --name init
echo -e "${GREEN}✓  Migrations applied — all tables created${NC}"
echo ""

# ── Step 7: Seed demo data ────────────────────────────────────────────────────
echo -e "${CYAN}→ Seeding demo data (35 entities, 78 directors, board meetings, compliance...)${NC}"
npm run db:seed
echo -e "${GREEN}✓  Demo data loaded${NC}"
echo ""

# ── Done ──────────────────────────────────────────────────────────────────────
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓  EntityOS is ready!                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo "   Run the app:       npm run dev"
echo "   Open in browser:   http://localhost:3000"
echo "   Database GUI:      npx prisma studio"
echo ""
