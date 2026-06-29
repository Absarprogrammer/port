import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getRoleHome } from '../components/RoleRoute';
import {
  Ticket,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  PlusCircle,
  ArrowRight
} from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { useTicketContext } from '../context/TicketContext';
import { useAuthContext } from '../context/AuthContext';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { stats, tickets, fetchStats, fetchTickets, isLoading } = useTicketContext();
  const { user } = useAuthContext();

  // Auto-redirect non-Employee roles to their dedicated dashboards
  if (user && user.role !== 'Employee') {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  useEffect(() => {
    fetchStats();
    fetchTickets();
  }, []);

  const statCards = [
    {
      label: 'Total Tickets',
      value: stats?.total || 0,
      icon: Ticket,
      color: 'blue',
      bg: 'bg-blue-500',
      light: 'bg-blue-50',
      text: 'text-blue-600'
    },
    {
      label: 'Open',
      value: stats?.open || 0,
      icon: Clock,
      color: 'amber',
      bg: 'bg-amber-500',
      light: 'bg-amber-50',
      text: 'text-amber-600'
    },
    {
      label: 'Assigned',
      value: stats?.assigned || 0,
      icon: Clock,
      color: 'purple',
      bg: 'bg-purple-500',
      light: 'bg-purple-50',
      text: 'text-purple-600'
    },
    {
      label: 'In Progress',
      value: stats?.inProgress || 0,
      icon: TrendingUp,
      color: 'sky',
      bg: 'bg-sky-500',
      light: 'bg-sky-50',
      text: 'text-sky-600'
    },
    {
      label: 'Resolved',
      value: stats?.resolved || 0,
      icon: CheckCircle,
      color: 'emerald',
      bg: 'bg-emerald-500',
      light: 'bg-emerald-50',
      text: 'text-emerald-600'
    },
    {
      label: 'Critical Priority',
      value: stats?.critical || 0,
      icon: AlertTriangle,
      color: 'red',
      bg: 'bg-red-500',
      light: 'bg-red-50',
      text: 'text-red-600'
    }
  ];

  const recentTickets = tickets.slice(0, 5);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'Low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-100 text-blue-700';
      case 'In Progress':
        return 'bg-sky-100 text-sky-700';
      case 'Resolved':
        return 'bg-emerald-100 text-emerald-700';
      case 'Closed':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

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
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500">
              Welcome back, {user?.name}! Here's your ticket overview.
            </p>
          </div>
          {user?.role !== 'Support Agent' && (
            <Link
              to="/tickets/new"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <PlusCircle className="w-5 h-5" />
              New Ticket
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.light}`}>
                  <stat.icon className={`w-6 h-6 ${stat.text}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Recent Tickets</h2>
              <Link
                to="/tickets"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="divide-y divide-slate-200">
              {isLoading ? (
                <div className="p-8 text-center text-slate-500">Loading tickets...</div>
              ) : recentTickets.length === 0 ? (
                <div className="p-8 text-center">
                  <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No tickets yet</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Create your first ticket to get started
                  </p>
                </div>
              ) : (
                recentTickets.map((ticket) => (
                  <Link
                    key={ticket._id}
                    to={`/tickets/${ticket._id}`}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{ticket.title}</p>
                      <p className="text-sm text-slate-500 mt-1">
                        #{ticket._id.slice(-6).toUpperCase()} · Created {formatDate(ticket.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                          ticket.priority
                        )}`}
                      >
                        {ticket.priority}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          ticket.status
                        )}`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Tickets by Status</h2>
            <div className="h-64 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Open', value: stats?.open || 0 },
                      { name: 'Assigned', value: stats?.assigned || 0 },
                      { name: 'In Progress', value: stats?.inProgress || 0 },
                      { name: 'Resolved', value: stats?.resolved || 0 },
                      { name: 'Closed', value: stats?.closed || 0 }
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {
                      [
                        { name: 'Open', value: stats?.open || 0 },
                        { name: 'Assigned', value: stats?.assigned || 0 },
                        { name: 'In Progress', value: stats?.inProgress || 0 },
                        { name: 'Resolved', value: stats?.resolved || 0 },
                        { name: 'Closed', value: stats?.closed || 0 }
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#3B82F6', '#8B5CF6', '#0EA5E9', '#10B981', '#64748B'][index % 5]} />
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
    </MainLayout>
  );
}
