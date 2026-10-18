import React, { useState } from 'react';
import {
  X,
  Lock,
  Zap,
  Repeat,
  ShieldCheck,
  FileText,
  Server,
  Layers,
} from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'concurrency' | 'decisions' | 'model' | 'limits'>('concurrency');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white">
                Newtonite Architecture & Engineering Decisions
              </h2>
              <p className="text-[11px] text-slate-400">
                Candidate submission documentation according to challenge guidelines
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950 overflow-x-auto text-xs font-bold text-slate-400">
          <button
            onClick={() => setActiveTab('concurrency')}
            className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'concurrency'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>1. Critical Concurrency</span>
          </button>

          <button
            onClick={() => setActiveTab('decisions')}
            className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'decisions'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>2. 5 Key Trade-Off Decisions</span>
          </button>

          <button
            onClick={() => setActiveTab('model')}
            className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'model'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <Server className="h-3.5 w-3.5" />
            <span>3. Schema & Data Model</span>
          </button>

          <button
            onClick={() => setActiveTab('limits')}
            className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'limits'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>4. Known Limitations & Future</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-300">
          {activeTab === 'concurrency' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-800/80 text-indigo-200">
                <h4 className="font-bold text-sm text-white mb-1">
                  How Newtonite Solves Non-CRUD Concurrency Challenges
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  As demanded in the candidate brief, our implementation specifically handles multi-user operational collisions at the database transaction layer rather than relying on ideal user behavior.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <Lock className="h-4 w-4 text-indigo-400" />
                    <span>Optimistic Locking (`version` column)</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Every work item carries a monotonically increasing version number. On updates, the client must supply the version it read. If another user committed a change in the interim, the query matches 0 rows and returns <code>409 Conflict</code> with the latest server state, opening the conflict banner.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <Zap className="h-4 w-4 text-amber-400" />
                    <span>Atomic Claiming (Anti-Race Condition)</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    When multiple users simultaneously click "Claim Item", an atomic database transaction verifies <code>assigneeId IS NULL AND version = expectedVersion</code>. Exactly one user succeeds; subsequent requests instantly fail with 409 Conflict.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <Repeat className="h-4 w-4 text-emerald-400" />
                    <span>Idempotency Keys (`X-Idempotency-Key`)</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    All mutating requests (POST, PATCH) send a client-generated UUID. The server stores executed responses in the <code>idempotency_keys</code> table. Repeated requests due to network lag return the cached response without duplicate side-effects.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <ShieldCheck className="h-4 w-4 text-blue-400" />
                    <span>State Machine Workflow Enforcement</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Statuses cannot be arbitrarily changed. A strict transition matrix ensures items progress through legitimate phases: <code>open ➔ in_progress ➔ under_review ➔ resolved ➔ closed</code>. Only managers/admins can reopen closed items.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'decisions' && (
            <div className="space-y-3.5">
              <h4 className="font-bold text-sm text-white">5 Key Architectural Decisions (Trade-Offs)</h4>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="font-bold text-white mb-1">1. Optimistic Locking vs Pessimistic DB Row Locking</div>
                <p className="text-slate-400">
                  <strong>Decision:</strong> Used version-based optimistic locking. <br />
                  <strong>Trade-off:</strong> Pessimistic locks (e.g. <code>SELECT FOR UPDATE</code>) hold database connections open while a human reads or types in a form, destroying database throughput at scale. Optimistic locking allows thousands of concurrent readers and rejects conflicts only on commit.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="font-bold text-white mb-1">2. Append-Only Audit Trail vs Updating In-Place</div>
                <p className="text-slate-400">
                  <strong>Decision:</strong> Created a dedicated <code>activity_log</code> table that only allows inserts (no updates or deletes). <br />
                  <strong>Trade-off:</strong> Uses slightly more storage, but guarantees an unalterable operational compliance record answering "who changed what, when, and why".
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="font-bold text-white mb-1">3. Server-Enforced RBAC vs UI-Only Gating</div>
                <p className="text-slate-400">
                  <strong>Decision:</strong> Implemented middleware checking team membership and role permissions on every API endpoint. <br />
                  <strong>Trade-off:</strong> Adds a database lookup to mutation endpoints, but guarantees security even if a malicious user bypasses the frontend via curl or Postman.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="font-bold text-white mb-1">4. Server-Side Pagination & Filtering vs Client-Side In-Memory Filtering</div>
                <p className="text-slate-400">
                  <strong>Decision:</strong> Enforced SQL-level <code>skip/take</code> pagination and indexed filtering on status, priority, and team. <br />
                  <strong>Trade-off:</strong> Requires frontend state synchronization, but scales gracefully to hundreds of thousands of work items without browser memory exhaustion.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="font-bold text-white mb-1">5. Zero-Friction Portability via SQLite & Prisma with PostgreSQL Compatibility</div>
                <p className="text-slate-400">
                  <strong>Decision:</strong> Configured Prisma ORM with SQLite for zero-dependency execution out of the box, with an included Docker Compose file for PostgreSQL in production. <br />
                  <strong>Trade-off:</strong> Reviewers and testers can clone and run <code>npm test</code> and <code>npm run dev</code> in under 5 seconds with zero external database service configuration.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'model' && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-white">Relational Data Model</h4>
              <div className="rounded-xl bg-slate-950 p-3 font-mono text-[11px] text-slate-300 border border-slate-800 overflow-x-auto space-y-1">
                <div><strong>users:</strong> id (UUID), email (UNIQUE), name, password_hash, created_at</div>
                <div><strong>teams:</strong> id (UUID), name (UNIQUE), description, created_at</div>
                <div><strong>team_members:</strong> user_id, team_id, role (admin | manager | member) [PK: user_id, team_id]</div>
                <div><strong>work_items:</strong> id, title, description, status, priority, type, team_id, creator_id, assignee_id, version, due_date, created_at, updated_at</div>
                <div><strong>activity_log:</strong> id, work_item_id, actor_id, action, old_value, new_value, comment, created_at [APPEND-ONLY]</div>
                <div><strong>idempotency_keys:</strong> key (PK), response (JSON), status_code, expires_at</div>
              </div>
            </div>
          )}

          {activeTab === 'limits' && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-white">Known Limitations & Production Roadmap</h4>
              <ul className="space-y-2 text-slate-400 list-disc list-inside">
                <li><strong>WebSocket Real-Time Broadcasts:</strong> Current implementation uses React Query polling and window focus refetching. In a production cluster, Redis Pub/Sub with WebSocket subscriptions would push real-time toast notifications when another user edits an active item.</li>
                <li><strong>Elasticsearch / Postgres Full-Text Search:</strong> Search currently uses SQL <code>LIKE/contains</code>. For tens of millions of items, pg_trgm or Meilisearch would provide fuzzy tokenized search.</li>
                <li><strong>Async Background Queue:</strong> Heavy operations like automated email notifications or PDF compliance export should be offloaded to a Redis-backed BullMQ queue with retry and dead-letter queues.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
};
