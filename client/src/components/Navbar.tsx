import React, { useState } from 'react';
import {
  Layers, LayoutDashboard, ListTodo, AlertOctagon, UserCheck, Plus, BookOpen,
  ChevronDown, LogOut,
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
  activeTab, onTabChange, onOpenCreateModal, onOpenArchitectureModal, attentionCount = 0,
}) => {
  const { user, quickSwitch, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'all', label: 'All work', icon: ListTodo },
    { id: 'attention', label: 'Attention', icon: AlertOctagon },
    { id: 'my-work', label: 'My work', icon: UserCheck },
  ];

  return (
    <header className="nt-appbar sticky top-0 z-30 w-full">
      <div className="nt-appbar-main mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <button className="nt-brand" onClick={() => onTabChange('dashboard')} aria-label="Open Newtonite overview">
          <span className="nt-brand-mark"><Layers className="h-5 w-5" /></span>
          <span className="hidden sm:block text-left"><strong>Newtonite</strong><small>Operations workspace</small></span>
        </button>

        <nav className="nt-nav hidden lg:flex" aria-label="Primary navigation">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => onTabChange(id)} className={`nt-nav-item ${activeTab === id ? 'is-active' : ''}`}>
              <Icon className="h-4 w-4" /><span>{label}</span>
              {id === 'attention' && attentionCount > 0 && <b>{attentionCount}</b>}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={onOpenArchitectureModal} className="nt-icon-button hidden sm:grid" title="Architecture and decisions">
            <BookOpen className="h-4 w-4" />
          </button>
          <div className="relative">
            <button onClick={() => setUserDropdownOpen((open) => !open)} className="nt-persona-button">
              <span className="nt-persona-avatar">{user?.name?.slice(0, 1) || 'U'}</span>
              <span className="hidden md:block">{user?.name || 'Choose user'}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {userDropdownOpen && (
              <div className="nt-persona-menu animate-fadeIn">
                <p>Switch demo persona</p>
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    onClick={() => { quickSwitch(account.email); setUserDropdownOpen(false); }}
                    className={`nt-persona-option ${user?.email === account.email ? 'is-selected' : ''}`}
                  >
                    <span className="nt-option-avatar">{account.name.slice(0, 1)}</span>
                    <span><strong>{account.name}</strong><small>{account.role} · {account.team}</small></span>
                  </button>
                ))}
                <div className="nt-menu-divider" />
                <button onClick={() => { logout(); setUserDropdownOpen(false); }} className="nt-signout">
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            )}
          </div>
          <button onClick={onOpenCreateModal} className="nt-create-button">
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">Create item</span>
          </button>
        </div>
      </div>

      <nav className="nt-mobile-nav lg:hidden" aria-label="Primary navigation">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => onTabChange(id)} className={activeTab === id ? 'is-active' : ''}>
            <Icon className="h-4 w-4" /><span>{label}</span>
            {id === 'attention' && attentionCount > 0 && <b>{attentionCount}</b>}
          </button>
        ))}
      </nav>
    </header>
  );
};
