# Engineering Decisions & Architectural Trade-offs

This document outlines the six core architectural decisions made while engineering the **Newtonite Operational Coordination Engine**, explaining the rationale, alternative approaches considered, and deliberate trade-offs accepted.

---

## Decision 1: Version-Based Optimistic Concurrency Control vs. Pessimistic Locking

### Context & Problem
Multiple users across different teams view and edit the same operational work items. If User A opens an incident at 10:00 and submits changes at 10:05, while User B submitted changes at 10:03, a naive `UPDATE` statement would silently overwrite User B's edits ("lost update anomaly").

### Decision
We implemented **Optimistic Concurrency Control (OCC)** using a monotonic integer column `version` on the `work_items` table.
* Every mutation (`PATCH /api/work-items/:id`, transitions, assignments) requires the client to supply the expected `version` number.
* The update SQL query includes `WHERE id = :id AND version = :expectedVersion`.
* If zero rows are affected, the server throws a `409 Conflict` containing the current server state.
* The client displays a **Conflict Resolution Banner** alerting the user that the item was modified and allows one-click reloading of the latest state.

### Trade-offs & Alternatives
* **Alternative Considered: Pessimistic Row Locking (`SELECT FOR UPDATE`)**
  * *Why Rejected:* Holding database-level locks while a human reads or fills a form in their browser ties up database connection pool slots, causes deadlocks, and degrades throughput at scale (thousands of active users).
  * *Trade-off Accepted:* OCC assumes collisions are the exception rather than the norm. When collisions occur, the second writer must re-apply their changes against the latest state.

---

## Decision 2: Atomic Database-Level Ownership Claiming vs. Application-Level Mutexes

### Context & Problem
A high-severity production incident arrives unassigned. Two engineers on the on-call team simultaneously click "Claim Item" to take responsibility.

### Decision
We implemented **Atomic Database-Level Assignment** within a database transaction:
```sql
UPDATE work_items
SET assignee_id = :userId, version = version + 1
WHERE id = :id AND assignee_id IS NULL AND version = :expectedVersion
RETURNING *;
```
If the item was already claimed or modified, the transaction returns 0 rows and throws `409 Conflict: "Race condition prevented: Item was already claimed by [Name]"`.

### Trade-offs & Alternatives
* **Alternative Considered: Application-Level Locks (Node.js Mutex / In-Memory Semaphore)**
  * *Why Rejected:* In-memory locks fail immediately as soon as the backend is horizontally scaled across multiple instances or containers.
  * *Trade-off Accepted:* By delegating atomicity directly to the database transaction, we guarantee safety across any number of clustered backend nodes without introducing a distributed lock manager (like Redlock/ZooKeeper) at this stage.

---

## Decision 3: Idempotent Mutation Interceptor via Client-Generated Request Keys

### Context & Problem
Users experiencing network latency or unsure whether their button click succeeded frequently repeat actions (e.g. double-clicking "Resolve Incident" or "Submit Comment").

### Decision
We implemented an **Idempotency Interceptor Middleware** (`src/middleware/idempotency.ts`):
* The client generates a unique UUID `X-Idempotency-Key` on every mutating request.
* Before executing the route handler, the server queries the `idempotency_keys` table.
* **Cache HIT:** If the key exists and has not expired, the middleware short-circuits execution and returns the stored HTTP status code and response payload with header `X-Idempotency-Hit: true`.
* **Cache MISS:** The route handler executes normally, and the middleware intercepts the response body to persist it with a 24-hour expiration window.

### Trade-offs & Alternatives
* **Alternative Considered: Client-side button disabling (`disabled={isSubmitting}`)**
  * *Why Insufficient:* Client-side disabling only protects against local double-clicks. It provides zero protection against network drops, browser refreshes, or automated retries.
  * *Trade-off Accepted:* Idempotency keys consume a small amount of storage in `idempotency_keys`, which is mitigated via indexed `expires_at` timestamps for automatic garbage collection.

---

## Decision 4: Server-Enforced Resource-Level Authorization (RBAC) vs. UI-Only Gating

### Context & Problem
Different users belong to multiple teams with different responsibilities. A regular team member should not be able to escalate items to "Critical" priority or reopen closed tickets; only team managers and admins should have that authority.

### Decision
We implemented **Server-Enforced Resource-Level Authorization**:
* Every request is verified via JWT middleware, and team roles (`admin`, `manager`, `member`) are evaluated directly against the database on each mutation.
* Role-based rules enforced at the API boundary:
  1. A user cannot view or mutate items belonging to teams they do not belong to (`403 Forbidden`).
  2. Escalating priority to `critical` requires `manager` or `admin` role.
  3. Reopening a `closed` item requires `manager` or `admin` role.
  4. Assigning items to other members requires `manager` or `admin` role.

### Trade-offs & Alternatives
* **Alternative Considered: Frontend-only conditional rendering**
  * *Why Rejected:* The candidate brief explicitly states: *"Authorization must be enforced by the system itself and should not rely only on hiding controls in the user interface."*
  * *Trade-off Accepted:* Adds a lightweight lookup to verify team role on mutations, guaranteeing full security even if requests are sent directly via cURL or Postman.

---

## Decision 5: Append-Only Immutable Audit Trail vs. In-Place Field Updates

### Context & Problem
In operational work, requests often change ownership, priority, and status several times. When a failure occurs, management needs to understand *who* made decisions, *when*, and *why*.

### Decision
We created a dedicated `activity_log` table:
* Every lifecycle event (item creation, field edits, assignments, state transitions, comments) records an unalterable log containing `actor_id`, `action`, `old_value`, `new_value`, optional `comment`, and immutable `created_at`.
* No `UPDATE` or `DELETE` endpoints exist for activity logs.

### Trade-offs & Alternatives
* **Alternative Considered: Storing previous state in JSON revision column**
  * *Why Rejected:* Harder to query chronological timeline across multiple items or generate operational velocity reports.
  * *Trade-off Accepted:* Append-only tables grow linearly with activity volume. At extreme scale (millions of rows), older logs can be partitioned by date or archived to cold storage.

---

## Decision 6: Explicit Workflow State Machine vs. Free-Form Status Changes

### Context & Problem
Unregulated status changes cause chaos (e.g. an engineer jumping an issue directly from `open` to `resolved` without ever investigating or submitting for review).

### Decision
We defined an explicit state transition matrix (`ALLOWED_TRANSITIONS` in `src/utils/constants.ts`):
* `open` ➔ `in_progress`, `closed`
* `in_progress` ➔ `under_review`, `open`, `resolved`
* `under_review` ➔ `resolved`, `in_progress`
* `resolved` ➔ `closed`, `in_progress` (reopen)
* `closed` ➔ `open` (restricted to manager/admin)

Any transition violating this graph is rejected with `400 ValidationError`.

### Trade-offs & Alternatives
* **Alternative Considered: Unrestricted status dropdowns**
  * *Why Rejected:* Free-form status changes bypass quality gates and break operational SLA tracking.
  * *Trade-off Accepted:* Introduces structured workflow boundaries that require team alignment.
