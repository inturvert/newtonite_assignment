import React, { useState } from 'react';
import { X, Plus, Calendar, AlertTriangle } from 'lucide-react';
import type { Team, WorkItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

interface CreateWorkItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  onItemCreated: (item: WorkItem) => void;
}

export const CreateWorkItemModal: React.FC<CreateWorkItemModalProps> = ({
  isOpen,
  onClose,
  teams,
  onItemCreated,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState(teams[0]?.id || '');
  const [priority, setPriority] = useState('medium');
  const [type, setType] = useState('task');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Check user role in selected team
  const userRole = user?.teams?.find((t) => t.teamId === teamId)?.role || 'member';
  const isManagerOrAdmin = ['manager', 'admin'].includes(userRole);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!teamId) {
      setError('Please select a team.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.post('/work-items', {
        title: title.trim(),
        description: description.trim() || undefined,
        teamId,
        priority,
        type,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });

      onItemCreated(res.data.item);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create work item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="h-4 w-4 text-indigo-400" />
            <span>Create Operational Work Item</span>
          </h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-950/80 border border-rose-800/80 p-3 text-xs text-rose-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Payment gateway webhook drops on batch #948"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Description / Context
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe what happened, why it exists, and what needs investigation..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Team */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Assign to Team <span className="text-rose-400">*</span>
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="incident">Incident</option>
                <option value="payment">Payment</option>
                <option value="compliance">Compliance</option>
                <option value="request">Request</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Severity / Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                {isManagerOrAdmin && (
                  <option value="critical">Critical (Manager Only)</option>
                )}
              </select>
              {!isManagerOrAdmin && (
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Critical priority requires manager role
                </span>
              )}
            </div>

            {/* SLA Due Date */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                <span>SLA Due Date</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all"
            >
              {isSubmitting ? 'Creating...' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
