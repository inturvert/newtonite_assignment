# Newtonite — Operational Coordination Engine

> **A high-concurrency internal work coordination platform built to replace fragmented chat, spreadsheet, and email workflows.**  
> Candidate submission for the **Newtonite Software Engineering Challenge** (`Newtonite_Software_Engineering_Challenge.pdf`).

---

## 🚀 Running the Application Locally

Newtonite is a full-stack application with a React frontend, an Express API, and a local SQLite database. The normal setup does not require Docker or PostgreSQL. Docker is optional and is included for future database deployment reference.

### 1. Install the required software

Install the following before starting:

* **Node.js 22 LTS** from [nodejs.org](https://nodejs.org/). npm is included with Node.js.
* A modern browser such as Chrome, Edge, Firefox, or Safari.
* Git is optional if the project was downloaded as a ZIP file.

After installing Node.js, open a new terminal and confirm it is available:

```text
node --version
npm --version
```

Node.js 22 LTS is recommended because the project uses current Vite, Prisma, TypeScript, and server tooling. If the commands are not recognized, restart the terminal after installing Node.js.

### 2. Get the project

If using Git:

```bash
git clone <your-repository-url>
cd <repository-folder>/newtonite
```

If using a ZIP download, extract the repository, open a terminal in the repository folder, and enter the `newtonite` directory:

```bash
cd newtonite
```

### 3. Install backend dependencies and prepare the database

Run these commands from the `newtonite` directory:

```bash
cd server
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

These commands install the API dependencies, generate the Prisma client, create the local SQLite schema, and insert the demo users, teams, work items, and activity history.

The server reads configuration from `server/.env`. If that file is not included in your copy of the repository, create it with this content:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="newtonite-dev-secret-change-in-production-abc123xyz"
PORT=3001
NODE_ENV=development
```

The included values are for local development only. Use a new secret for a real deployment and never commit private production secrets.

### 4. Install frontend dependencies

Open a second terminal. From the `newtonite` directory, run:

```bash
cd client
npm install
```

### 5. Start the backend and frontend

Keep two terminals open.

In the first terminal, from `newtonite/server`:

```bash
npm run dev
```

The backend runs at `http://localhost:3001`.

In the second terminal, from `newtonite/client`:

```bash
npm run dev
```

The frontend runs at `http://localhost:5174`. Open that address in your browser. The Vite proxy forwards `/api` requests to the backend on port `3001`.

### Windows PowerShell example

Use two PowerShell windows.

PowerShell window 1:

```powershell
cd path\to\repository\newtonite\server
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

PowerShell window 2:

```powershell
cd path\to\repository\newtonite\client
npm install
npm run dev
```

Open `http://localhost:5174`.

### Linux terminal example

Use two terminal windows.

Terminal 1:

```bash
cd /path/to/repository/newtonite/server
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Terminal 2:

```bash
cd /path/to/repository/newtonite/client
npm install
npm run dev
```

Open `http://localhost:5174`.

### Root shortcut commands

After installing dependencies in both `server` and `client`, these commands can also be run from the `newtonite` directory:

```bash
npm run server   # Start the backend
npm run client   # Start the frontend
npm run seed     # Seed the local database
npm run build    # Build both backend and frontend
npm test         # Run backend tests
```

### Reset the local database

To delete the local SQLite data and recreate the seeded database:

```bash
cd server
npm run db:reset
npm run db:seed
```

This removes local development data. Do not run it against a production database.

---

## 🧪 Running Automated Concurrency Tests

To run the automated test suite verifying the 5 critical concurrency behaviors:

```bash
cd server
npm test
```

### Verified Behaviors:
* ✅ **Optimistic Locking:** Rejects stale edits with `409 Conflict` when version numbers mismatch.
* ✅ **Atomic Claiming:** Prevents race conditions when two users attempt to claim an unassigned work item simultaneously.
* ✅ **Idempotency Keys:** Prevents duplicate operations across rapid clicks or network retries via `X-Idempotency-Key`.
* ✅ **State Machine Rules:** Validates that status transitions strictly obey legitimate workflow paths.
* ✅ **Server-Enforced RBAC:** Independently rejects privilege escalation (e.g. member attempting to mark critical priority).
* ✅ **Immutable Audit Trail:** Ensures every mutation logs an unalterable history event.

---

## 👥 Demo Personas for Quick Role Evaluation

The top navigation bar contains a **1-click Persona Switcher** allowing you to instantly switch between users to test role-based permissions:

| Persona | Email | Password | Role | Team |
|---|---|---|---|---|
| **Alice Chen** | `alice@newtonite.corp` | `password123` | **Lead / Admin** | Platform Engineering |
| **Bob Sharma** | `bob@newtonite.corp` | `password123` | **Member / Dev** | Platform Engineering |
| **Carol Taylor** | `carol@newtonite.corp` | `password123` | **Manager** | Payments & Settlement |
| **David Patel** | `david@newtonite.corp` | `password123` | **Member / Ops** | Payments & Settlement |
| **Eva Rodriguez** | `eva@newtonite.corp` | `password123` | **Lead / Admin** | Compliance & Legal |

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────┐
│               Frontend (React 19 + Vite)               │
│  - Optimistic Concurrency Visualizer                   │
│  - Conflict Resolution Banner (409 Handler)            │
│  - Immediate Attention Triage Queue                    │
│  - 1-Click Role Switcher                               │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP (with X-Idempotency-Key)
                            ▼
┌────────────────────────────────────────────────────────┐
│            Backend API (Node.js + Express)             │
│  - Idempotency Interceptor Middleware                  │
│  - JWT Authentication Middleware                       │
│  - Resource-Level RBAC Middleware                      │
│  - State Machine Workflow Engine                       │
│  - Optimistic Locking Service                          │
└───────────────────────────┬────────────────────────────┘
                            │ ACID Transactions
                            ▼
┌────────────────────────────────────────────────────────┐
│           Relational Database (Prisma ORM)             │
│  - `work_items` (with atomic `version` column)         │
│  - `activity_log` (append-only immutable audit trail)  │
│  - `idempotency_keys` (24h cache)                      │
│  - `teams` & `team_members` (multi-tenancy isolation) │
└────────────────────────────────────────────────────────┘
```

---

## 📂 Key Documents
* [`ENGINEERING_DECISIONS.md`](./ENGINEERING_DECISIONS.md): Detailed analysis of 6 key trade-offs (Optimistic Locking vs Pessimistic Locking, Append-only logs, Server-side RBAC, etc.).
* [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md): Answers to the Final Discussion topics (failure modes, assumptions, and scaling roadmap).
* [`docker-compose.yml`](./docker-compose.yml): Production-ready PostgreSQL container definition.
