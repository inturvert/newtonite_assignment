import React, { useState } from 'react';
import {
  X,
  UserCheck,
  Clock,
  ArrowRight,
  Send,
  MessageSquare,
  RefreshCw,
  AlertOctagon,
  Calendar,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import type { WorkItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

interface WorkItemDetailModalProps {
  item: WorkItem | null;
  isOpen: boolean;
  onClose: () => void;
  onItemUpdated: (updatedItem: WorkItem) => void;
}

export const WorkItemDetailModal: React.FC<WorkItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onItemUpdated,
}) => {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState<{ message: string; currentData?: WorkItem } | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Edit fields
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<string>('medium');

  if (!isOpen || !item) return null;

  // Determine current user's role in this team
  const userRole = user?.teams?.find((t) => t.teamId === item.teamId)?.role || 'member';
  const isManagerOrAdmin = ['manager', 'admin'].includes(userRole);

  const startEdit = () => {
    setEditTitle(item.title);
    setEditDesc(item.description || '');
    setEditPriority(item.priority);
    setIsEditing(true);
    setConflictError(null);
  };

  // 1. Submit Edit with Optimistic Locking
  const handleSaveEdit = async () => {
    setIsSubmitting(true);
    setConflictError(null);
    try {
      const res = await api.patch(`/work-items/${item.id}`, {
        version: item.version, // Send current version
        title: editTitle,
        description: editDesc,
        priority: editPriority,
      });
      onItemUpdated(res.data.item);
      setIsEditing(false);
      setActionSuccess('Changes saved successfully with optimistic version update!');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setConflictError({
          message: err.response.data.message,
          currentData: err.response.data.currentData,
        });
      } else {
        alert(err.response?.data?.message || 'Failed to update work item.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Atomic Self Claim
  const handleClaim = async () => {
    setIsSubmitting(true);
    setConflictError(null);
    try {
      const res = await api.post(`/work-items/${item.id}/claim`, {
        version: item.version,
      });
      onItemUpdated(res.data.item);
      setActionSuccess('Successfully claimed ownership of this work item!');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setConflictError({
          message: err.response.data.message,
          currentData: err.response.data.currentData,
        });
      } else {
        alert(err.response?.data?.message || 'Failed to claim item.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Workflow State Transition
  const handleTransition = async (toStatus: string) => {
    setIsSubmitting(true);
    setConflictError(null);
    try {
      const res = await api.post(`/work-items/${item.id}/transition`, {
        version: item.version,
        toStatus,
        comment: `Transitioned to ${toStatus.replace('_', ' ')} by ${user?.name}.`,
      });
      onItemUpdated(res.data.item);
      setActionSuccess(`Status transitioned to ${toStatus.replace('_', ' ')}!`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setConflictError({
          message: err.response.data.message,
          currentData: err.response.data.currentData,
        });
      } else {
        alert(err.response?.data?.message || 'Transition rejected by workflow rules.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.post(`/work-items/${item.id}/comments`, {
        comment: commentText.trim(),
      });
      // Append activity to item
      const updatedItem: WorkItem = {
        ...item,
        activities: [res.data.activity, ...(item.activities || [])],
      };
      onItemUpdated(updatedItem);
      setCommentText('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to post comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reload item if conflict
  const reloadLatest = async () => {
    try {
      const res = await api.get(`/work-items/${item.id}`);
      onItemUpdated(res.data.item);
      setConflictError(null);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Allowed transitions mapping
  const nextActionsMap: Record<string, { label: string; toStatus: string; color: string }[]> = {
    open: [
      { label: 'Start Investigation (In Progress)', toStatus: 'in_progress', color: 'bg-blue-600 hover:bg-blue-500' },
      { label: 'Direct Close', toStatus: 'closed', color: 'bg-slate-700 hover:bg-slate-600' },
    ],
    in_progress: [
      { label: 'Submit for Review', toStatus: 'under_review', color: 'bg-amber-600 hover:bg-amber-500' },
      { label: 'Mark as Resolved', toStatus: 'resolved', color: 'bg-emerald-600 hover:bg-emerald-500' },
      { label: 'Move Back to Open', toStatus: 'open', color: 'bg-slate-700 hover:bg-slate-600' },
    ],
    under_review: [
      { label: 'Approve & Resolve', toStatus: 'resolved', color: 'bg-emerald-600 hover:bg-emerald-500' },
      { label: 'Request Revision (In Progress)', toStatus: 'in_progress', color: 'bg-blue-600 hover:bg-blue-500' },
    ],
    resolved: [
      { label: 'Confirm & Close', toStatus: 'closed', color: 'bg-slate-700 hover:bg-slate-600' },
      { label: 'Reopen (In Progress)', toStatus: 'in_progress', color: 'bg-rose-700 hover:bg-rose-600' },
    ],
    closed: isManagerOrAdmin
      ? [{ label: 'Reopen Item (Manager Only)', toStatus: 'open', color: 'bg-amber-700 hover:bg-amber-600' }]
      : [],
  };

  const nextActions = nextActionsMap[item.status] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-800">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <span
              className={`text-[10px] uppercase font-bold font-mono px-2.5 py-1 rounded ${
                item.priority === 'critical'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800/80'
                  : item.priority === 'high'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800/80'
                  : 'bg-blue-950 text-blue-300 border border-blue-800/80'
              }`}
            >
              {item.priority}
            </span>

            <span className="text-xs font-semibold text-slate-300 bg-slate-800 px-2.5 py-1 rounded">
              {item.team.name}
            </span>

            {/* Version Badge (Core Concurrency Signal) */}
            <div className="flex items-center gap-1 rounded bg-indigo-950 border border-indigo-700/60 px-2 py-0.5 text-xs font-mono font-bold text-indigo-300">
              <Lock className="h-3 w-3" />
              <span>Version {item.version}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Conflict Alert Banner (If Concurrency Collision Occurred) */}
        {conflictError && (
          <div className="bg-rose-950/90 border-b border-rose-800 px-6 py-3 text-xs text-rose-200 flex items-center justify-between gap-4 animate-shake">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-rose-400 shrink-0" />
              <div>
                <strong>Concurrency Conflict Detected:</strong> {conflictError.message}
              </div>
            </div>
            <button
              onClick={reloadLatest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold shrink-0 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Load Latest State</span>
            </button>
          </div>
        )}

        {/* Action Success Toast */}
        {actionSuccess && (
          <div className="bg-emerald-950/90 border-b border-emerald-800 px-6 py-2.5 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Main Body (Split into Left details + Right activity timeline) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* Left Column: Work Item Details & Actions (7 cols) */}
          <div className="lg:col-span-7 p-6 space-y-6">
            {!isEditing ? (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-extrabold text-white leading-snug">
                    {item.title}
                  </h2>
                  <button
                    onClick={startEdit}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline shrink-0"
                  >
                    Edit
                  </button>
                </div>

                <p className="mt-3 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {item.description || <em className="text-slate-500">No description provided.</em>}
                </p>
              </div>
            ) : (
              <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase">
                  Editing with Optimistic Lock (Expecting v{item.version})
                </div>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  placeholder="Title"
                />
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  placeholder="Detailed description..."
                />
                <div className="flex items-center gap-3">
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    {isManagerOrAdmin && <option value="critical">Critical Priority (Manager/Admin)</option>}
                  </select>

                  <button
                    onClick={handleSaveEdit}
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Updates'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Ownership & Assignment Section */}
            <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Responsibility & Ownership</span>
                <span className="font-mono text-[10px] text-slate-500">Atomic Lock</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                    {item.assignee ? item.assignee.name.charAt(0) : '?'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      {item.assignee ? item.assignee.name : 'Currently Unassigned'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {item.assignee ? item.assignee.email : 'Anyone in team can claim'}
                    </div>
                  </div>
                </div>

                {!item.assignee && (
                  <button
                    onClick={handleClaim}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all transform active:scale-98"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Claim Item</span>
                  </button>
                )}
              </div>
            </div>

            {/* State Machine Transition Actions */}
            <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Workflow State Machine</span>
                <span className="text-[11px] font-bold text-indigo-400 uppercase">
                  Current: {item.status.replace('_', ' ')}
                </span>
              </div>

              {nextActions.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {nextActions.map((act) => (
                    <button
                      key={act.toStatus}
                      onClick={() => handleTransition(act.toStatus)}
                      disabled={isSubmitting}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all transform active:scale-98 ${act.color}`}
                    >
                      <span>{act.label}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">
                  This work item is in a terminal or restricted state.
                </div>
              )}
            </div>

            {/* Metadata Footer */}
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <span>Created {new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span>Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No SLA date'}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Immutable Audit Trail & Comments (5 cols) */}
          <div className="lg:col-span-5 p-6 flex flex-col justify-between bg-slate-950/50">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-indigo-400" />
                  <span>Immutable Audit Trail</span>
                </h3>
                <span className="font-mono text-[10px] text-slate-500">Append-Only</span>
              </div>

              {/* Activity Timeline List */}
              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                {(item.activities || []).map((act) => (
                  <div key={act.id} className="text-xs space-y-1 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-200">{act.actor.name}</span>
                      <span className="text-slate-500 font-mono">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-[11px] text-indigo-300">
                      {act.action === 'created' && '🌱 Created this work item'}
                      {act.action === 'status_changed' && `Changed status to '${act.newValue}'`}
                      {act.action === 'assigned' && `Assigned to ${act.newValue}`}
                      {act.action === 'unassigned' && 'Unassigned the item'}
                      {act.action === 'priority_changed' && `Updated priority from ${act.oldValue} to ${act.newValue}`}
                      {act.action === 'edited' && 'Edited item details'}
                      {act.action === 'commented' && '💬 Added a note'}
                    </div>

                    {act.comment && (
                      <p className="text-slate-300 bg-slate-950 p-2 rounded-lg text-xs mt-1 border border-slate-800/60 whitespace-pre-wrap">
                        {act.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add Comment Input Form */}
            <form onSubmit={handleAddComment} className="mt-4 pt-3 border-t border-slate-800">
              <div className="relative">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment or status note..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none pr-10"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !commentText.trim()}
                  className="absolute right-2.5 bottom-3 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
