import React, { useState } from 'react';
import {
  Layers,
  LayoutDashboard,
  ListTodo,
  AlertOctagon,
  UserCheck,
  Plus,
  BookOpen,
  Users,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext';

export type ActiveTab = 'dashboard' | 'all' | 'attention' | 'my-work';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenCreateModal: () => void;
  onOpenArchitectureModal: () => void;
  attentionCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenCreateModal,
  onOpenArchitectureModal,
  attentionCount = 0,
}) => {
  const { user, quickSwitch, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
      {/* Top Banner: Evaluator Tools */}
      <div className="bg-slate-950 px-4 py-1.5 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-[11px] font-semibold text-slate-300">
            ENGINEERING ASSESSMENT BUILD
          </span>
          <span className="hidden sm:inline text-slate-500">•</span>
          <span className="hidden sm:inline text-slate-400">
            Optimistic Locking (v) • Atomic Claims • Idempotency • Resource RBAC
          </span>
        </div>

        {/* Persona Switcher for Quick Role Testing */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 hidden md:inline">Switch Persona:</span>
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
            >
              <Users className="h-3 w-3 text-emerald-400" />
              <span className="font-semibold text-emerald-300">{user?.name || 'Select User'}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-1 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1 z-50 animate-fadeIn">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                  Select User to Test Role Authorization:
                </div>
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => {
                      quickSwitch(acc.email);
                      setUserDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex flex-col ${
                      user?.email === acc.email
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="font-bold flex items-center justify-between">
                      <span>{acc.name}</span>
                      <span className="text-[10px] font-mono font-normal text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {acc.role}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-500">{acc.team}</span>
                  </button>
                ))}

                <div className="border-t border-slate-800 mt-1 pt-1">
                  <button
                    onClick={() => {
                      logout();
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/30 flex items-center gap-1.5"
                  >
                    <LogOut className="h-3 w-3" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-700 shadow-md shadow-indigo-500/20">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>NEWTONITE</span>
              <span className="rounded bg-indigo-950 border border-indigo-700/60 px-1.5 py-0.5 text-[10px] font-mono font-bold text-indigo-300">
                v1.0
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              Operations Under Pressure Coordination
            </div>
          </div>
        </div>

        {/* Center Tabs */}
        <nav className="hidden lg:flex items-center gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'dashboard'
                ? 'bg-slate-800 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5 text-indigo-400" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => onTabChange('all')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListTodo className="h-3.5 w-3.5 text-blue-400" />
            <span>All Work Items</span>
          </button>

          <button
            onClick={() => onTabChange('attention')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all relative ${
              activeTab === 'attention'
                ? 'bg-rose-950/70 text-rose-200 border border-rose-800/60 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />
            <span>Needs Attention</span>
            {attentionCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white font-mono">
                {attentionCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('my-work')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'my-work'
                ? 'bg-slate-800 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>My Work</span>
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenArchitectureModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5 text-amber-400" />
            <span>Architecture & Decisions</span>
          </button>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all transform active:scale-98"
          >
            <Plus className="h-4 w-4" />
            <span>Create Item</span>
          </button>
        </div>
      </div>
    </header>
  );
};
