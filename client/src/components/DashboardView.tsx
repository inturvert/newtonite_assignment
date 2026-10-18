import React from 'react';
import {
  AlertTriangle, Clock3, CheckCircle2, Hourglass, ArrowUpRight, Flame, ShieldAlert, ListTodo,
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
  stats, attentionItems, onSelectItem, onFilterByStatus, onFilterByPriority,
}) => {
  if (!stats) {
    return <div className="nt-loading"><Hourglass className="h-5 w-5 animate-spin" /> Loading your workspace…</div>;
  }

  const metrics = [
    { label: 'Open work', value: stats.total, helper: 'Across your teams', icon: ListTodo, tone: 'indigo', onClick: undefined },
    { label: 'Needs attention', value: stats.attentionCount, helper: stats.overdueCount + ' overdue', icon: Flame, tone: 'rose', onClick: () => onFilterByPriority('critical') },
    { label: 'In progress', value: stats.byStatus.in_progress || 0, helper: 'Being worked on', icon: Clock3, tone: 'blue', onClick: () => onFilterByStatus('in_progress') },
    { label: 'In review', value: stats.byStatus.under_review || 0, helper: 'Waiting for sign-off', icon: Hourglass, tone: 'amber', onClick: () => onFilterByStatus('under_review') },
    { label: 'Resolved', value: (stats.byStatus.resolved || 0) + (stats.byStatus.closed || 0), helper: 'Completed items', icon: CheckCircle2, tone: 'green', onClick: () => onFilterByStatus('resolved') },
  ];

  const activeTotal = Math.max(1, stats.total - (stats.byStatus.closed || 0));
  const priorities = [
    { label: 'Critical', count: stats.byPriority.critical || 0, tone: 'critical' },
    { label: 'High', count: stats.byPriority.high || 0, tone: 'high' },
    { label: 'Medium', count: stats.byPriority.medium || 0, tone: 'medium' },
    { label: 'Low', count: stats.byPriority.low || 0, tone: 'low' },
  ];

  return (
    <div className="nt-dashboard animate-fadeIn">
      <section className="nt-metric-grid">
        {metrics.map(({ label, value, helper, icon: Icon, tone, onClick }) => (
          <button key={label} onClick={onClick} className={'nt-metric-card nt-' + tone + (onClick ? ' is-clickable' : '')}>
            <span className="nt-metric-icon"><Icon className="h-4 w-4" /></span>
            <span className="nt-metric-label">{label}</span>
            <strong>{value}</strong>
            <small>{helper}</small>
          </button>
        ))}
      </section>

      <section className="nt-dashboard-grid">
        <div className="nt-panel nt-attention-panel">
          <div className="nt-panel-header">
            <div>
              <span className="nt-panel-kicker"><ShieldAlert className="h-4 w-4" /> Priority queue</span>
              <h2>Attention now</h2>
              <p>Critical, overdue, and unassigned requests across your teams.</p>
            </div>
            <span className="nt-count-badge">{attentionItems.length}</span>
          </div>

          {attentionItems.length === 0 ? (
            <div className="nt-empty-state"><CheckCircle2 className="h-8 w-8" /><strong>All clear</strong><span>No critical or overdue work needs attention.</span></div>
          ) : (
            <div className="nt-attention-list">
              {attentionItems.map((item) => {
                const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();
                return (
                  <button key={item.id} onClick={() => onSelectItem(item)} className="nt-attention-row">
                    <span className={'nt-priority-dot ' + (item.priority === 'critical' ? 'critical' : 'high')} />
                    <span className="nt-row-main">
                      <span className="nt-row-tags"><b>{item.priority}</b><em>{item.team.name}</em><small>v{item.version}</small></span>
                      <strong>{item.title}</strong>
                      <small>{item.assignee ? 'Assigned to ' + item.assignee.name : 'Unassigned'}{isOverdue ? ' · Overdue' : ''}</small>
                    </span>
                    {isOverdue || !item.assignee ? <AlertTriangle className="nt-row-alert h-4 w-4" /> : <ArrowUpRight className="nt-row-arrow h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div className="nt-panel nt-severity-panel">
            <div className="nt-panel-header compact">
              <div><span className="nt-panel-kicker">Workload</span><h2>Severity mix</h2></div>
            </div>
            <div className="nt-severity-list">
              {priorities.map((priority) => {
                const percent = Math.round((priority.count / activeTotal) * 100);
                return (
                  <div key={priority.label} className="nt-severity-row">
                    <div><span className={'nt-severity-name ' + priority.tone}>{priority.label}</span><strong>{priority.count}</strong></div>
                    <span className="nt-progress"><i className={priority.tone} style={{ width: percent + '%' }} /></span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="nt-safety-note">
            <span className="nt-safety-icon">✦</span>
            <div><strong>Changes stay safe</strong><p>Every edit checks the work item version before it is saved, so stale changes are surfaced clearly.</p></div>
          </div>
        </aside>
      </section>
    </div>
  );
};
