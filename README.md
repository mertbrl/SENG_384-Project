# ClinBridge Co-Creation Platform

Full-stack application scaffold for **SENG 384** — a co-creation platform for healthcare and engineering collaboration.

## Tech stack

| Layer        | Choice                          |
| ------------ | ------------------------------- |
| Frontend     | React + Vite                    |
| Backend      | Express                         |
| Data         | PostgreSQL + Prisma ORM       |
| Local deploy | Docker Compose (optional), `docker-compose.yml` |

## Getting started

From the repository root:

```bash
npm install
npm run dev
```

- **Frontend:** [http://localhost:5173](http://localhost:5173) — Vite proxies `/api` to the backend (`frontend/vite.config.js` must match the backend port).
- **Backend:** Port comes from `backend/.env` (`PORT`, e.g. `5000` or `5001`). Keep it in sync with the Vite proxy.

PostgreSQL must be running. Connection string: `DATABASE_URL` in `backend/.env`.

If you use Docker for the database:

```bash
docker compose up -d db
cd backend
npm run db:migrate
npm run db:seed
```

## Demo accounts

Created by `npm run db:seed` (see `backend/prisma/seed.js`):

| Role       | Email                     | Password     |
| ---------- | ------------------------- | ------------ |
| Admin      | `admin@healthai.edu.tr`   | `Admin123!`  |
| Engineer   | `engineer@itu.edu.tr`     | `Engineer123!` |
| Healthcare | `doctor@hacettepe.edu.tr` | `Doctor123!` |

## Database, migrations, and data persistence

### What stays after you stop coding

- **Registered users, posts, meetings, activity logs, and other rows live in PostgreSQL** (or whatever database `DATABASE_URL` points to). They are **not** stored in Git.
- **Closing your laptop or IDE does not wipe the database.** Data remains on disk until something explicitly removes or resets it.
- **`git push` only moves source code** (and tracked files). It does **not** back up or restore your database. Cloning the repo elsewhere gives you an empty schema until you run migrations (and optionally seed) against a new database.

### Migrations (safe day-to-day workflow)

- **Adding or changing schema (development):**  
  `cd backend && npm run db:migrate` — runs `prisma migrate dev`.
- **Production-like / CI deploy:**  
  `npm run db:migrate:prod` — runs `prisma migrate deploy` (applies pending migrations without resetting data).

### No automatic “reset everything” on startup

The legacy **`npm run db:reset` script was removed on purpose** so a normal `npm run dev` does **not** drop all tables. The API only connects with Prisma (`prisma.$connect()`); it does **not** run `prisma migrate reset` when the server starts.

### When data *is* destroyed (avoid by accident)

| Action | Effect |
| ------ | ------ |
| `npx prisma migrate reset` | **Deletes all data**, reapplies migrations from scratch. Use only when you intentionally want a clean slate. |
| Deleting the DB volume / data directory | All data in that instance is gone. |
| Pointing `DATABASE_URL` at a **new empty** database | Your old data stays on the old server; the new URL starts empty until you migrate/seed. |

Before running `migrate reset` or destructive Docker commands on anything important, take a backup (e.g. `pg_dump`).

## Docker

`docker-compose.yml` can bring up the database and optionally the full stack. If you do not use Docker, a local PostgreSQL instance and a correct `DATABASE_URL` are enough.

## Troubleshooting

### Vite: `Failed to resolve import "react-hot-toast"`

The dependency may be missing or `node_modules` / the Docker image may be stale.

- **Local:** `cd frontend && npm install`
- **Docker:** Rebuild the frontend image, e.g. `docker compose build frontend --no-cache`, then `docker compose up -d frontend`

### Email verification: “User not found” or token does not work

- If the **database was reset**, that user and token are gone; old email links are **invalid**. Register again or use **Resend token** for a new email.
- After **Resend**, older emails are superseded; use the **latest** message.
- The app normalizes pasted tokens; still paste the full **64-character** hex token when using manual verification.

Verification URLs use `BACKEND_PUBLIC_URL` + `/api/auth/verify-email?token=...`. Ensure the host in the email hits the same backend **and** the same database as your running app (avoid mixing local vs Docker URLs unintentionally).

---

*Course context: SENG 384 — ClinBridge co-creation platform.*
