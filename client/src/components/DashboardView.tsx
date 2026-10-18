import React from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Hourglass,
  ArrowRight,
  Flame,
  ShieldAlert,
  UserX,
} from 'lucide-react';
import type { DashboardStats, WorkItem } from '../types';

interface DashboardViewProps {
  stats: DashboardStats | null;
  attentionItems: WorkItem[];
  onSelectItem: (item: WorkItem) => void;
  onFilterByStatus: (status: string) => void;
  onFilterByPriority: (priority: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  attentionItems,
  onSelectItem,
  onFilterByStatus,
  onFilterByPriority,
}) => {
  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Hourglass className="h-6 w-6 animate-spin mr-2 text-indigo-400" />
        <span>Loading operational metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Work */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Work Items
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {stats.total}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Across your teams</div>
        </div>

        {/* Needs Attention Alert Card */}
        <div
          onClick={() => onFilterByPriority('critical')}
          className="rounded-2xl bg-gradient-to-br from-rose-950/80 to-slate-900 border border-rose-800/60 p-4 shadow-sm cursor-pointer hover:border-rose-600 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
              <span>Needs Attention</span>
            </span>
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono">
            {stats.attentionCount}
          </div>
          <div className="mt-1 text-[11px] text-rose-300/80 group-hover:text-rose-200 flex items-center gap-1">
            <span>{stats.overdueCount} overdue</span>
            <span>➔</span>
          </div>
        </div>

        {/* In Progress */}
        <div
          onClick={() => onFilterByStatus('in_progress')}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-sm cursor-pointer hover:border-blue-600 transition-all group"
        >
          <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>In Progress</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {stats.byStatus.in_progress || 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 group-hover:text-slate-300">
            Actively being worked
          </div>
        </div>

        {/* Under Review */}
        <div
          onClick={() => onFilterByStatus('under_review')}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-sm cursor-pointer hover:border-amber-600 transition-all group"
        >
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Hourglass className="h-3.5 w-3.5" />
            <span>Under Review</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {stats.byStatus.under_review || 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 group-hover:text-slate-300">
            Awaiting sign-off
          </div>
        </div>

        {/* Resolved */}
        <div
          onClick={() => onFilterByStatus('resolved')}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-sm cursor-pointer hover:border-emerald-600 transition-all group col-span-2 lg:col-span-1"
        >
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Resolved / Closed</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {(stats.byStatus.resolved || 0) + (stats.byStatus.closed || 0)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 group-hover:text-slate-300">
            Completed tasks
          </div>
        </div>
      </div>

      {/* Main Grid: Urgent Attention List & Priority Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Urgent Attention Queue (8 cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-rose-500" />
                  <span>Immediate Operational Attention Queue</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Unowned high-severity items and SLA-breached tasks across your teams
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-rose-400 bg-rose-950/80 border border-rose-800/80 px-2.5 py-1 rounded-full">
                {attentionItems.length} Urgent
              </span>
            </div>

            {attentionItems.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <span>All clear! No overdue or unassigned critical items.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {attentionItems.map((item) => {
                  const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectItem(item)}
                      className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 hover:border-slate-700 hover:bg-slate-800/40 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded font-mono ${
                              item.priority === 'critical'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                                : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                            }`}
                          >
                            {item.priority}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            {item.team.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            v{item.version}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
                          {item.title}
                        </h4>

                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                          {item.assignee ? (
                            <span>Assigned: {item.assignee.name}</span>
                          ) : (
                            <span className="text-rose-400 font-semibold flex items-center gap-1">
                              <UserX className="h-3 w-3" />
                              <span>UNASSIGNED</span>
                            </span>
                          )}

                          {isOverdue && (
                            <span className="text-rose-400 font-bold flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span>OVERDUE SLA</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 self-end sm:self-center">
                        <button className="flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 bg-indigo-950/50 hover:bg-indigo-900/60 px-3 py-1.5 rounded-xl border border-indigo-800/50 transition-colors">
                          <span>Inspect</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Priority & Status Breakdown (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Priority Breakdown Card */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-800 pb-3">
              Active Items by Severity
            </h3>

            <div className="space-y-3.5">
              {[
                { label: 'Critical', count: stats.byPriority.critical || 0, color: 'bg-rose-500', text: 'text-rose-400' },
                { label: 'High', count: stats.byPriority.high || 0, color: 'bg-amber-500', text: 'text-amber-400' },
                { label: 'Medium', count: stats.byPriority.medium || 0, color: 'bg-blue-500', text: 'text-blue-400' },
                { label: 'Low', count: stats.byPriority.low || 0, color: 'bg-slate-500', text: 'text-slate-400' },
              ].map((p) => {
                const totalActive = (stats.total - (stats.byStatus.closed || 0)) || 1;
                const pct = Math.round((p.count / totalActive) * 100);
                return (
                  <div key={p.label}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className={p.text}>{p.label} Priority</span>
                      <span className="font-mono text-slate-200">
                        {p.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${p.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Help Card on Concurrency & Versioning */}
          <div className="rounded-3xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-800/60 p-5 text-xs text-indigo-200 space-y-2">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>💡 Concurrency Safety Engine Active</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Every work item carries a strictly monotonic <strong>version number</strong>. When two users submit changes simultaneously, the server rejects stale edits with <code>409 Conflict</code> and prompts the user with the latest state.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
