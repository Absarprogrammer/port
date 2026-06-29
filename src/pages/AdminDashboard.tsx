import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Ticket,
  Clock,
  CheckCircle,
  TrendingUp,
  Search,
  Filter,
  X,
  Shield,
  ChevronDown,
  Loader2,
  Building2,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import MainLayout from '../layouts/MainLayout';
import { useAuthContext } from '../context/AuthContext';
import adminService, { AdminStats, User } from '../services/adminService';
import departmentService, { Department } from '../services/departmentService';
import { Ticket as TicketType, TicketStatus, TicketPriority } from '../services/ticketService';

export default function AdminDashboard() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'users' | 'departments'>('overview');
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [ticketFilters, setTicketFilters] = useState<{ status: string; priority: string; search: string }>({ status: '', priority: '', search: '' });
  const [userFilters, setUserFilters] = useState<{ role: string; search: string }>({ role: '', search: '' });
  const [showTicketFilters, setShowTicketFilters] = useState(false);
  const [showUserFilters, setShowUserFilters] = useState(false);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // User role+dept change state
  const [editingUser, setEditingUser] = useState<{ id: string; role: string; department: string } | null>(null);

  // Department management state
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptError, setDeptError] = useState('');
  const [deptSuccess, setDeptSuccess] = useState('');
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [deletingDeptId, setDeletingDeptId] = useState<string | null>(null);
  const [togglingDeptId, setTogglingDeptId] = useState<string | null>(null);
  const [savingDept, setSavingDept] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'Admin') navigate('/');
  }, [user, navigate]);

  useEffect(() => { fetchStats(); }, []);

  useEffect(() => {
    if (activeTab === 'tickets') fetchTickets();
  }, [activeTab, ticketFilters]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, userFilters]);

  useEffect(() => {
    if (activeTab === 'departments') fetchDepartments();
  }, [activeTab]);

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

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const response = await departmentService.getDepartments();
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (ticketId: string, status: TicketStatus) => {
    setUpdatingTicketId(ticketId);
    try {
      await adminService.updateTicketStatus(ticketId, status);
      setTickets(tickets.map(t => t._id === ticketId ? { ...t, status } : t));
      fetchStats();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdatingTicketId(null);
    }
  };

  const handleRoleSave = async () => {
    if (!editingUser) return;
    setUpdatingUserId(editingUser.id);
    try {
      const updated = await adminService.updateUserRole(
        editingUser.id,
        editingUser.role as User['role'],
        editingUser.department || null
      );
      setUsers(users.map(u => u._id === editingUser.id ? updated.data : u));
      setEditingUser(null);
      fetchStats();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update user');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const startEditUser = (u: User) => {
    setEditingUser({
      id: u._id,
      role: u.role,
      department: (u.department as any)?._id || ''
    });
  };

  // Department handlers
  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptError('');
    setDeptSuccess('');
    setSavingDept(true);
    try {
      if (editingDept) {
        const res = await departmentService.updateDepartment(editingDept._id, {
          name: deptForm.name,
          description: deptForm.description
        });
        setDepartments(departments.map(d => d._id === editingDept._id ? res.data : d));
        setDeptSuccess('Department updated successfully.');
      } else {
        const res = await departmentService.createDepartment({ name: deptForm.name, description: deptForm.description });
        setDepartments([...departments, res.data]);
        setDeptSuccess('Department created successfully.');
      }
      setDeptForm({ name: '', description: '' });
      setEditingDept(null);
      setShowDeptForm(false);
    } catch (error: any) {
      setDeptError(error.response?.data?.message || 'Failed to save department.');
    } finally {
      setSavingDept(false);
    }
  };

  const handleToggleDeptStatus = async (id: string) => {
    setTogglingDeptId(id);
    try {
      const res = await departmentService.toggleStatus(id);
      setDepartments(departments.map(d => d._id === id ? res.data : d));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to toggle status.');
    } finally {
      setTogglingDeptId(null);
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm('Delete this department? This only works if it has no users or tickets.')) return;
    setDeletingDeptId(id);
    try {
      await departmentService.deleteDepartment(id);
      setDepartments(departments.filter(d => d._id !== id));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete department.');
    } finally {
      setDeletingDeptId(null);
    }
  };

  const startEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({ name: dept.name, description: dept.description || '' });
    setShowDeptForm(true);
    setDeptError('');
    setDeptSuccess('');
  };

  const cancelDeptForm = () => {
    setShowDeptForm(false);
    setEditingDept(null);
    setDeptForm({ name: '', description: '' });
    setDeptError('');
    setDeptSuccess('');
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
    { label: 'Total Users', value: stats?.users.total || 0, icon: Users, color: 'blue' },
    { label: 'Total Tickets', value: stats?.tickets.total || 0, icon: Ticket, color: 'emerald' },
    { label: 'Open Tickets', value: stats?.tickets.open || 0, icon: Clock, color: 'amber' },
    { label: 'Resolved', value: stats?.tickets.resolved || 0, icon: CheckCircle, color: 'green' },
  ];

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const roleNeedsDept = (role: string) => role === 'Manager' || role === 'Support Agent';

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
              <p className="text-slate-500">Manage users, tickets, and departments</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200">
          <div className="flex gap-1 flex-wrap">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'tickets', label: 'Manage Tickets' },
              { id: 'users', label: 'Manage Users' },
              { id: 'departments', label: 'Departments' },
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
                <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
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
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Ticket Status Overview</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Open', value: stats?.tickets.open || 0 },
                          { name: 'In Progress', value: stats?.tickets.inProgress || 0 },
                          { name: 'Resolved', value: stats?.tickets.resolved || 0 },
                          { name: 'Closed', value: stats?.tickets.closed || 0 },
                        ].filter(d => d.value > 0)}
                        cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                      >
                        {[
                          { name: 'Open', value: stats?.tickets.open || 0 },
                          { name: 'In Progress', value: stats?.tickets.inProgress || 0 },
                          { name: 'Resolved', value: stats?.tickets.resolved || 0 },
                          { name: 'Closed', value: stats?.tickets.closed || 0 },
                        ].filter(d => d.value > 0).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#3B82F6', '#0EA5E9', '#10B981', '#64748B'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
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
                        cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                      >
                        {[
                          { name: 'Low', value: stats?.tickets.byPriority?.Low || 0 },
                          { name: 'Medium', value: stats?.tickets.byPriority?.Medium || 0 },
                          { name: 'High', value: stats?.tickets.byPriority?.High || 0 },
                          { name: 'Critical', value: stats?.tickets.byPriority?.Critical || 0 },
                        ].filter(d => d.value > 0).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#10B981', '#F59E0B', '#EF4444', '#7F1D1D'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">User Roles Distribution</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Admins', value: stats?.users.admins || 0 },
                          { name: 'Managers', value: stats?.users.managers || 0 },
                          { name: 'Support Agents', value: stats?.users.supportAgents || 0 },
                          { name: 'Employees', value: stats?.users.employees || 0 },
                        ].filter(d => d.value > 0)}
                        cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                      >
                        {[
                          { name: 'Admins', value: stats?.users.admins || 0 },
                          { name: 'Managers', value: stats?.users.managers || 0 },
                          { name: 'Support Agents', value: stats?.users.supportAgents || 0 },
                          { name: 'Employees', value: stats?.users.employees || 0 },
                        ].filter(d => d.value > 0).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#9333EA', '#10B981', '#0EA5E9', '#3B82F6'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Monthly Tickets (Last 6 Months)</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.monthlyTickets || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="_id" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#3B82F6" fillOpacity={1} fill="url(#colorTickets)" />
                    </AreaChart>
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
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">All Priorities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>
              ) : tickets.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No tickets found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ticket</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Created By</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Department</th>
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
                            <p className="font-medium text-slate-900">{ticket.title}</p>
                            <p className="text-xs text-slate-400">#{ticket._id.slice(-6).toUpperCase()}</p>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">{ticket.createdBy?.name || 'Unknown User'}</td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            {typeof ticket.department === 'object' && ticket.department !== null ? ticket.department.name : ticket.department || '-'}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
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
                          <td className="px-4 py-4 text-sm text-slate-600">{ticket.assignedTo?.name || 'Unassigned'}</td>
                          <td className="px-4 py-4">
                            <Link to={`/tickets/${ticket._id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">View</Link>
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

        {/* Manage Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userFilters.search}
                    onChange={(e) => setUserFilters({ ...userFilters, search: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowUserFilters(!showUserFilters)}
                  className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${
                    showUserFilters || userFilters.role
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
                {(userFilters.role || userFilters.search) && (
                  <button onClick={() => setUserFilters({ role: '', search: '' })} className="flex items-center gap-1 px-3 py-2.5 text-slate-500 hover:text-slate-700">
                    <X className="w-4 h-4" />Clear
                  </button>
                )}
              </div>
              {showUserFilters && (
                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-200">
                  <select
                    value={userFilters.role}
                    onChange={(e) => setUserFilters({ ...userFilters, role: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">All Roles</option>
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Support Agent">Support Agent</option>
                    <option value="Employee">Employee</option>
                  </select>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No users found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Department</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Joined</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {users.map((u) => (
                        <tr key={u._id} className="hover:bg-slate-50">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-slate-600">{u.name.charAt(0).toUpperCase()}</span>
                              </div>
                              <span className="font-medium text-slate-900">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">{u.email}</td>
                          <td className="px-4 py-4">
                            {editingUser?.id === u._id ? (
                              <select
                                value={editingUser.role}
                                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value, department: roleNeedsDept(e.target.value) ? editingUser.department : '' })}
                                className="px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              >
                                <option value="Admin">Admin</option>
                                <option value="Manager">Manager</option>
                                <option value="Support Agent">Support Agent</option>
                                <option value="Employee">Employee</option>
                              </select>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRoleColor(u.role)}`}>{u.role}</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            {editingUser?.id === u._id && roleNeedsDept(editingUser.role) ? (
                              <select
                                value={editingUser.department}
                                onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                                className="px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              >
                                <option value="">Select dept...</option>
                                {departments.filter(d => d.isActive).map(d => (
                                  <option key={d._id} value={d._id}>{d.name}</option>
                                ))}
                              </select>
                            ) : (
                              (u.department as any)?.name || <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-500">{formatDate(u.createdAt)}</td>
                          <td className="px-4 py-4">
                            {u._id === user?.id ? (
                              <span className="text-slate-400 text-sm">You</span>
                            ) : editingUser?.id === u._id ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={handleRoleSave}
                                  disabled={updatingUserId === u._id}
                                  className="px-2.5 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {updatingUserId === u._id ? '...' : 'Save'}
                                </button>
                                <button
                                  onClick={() => setEditingUser(null)}
                                  className="px-2.5 py-1 border border-slate-300 text-slate-600 text-xs rounded hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { fetchDepartments(); startEditUser(u); }}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                              >
                                <Edit2 className="w-3 h-3" /> Edit
                              </button>
                            )}
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

        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Department Management</h2>
              {!showDeptForm && (
                <button
                  onClick={() => { setShowDeptForm(true); setEditingDept(null); setDeptForm({ name: '', description: '' }); setDeptError(''); setDeptSuccess(''); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" /> New Department
                </button>
              )}
            </div>

            {showDeptForm && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-4">
                  {editingDept ? `Edit: ${editingDept.name}` : 'Create New Department'}
                </h3>
                {deptError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{deptError}
                  </div>
                )}
                {deptSuccess && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">{deptSuccess}</div>
                )}
                <form onSubmit={handleDeptSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="dept-name" className="block text-sm font-medium text-slate-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="dept-name"
                      type="text"
                      value={deptForm.name}
                      onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                      required
                      maxLength={100}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="e.g. Hardware Support"
                    />
                  </div>
                  <div>
                    <label htmlFor="dept-desc" className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      id="dept-desc"
                      value={deptForm.description}
                      onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                      maxLength={500}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                      placeholder="Optional description..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={savingDept}
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingDept ? 'Saving...' : (editingDept ? 'Save Changes' : 'Create Department')}
                    </button>
                    <button type="button" onClick={cancelDeptForm} className="px-5 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>
              ) : departments.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No departments found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Managers</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {departments.map((dept) => (
                        <tr key={dept._id} className="hover:bg-slate-50">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-slate-400" />
                              <span className="font-medium text-slate-900">{dept.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-500 max-w-xs">
                            {dept.description || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            {dept.managerIds && dept.managerIds.length > 0
                              ? dept.managerIds.map(m => m?.name || 'Unknown').join(', ')
                              : <span className="text-slate-400">None</span>
                            }
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${dept.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {dept.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditDept(dept)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleDeptStatus(dept._id)}
                                disabled={togglingDeptId === dept._id}
                                className={`p-1.5 rounded transition-colors ${dept.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-red-500 hover:bg-red-50'} disabled:opacity-50`}
                                title={dept.isActive ? 'Disable department' : 'Enable department'}
                              >
                                {dept.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleDeleteDept(dept._id)}
                                disabled={deletingDeptId === dept._id}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                title="Delete (only if no users or tickets)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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
