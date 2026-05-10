# Seed data

This folder is the **single source of truth** for seed data. The seed script
(`prisma/seed.ts`) reads `seed-data.json`, which is generated from the two
authoritative spreadsheets.

## Files

| File | Purpose |
|---|---|
| `entity-tracker.xlsx` | Master Sheet — 28 active + 7 dissolved entities with full metadata, directors, licenses, corporate secretary, etc. |
| `board-meetings-calendar.xlsx` | Subsidiary Governance Matrix + 2026 quarterly board meeting schedule. |
| `parse_xlsx.py` | Python script that parses both workbooks into `seed-data.json`. |
| `seed-data.json` | Generated structured data file consumed by `prisma/seed.ts`. **Do not edit by hand** — regenerate via the parser. |

## Refresh the data after the spreadsheets change

From the repo root:

```bash
# 1. Replace the .xlsx files in this folder with the updated versions
# 2. Regenerate the JSON
python3 prisma/data/parse_xlsx.py \
    prisma/data/entity-tracker.xlsx \
    prisma/data/board-meetings-calendar.xlsx

# 3. Reset the database and re-seed
npx prisma migrate reset
```

`prisma migrate reset` drops the DB, re-applies the init migration, regenerates
the Prisma client, and runs the seed — all in one step.

## What is seeded

- **Users** — 7 application users (hardcoded in `seed.ts`)
- **Entities** — all 35 rows from the Master Sheet (28 active + 7 dissolved), with parent/subsidiary links inferred from entity names
- **Directors** — parsed from the "D&Os" free-text column; synthetic `@governanceos.app` emails generated from names; appointment dates left null
- **Licenses** — parsed from the "Licenses" column; issue/expiry dates left null (not in source data)
- **Board meetings** — all 2026 quarterly meetings from the Subsidiaries Calendar, with attendees / owners / circulation deadlines stored in the `notes` field

## What is NOT seeded

These tables exist in the schema but have no source data in the spreadsheets,
so the seed leaves them empty:

- `ComplianceObligation`
- `RegulatoryCapital`
- `BankAccount`
- `Alert`
- `MeetingAttendee` (attendee names in the calendar are free text — no 1:1 mapping to directors)
- `MeetingDocument`, `MeetingResolution`
- `Document` (vault)

The dashboard and relevant pages have been updated to handle these empty
states gracefully. To add real data for any of these, extend the spreadsheets
and extend `parse_xlsx.py` to emit the new tables into `seed-data.json`.
