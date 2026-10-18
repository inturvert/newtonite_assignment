# Newtonite — Operational Coordination Engine

> **A high-concurrency internal work coordination platform built to replace fragmented chat, spreadsheet, and email workflows.**  


---

## 🚀 Running the Application Locally

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
git clone https://github.com/inturvert/newtonite_assignment.git
cd newtonite_assignment
```

If using a ZIP download, extract the repository, open a terminal in the repository folder ie in `newtonite_assignment` directory

```bash
cd newtonite_assignment
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

The server reads configuration from `server/.env`.

### 4. Install frontend dependencies

Open a second terminal. From the `newtonite_assignment` directory, run:

```bash
cd client
npm install
```

### 5. Start the backend and frontend

Keep two terminals open.

In the first terminal, from `newtonite_assignment/server`:

```bash
npm run dev
```

The backend runs at `http://localhost:3001`.

In the second terminal, from `newtonite_assignment/client`:

```bash
npm run dev
```

The frontend runs at `http://localhost:5174`. Open that address in your browser. The Vite proxy forwards `/api` requests to the backend on port `3001`.

### Windows PowerShell example

Use two PowerShell windows.

PowerShell window 1:

```powershell
cd path\to\repository\newtonite_assignment\server
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

PowerShell window 2:

```powershell
cd path\to\repository\newtonite_assignment\client
npm install
npm run dev
```

Open `http://localhost:5174`.

### Linux terminal example

Use two terminal windows.

Terminal 1:

```bash
cd /path/to/repository/newtonite_assignment/server
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Terminal 2:

```bash
cd /path/to/repository/newtonite_assignment/client
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
---

## 📂 Key Documents
* [`ENGINEERING_DECISIONS.md`](./ENGINEERING_DECISIONS.md): Detailed analysis of 6 key trade-offs (Optimistic Locking vs Pessimistic Locking, Append-only logs, Server-side RBAC, etc.).
* [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md): Answers to the Final Discussion topics (failure modes, assumptions, and scaling roadmap).
* [`docker-compose.yml`](./docker-compose.yml): Production-ready PostgreSQL container definition.
