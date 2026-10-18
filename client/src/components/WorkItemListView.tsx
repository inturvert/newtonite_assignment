import React from 'react';
import {
  Search,
  Filter,
  User,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import type { WorkItem, Team } from '../types';

interface WorkItemListViewProps {
  items: WorkItem[];
  teams: Team[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onPageChange: (newPage: number) => void;
  onSelectItem: (item: WorkItem) => void;
  filters: {
    search: string;
    teamId: string;
    status: string;
    priority: string;
    type: string;
    unassigned: boolean;
  };
  onFilterChange: (key: string, value: any) => void;
  onResetFilters: () => void;
}

export const WorkItemListView: React.FC<WorkItemListViewProps> = ({
  items,
  teams,
  pagination,
  onPageChange,
  onSelectItem,
  filters,
  onFilterChange,
  onResetFilters,
}) => {
  return (
    <div className="nt-work-list space-y-6 animate-fadeIn">
      {/* Search & Filter Toolbar */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              placeholder="Search work items by title, description, or keyword..."
              className="w-full min-h-[42px] rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 text-xs font-medium text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Reset Filters */}
          <button
            onClick={onResetFilters}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shrink-0"
            title="Reset Filters"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Filter Chips Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-800 text-xs">
          {/* Team Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Team
            </label>
            <select
              value={filters.teamId}
              onChange={(e) => onFilterChange('teamId', e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All My Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Severity / Priority
            </label>
            <select
              value={filters.priority}
              onChange={(e) => onFilterChange('priority', e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => onFilterChange('type', e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="bug">Bug</option>
              <option value="incident">Incident</option>
              <option value="task">Task</option>
              <option value="compliance">Compliance</option>
              <option value="payment">Payment</option>
              <option value="request">Request</option>
            </select>
          </div>

          {/* Unassigned Only Toggle */}
          <div className="flex items-end pb-0.5 col-span-2 sm:col-span-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
              <input
                type="checkbox"
                checked={filters.unassigned}
                onChange={(e) => onFilterChange('unassigned', e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
              />
              <span>Unassigned Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Items List Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <Filter className="h-8 w-8 mx-auto mb-2 text-slate-600" />
            <p className="font-semibold text-slate-300">No work items match your search or filters.</p>
            <p className="text-xs text-slate-500 mt-1">Try relaxing filters or search terms.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {items.map((item) => {
              const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="p-4 sm:p-5 hover:bg-slate-800/50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Badge Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Priority */}
                      <span
                        className={`text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded ${
                          item.priority === 'critical'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                            : item.priority === 'high'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                            : item.priority === 'medium'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {item.priority}
                      </span>

                      {/* Status */}
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          item.status === 'open'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            : item.status === 'in_progress'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                            : item.status === 'under_review'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                            : item.status === 'resolved'
                            ? 'bg-teal-950 text-teal-300 border border-teal-800/60'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {item.status.replace('_', ' ')}
                      </span>

                      {/* Type */}
                      <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {item.type}
                      </span>

                      {/* Team */}
                      <span className="text-[11px] font-semibold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                        {item.team.name}
                      </span>

                      {/* Version Pill */}
                      <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                        v{item.version}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {item.title}
                    </h3>

                    {/* Preview Description */}
                    {item.description && (
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {item.description}
                      </p>
                    )}

                    {/* Meta Row: Creator, Assignee, SLA, Comments */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                      <span>Created by {item.creator.name}</span>
                      <span>•</span>
                      {item.assignee ? (
                        <span className="text-slate-300 flex items-center gap-1">
                          <User className="h-3 w-3 text-indigo-400" />
                          <span>{item.assignee.name}</span>
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold">Unassigned</span>
                      )}

                      {isOverdue && (
                        <>
                          <span>•</span>
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Overdue</span>
                          </span>
                        </>
                      )}

                      {item._count && item._count.activities > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <MessageSquare className="h-3 w-3" />
                            <span>{item._count.activities}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right self-end sm:self-center">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing Page <span className="font-bold text-white">{pagination.page}</span> of{' '}
            <span className="font-bold text-white">{pagination.totalPages || 1}</span> ({pagination.total} total items)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
