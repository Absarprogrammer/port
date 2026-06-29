import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Ticket,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Search,
  Filter,
  X,
  UserCog,
  Shield,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import MainLayout from '../layouts/MainLayout';
import { useAuthContext } from '../context/AuthContext';
import adminService, { AdminStats, User } from '../services/adminService';
import { Ticket as TicketType, TicketStatus, TicketPriority } from '../services/ticketService';

export default function ManagerDashboard() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'users'>('overview');
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [ticketFilters, setTicketFilters] = useState<{
    status: string;
    priority: string;
    search: string;
  }>({ status: '', priority: '', search: '' });
  const [userFilters, setUserFilters] = useState<{
    role: string;
    search: string;
  }>({ role: '', search: '' });
  const [showTicketFilters, setShowTicketFilters] = useState(false);
  const [showUserFilters, setShowUserFilters] = useState(false);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // RoleRoute in App.tsx handles access control — no manual redirect needed here

  // Fetch initial data
  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch tickets when tab or filters change
  useEffect(() => {
    if (activeTab === 'tickets') {
      fetchTickets();
    }
  }, [activeTab, ticketFilters]);

  // Fetch users when tab or filters change
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, userFilters]);

  const fetchStats = async () => {
    try {
      const response = await adminService.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const filters: any = {};
      if (ticketFilters.status) filters.status = ticketFilters.status;
      if (ticketFilters.priority) filters.priority = ticketFilters.priority;
      if (ticketFilters.search) filters.search = ticketFilters.search;
      const response = await adminService.getTickets(filters);
      setTickets(response.data);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const filters: any = {};
      if (userFilters.role) filters.role = userFilters.role;
      if (userFilters.search) filters.search = userFilters.search;
      const response = await adminService.getUsers(filters);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (ticketId: string, status: TicketStatus) => {
    setUpdatingTicketId(ticketId);
    try {
      await adminService.updateTicketStatus(ticketId, status);
      setTickets(tickets.map(t =>
        t._id === ticketId ? { ...t, status } : t
      ));
      fetchStats();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdatingTicketId(null);
    }
  };

  const handleRoleChange = async (userId: string, role: 'Admin' | 'Employee' | 'Support Agent' | 'Manager') => {
    setUpdatingUserId(userId);
    try {
      await adminService.updateUserRole(userId, role);
      setUsers(users.map(u =>
        u._id === userId ? { ...u, role } : u
      ));
      fetchStats();
    } catch (error) {
      console.error('Failed to update role:', error);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-700';
      case 'In Progress': return 'bg-sky-100 text-sky-700';
      case 'Resolved': return 'bg-emerald-100 text-emerald-700';
      case 'Closed': return 'bg-slate-100 text-slate-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-purple-100 text-purple-700';
      case 'Manager': return 'bg-emerald-100 text-emerald-700';
      case 'Support Agent': return 'bg-sky-100 text-sky-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const statCards = [
    { label: 'Dept Users', value: stats?.users.total || 0, icon: Users, color: 'blue' },
    { label: 'Dept Tickets', value: stats?.tickets.total || 0, icon: Ticket, color: 'emerald' },
    { label: 'Open Tickets', value: stats?.tickets.open || 0, icon: Clock, color: 'amber' },
    { label: 'Resolved Tickets', value: stats?.tickets.resolved || 0, icon: CheckCircle, color: 'green' },
  ];

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Manager Dashboard</h1>
              <p className="text-slate-500">Department Overview and Ticket Management</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'tickets', label: 'Manage Tickets' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2.5 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                      <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl bg-${stat.color}-50`}>
                      <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Agent Workload (Active Tickets)</h2>
                <div className="h-64">
                  {(!stats?.agentWorkload || stats.agentWorkload.length === 0) ? (
                    <div className="flex items-center justify-center h-full text-slate-500 text-sm">No active assignments</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.agentWorkload}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Tickets by Priority</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Low', value: stats?.tickets.byPriority?.Low || 0 },
                          { name: 'Medium', value: stats?.tickets.byPriority?.Medium || 0 },
                          { name: 'High', value: stats?.tickets.byPriority?.High || 0 },
                          { name: 'Critical', value: stats?.tickets.byPriority?.Critical || 0 },
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {
                          [
                            { name: 'Low', value: stats?.tickets.byPriority?.Low || 0 },
                            { name: 'Medium', value: stats?.tickets.byPriority?.Medium || 0 },
                            { name: 'High', value: stats?.tickets.byPriority?.High || 0 },
                            { name: 'Critical', value: stats?.tickets.byPriority?.Critical || 0 },
                          ].filter(d => d.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#10B981', '#F59E0B', '#EF4444', '#7F1D1D'][index % 4]} />
                          ))
                        }
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manage Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    value={ticketFilters.search}
                    onChange={(e) => setTicketFilters({ ...ticketFilters, search: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowTicketFilters(!showTicketFilters)}
                  className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${
                    showTicketFilters || (ticketFilters.status || ticketFilters.priority)
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
                {(ticketFilters.status || ticketFilters.priority || ticketFilters.search) && (
                  <button
                    onClick={() => setTicketFilters({ status: '', priority: '', search: '' })}
                    className="flex items-center gap-1 px-3 py-2.5 text-slate-500 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </button>
                )}
              </div>

              {showTicketFilters && (
                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-200">
                  <select
                    value={ticketFilters.status}
                    onChange={(e) => setTicketFilters({ ...ticketFilters, status: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>

                  <select
                    value={ticketFilters.priority}
                    onChange={(e) => setTicketFilters({ ...ticketFilters, priority: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">All Priorities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No tickets found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ticket</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Created By</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Priority</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assigned To</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {tickets.map((ticket) => (
                        <tr key={ticket._id} className="hover:bg-slate-50">
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-medium text-slate-900">{ticket.title}</p>
                              <p className="text-xs text-slate-400">#{ticket._id.slice(-6).toUpperCase()}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            {ticket.createdBy.name}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="relative inline-block">
                              <select
                                value={ticket.status}
                                onChange={(e) => handleStatusChange(ticket._id, e.target.value as TicketStatus)}
                                disabled={updatingTicketId === ticket._id}
                                className={`appearance-none px-2.5 py-1 rounded-full text-xs font-medium pr-6 ${getStatusColor(ticket.status)} disabled:opacity-50`}
                              >
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Closed">Closed</option>
                              </select>
                              <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            {ticket.assignedTo?.name || 'Unassigned'}
                          </td>
                          <td className="px-4 py-4">
                            <Link
                              to={`/tickets/${ticket._id}`}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
