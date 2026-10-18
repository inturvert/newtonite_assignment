# Newtonite — Operational Coordination Engine

> **A high-concurrency internal work coordination platform built to replace fragmented chat, spreadsheet, and email workflows.**  
> Candidate submission for the **Newtonite Software Engineering Challenge** (`Newtonite_Software_Engineering_Challenge.pdf`).

---

## 🚀 Quick Start (Zero-Friction Local Run)

### Prerequisites
* **Node.js** v18+ & **npm**

### 1. Install & Seed
```bash
# Clone and enter directory
cd newtonite

# Install server dependencies & seed demo database
cd server
npm install
npm run db:push
npm run db:seed
```

### 2. Run Backend & Frontend
In one terminal:
```bash
# Start backend API (runs on http://localhost:3001)
npm run dev
```

In a second terminal:
```bash
# Start frontend client (runs on http://localhost:5174)
cd ../client
npm install
npm run dev
```

Open **`http://localhost:5174`** in your browser!

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
