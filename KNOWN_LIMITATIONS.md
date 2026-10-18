# Known Limitations & Future Architecture Roadmap

This document outlines the known boundaries of the current implementation and describes the engineering steps that would be taken if given an additional week or if the company scales by an order of magnitude.

---

## 1. Current Known Limitations

### Real-time Push Notifications (WebSockets / SSE)
* **Current State:** The application currently relies on user navigation, window focus events, and user-initiated actions to refresh data from the server.
* **Limitation:** If User A updates an item while User B has it open on their screen, User B is alerted via the Conflict Banner only when User B attempts to commit an action (Optimistic Locking).
* **Next Step:** Implement WebSocket subscriptions or Server-Sent Events (SSE) backed by a Redis Pub/Sub cluster. When a work item is mutated, the server broadcasts an event to all connected clients viewing that specific `workItemId`, updating their viewport in real-time or displaying a subtle toast notification: *"User A just updated this ticket"*.

### Full-Text Search Scalability
* **Current State:** Search queries use SQL `contains` / `LIKE` across the `title` and `description` columns.
* **Limitation:** Substring search performs sequential scans without full-text indexes once the dataset exceeds 500,000 items.
* **Next Step:** Introduce PostgreSQL `tsvector` with GIN indexing for weighted search (ranking titles higher than body text), or integrate an external search indexer such as Meilisearch or Elasticsearch for typo-tolerant fuzzy matching.

### Asynchronous Background Worker Queue
* **Current State:** Audit logs and idempotency keys are processed within the request lifecycle.
* **Limitation:** Secondary tasks (e.g. sending Slack/PagerDuty alerts, external webhook dispatch, or SLA breach escalation timers) would add latency to HTTP request handlers if executed synchronously.
* **Next Step:** Offload non-critical side effects to a Redis-backed message broker (e.g. BullMQ / Kafka) with exponential backoff retries, dead-letter queues (DLQ), and distributed tracing (OpenTelemetry).

### Fine-Grained Field-Level Permissions
* **Current State:** Authorization is enforced at the team and resource level (`admin`, `manager`, `member`).
* **Limitation:** Field-level permissions (e.g. only legal counsel can view the `compliance_audit_notes` field) are not currently segmented into separate sub-schemas.
* **Next Step:** Introduce attribute-based access control (ABAC) with field masking for sensitive financial or legal data.

---

## 2. Answers to Final Discussion Inquiries

### What happens when things fail?
* **Database Deadlock / Transient Disconnection:** The database operations are wrapped in ACID transactions. If a transaction fails mid-flight, all changes are rolled back automatically, preventing partial writes.
* **Duplicate Submissions:** The idempotency layer catches repeated requests and returns the cached result without double execution.
* **Version Collisions:** Conflicting edits are rejected with `409 Conflict` and return the current server state, protecting data integrity.

### What assumptions were made?
* **Multi-Tenancy Isolation:** Users should only have visibility into teams where they have active membership.
* **Conflict Frequency:** Concurrent edits to the exact same work item occur occasionally rather than constantly, making Optimistic Concurrency Control significantly more performant than Pessimistic Row Locking.
* **Audit Immutability:** Operational compliance requires that once a comment or status transition is committed, it cannot be edited or deleted by anyone, including admins.

### What would we change if the application grew significantly (100,000+ items)?
1. **Database Read Replicas:** Route heavy dashboard and reporting queries to read replicas while directing mutations to the primary database.
2. **Table Partitioning:** Partition `activity_log` by year/month to keep hot indexes in memory.
3. **Redis Caching:** Cache team membership lists and user permissions with TTLs to reduce repetitive auth queries.
