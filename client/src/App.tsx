import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import type { ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { WorkItemListView } from './components/WorkItemListView';
import { WorkItemDetailModal } from './components/WorkItemDetailModal';
import { CreateWorkItemModal } from './components/CreateWorkItemModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import type { WorkItem, DashboardStats, Team } from './types';
import { api } from './api/client';

function MainApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Modals
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isArchOpen, setIsArchOpen] = useState(false);

  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [attentionItems, setAttentionItems] = useState<WorkItem[]>([]);
  const [myWorkItems, setMyWorkItems] = useState<WorkItem[]>([]);
  const [allItems, setAllItems] = useState<WorkItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // Pagination & Filters
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const [filters, setFilters] = useState({
    search: '',
    teamId: '',
    status: '',
    priority: '',
    type: '',
    unassigned: false,
  });

  // Fetch Dashboard Stats & Attention items
  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, attentionRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/attention'),
      ]);
      setStats(statsRes.data);
      setAttentionItems(attentionRes.data.items || []);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  }, []);

  // Fetch Teams
  const fetchTeams = useCallback(async () => {
    try {
      const res = await api.get('/teams');
      setTeams(res.data.teams || []);
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  }, []);

  // Fetch Work Items based on active tab & filters
  const fetchWorkItems = useCallback(async () => {
    if (activeTab === 'my-work') {
      try {
        const res = await api.get('/dashboard/my-work');
        setMyWorkItems(res.data.items || []);
      } catch (err) {
        console.error('Error fetching my work:', err);
      }
      return;
    }

    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (filters.search) params.search = filters.search;
      if (filters.teamId) params.teamId = filters.teamId;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.type) params.type = filters.type;
      if (filters.unassigned) params.unassigned = 'true';

      const res = await api.get('/work-items', { params });
      setAllItems(res.data.items || []);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Error fetching work items:', err);
    }
  }, [activeTab, pagination.page, pagination.limit, filters]);

  // Initial & Tab Switch Data Fetching
  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchTeams();
      fetchWorkItems();
    }
  }, [user, activeTab, fetchDashboardData, fetchTeams, fetchWorkItems]);

  const handleSelectItem = (item: WorkItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handleItemUpdated = (updatedItem: WorkItem) => {
    setSelectedItem(updatedItem);
    // Refresh all lists
    fetchDashboardData();
    fetchWorkItems();
  };

  const handleItemCreated = (newItem: WorkItem) => {
    fetchDashboardData();
    fetchWorkItems();
    handleSelectItem(newItem);
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      teamId: '',
      status: '',
      priority: '',
      type: '',
      unassigned: false,
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="animate-pulse text-sm font-mono">Initializing Newtonite Coordination Engine...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCreateModal={() => setIsCreateOpen(true)}
        onOpenArchitectureModal={() => setIsArchOpen(true)}
        attentionCount={stats?.attentionCount || 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            attentionItems={attentionItems}
            onSelectItem={handleSelectItem}
            onFilterByStatus={(st) => {
              handleFilterChange('status', st);
              setActiveTab('all');
            }}
            onFilterByPriority={(pr) => {
              handleFilterChange('priority', pr);
              setActiveTab('all');
            }}
          />
        )}

        {activeTab === 'all' && (
          <WorkItemListView
            items={allItems}
            teams={teams}
            pagination={pagination}
            onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
            onSelectItem={handleSelectItem}
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
          />
        )}

        {activeTab === 'attention' && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Immediate Attention Queue</span>
                <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded-full border border-rose-800">
                  {attentionItems.length} Tasks
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Items marked Critical, overdue SLA tasks, or unassigned high-severity requests requiring immediate team ownership.
              </p>
            </div>

            <WorkItemListView
              items={attentionItems}
              teams={teams}
              pagination={{ total: attentionItems.length, page: 1, limit: 100, totalPages: 1 }}
              onPageChange={() => {}}
              onSelectItem={handleSelectItem}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
            />
          </div>
        )}

        {activeTab === 'my-work' && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>My Assigned Work</span>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                  {myWorkItems.length} Active Items
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Tasks and incidents currently assigned to {user?.name}.
              </p>
            </div>

            <WorkItemListView
              items={myWorkItems}
              teams={teams}
              pagination={{ total: myWorkItems.length, page: 1, limit: 100, totalPages: 1 }}
              onPageChange={() => {}}
              onSelectItem={handleSelectItem}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <WorkItemDetailModal
        item={selectedItem}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onItemUpdated={handleItemUpdated}
      />

      <CreateWorkItemModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        teams={teams}
        onItemCreated={handleItemCreated}
      />

      <ArchitectureModal
        isOpen={isArchOpen}
        onClose={() => setIsArchOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
