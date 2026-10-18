export const WORK_ITEM_STATUSES = [
  'open',
  'in_progress',
  'under_review',
  'resolved',
  'closed',
] as const;

export type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number];

export const WORK_ITEM_PRIORITIES = [
  'low',
  'medium',
  'high',
  'critical',
] as const;

export type WorkItemPriority = (typeof WORK_ITEM_PRIORITIES)[number];

export const WORK_ITEM_TYPES = [
  'bug',
  'incident',
  'task',
  'compliance',
  'payment',
  'request',
] as const;

export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];

export const TEAM_ROLES = ['admin', 'manager', 'member'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const ACTIVITY_ACTIONS = [
  'created',
  'status_changed',
  'assigned',
  'unassigned',
  'priority_changed',
  'commented',
  'edited',
  'due_date_changed',
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

// Workflow state transition graph (State Machine enforcement)
export const ALLOWED_TRANSITIONS: Record<WorkItemStatus, WorkItemStatus[]> = {
  open: ['in_progress', 'closed'],
  in_progress: ['under_review', 'open', 'resolved'],
  under_review: ['resolved', 'in_progress'],
  resolved: ['closed', 'in_progress'],
  closed: ['open'], // Only manager/admin can reopen
};
