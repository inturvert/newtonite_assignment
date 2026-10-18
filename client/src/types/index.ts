export type WorkItemStatus = 'open' | 'in_progress' | 'under_review' | 'resolved' | 'closed';
export type WorkItemPriority = 'low' | 'medium' | 'high' | 'critical';
export type WorkItemType = 'bug' | 'incident' | 'task' | 'compliance' | 'payment' | 'request';
export type TeamRole = 'admin' | 'manager' | 'member';

export interface User {
  id: string;
  email: string;
  name: string;
  teams?: {
    teamId: string;
    teamName: string;
    role: TeamRole;
  }[];
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  myRole?: TeamRole;
  memberCount?: number;
  workItemCount?: number;
}

export interface ActivityLog {
  id: string;
  workItemId: string;
  actorId: string;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
  comment?: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
  };
}

export interface WorkItem {
  id: string;
  title: string;
  description?: string | null;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  type: WorkItemType;
  teamId: string;
  creatorId: string;
  assigneeId?: string | null;
  version: number;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
  team: {
    id: string;
    name: string;
  };
  activities?: ActivityLog[];
  _count?: {
    activities: number;
  };
}

export interface DashboardStats {
  total: number;
  byStatus: Record<WorkItemStatus, number>;
  byPriority: Record<WorkItemPriority, number>;
  myAssignedCount: number;
  overdueCount: number;
  attentionCount: number;
}
