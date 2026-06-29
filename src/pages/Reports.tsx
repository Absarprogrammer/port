import { useEffect, useState } from 'react';
import {
  FileText, FileSpreadsheet, FileJson, Filter, X, ChevronDown,
  Loader2, Download, Search, AlertCircle, BarChart2
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import MainLayout from '../layouts/MainLayout';
import { useAuthContext } from '../context/AuthContext';
import reportService, { ReportFilters } from '../services/reportService';
import departmentService, { Department } from '../services/departmentService';
import adminService, { User } from '../services/adminService';
import { Ticket as TicketType } from '../services/ticketService';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

export default function Reports() {
  const { user } = useAuthContext();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]); // To select assignedTo/createdBy if needed, or we just rely on text search
  const [showFilters, setShowFilters] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState<ReportFilters>({
    ticketId: '', department: '', category: '', priority: '', status: '',
    assignedTo: '', createdBy: '', dateFrom: '', dateTo: '',
    resolvedFrom: '', resolvedTo: '', closedFrom: '', closedTo: '',
    sort: 'newest', limit: 20
  });

  const showAnalytics = user?.role === 'Admin' || user?.role === 'Manager';

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page]);

  const fetchDepartments = async () => {
    try {
      const res = await departmentService.getDepartments();
      setDepartments(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ticketRes, dashboardRes] = await Promise.all([
        reportService.getTickets({ ...filters, page }),
        showAnalytics ? reportService.getDashboardStats(filters) : Promise.resolve(null)
      ]);

      setTickets(ticketRes.data.tickets);
      setTotalRecords(ticketRes.data.total);
      setTotalPages(ticketRes.data.pages);

      if (dashboardRes) {
        setStats(dashboardRes.data.stats);
        setCharts(dashboardRes.data.charts);
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilter = () => {
    setPage(1);
    fetchData();
  };

  const handleResetFilter = () => {
    setFilters({
      ticketId: '', department: '', category: '', priority: '', status: '',
      assignedTo: '', createdBy: '', dateFrom: '', dateTo: '',
      resolvedFrom: '', resolvedTo: '', closedFrom: '', closedTo: '',
      sort: 'newest', limit: 20
    });
    setPage(1);
  };

  const handleExport = async (type: 'pdf' | 'excel' | 'csv') => {
    if (totalRecords === 0) return;
    if (totalRecords > 10000) {
      const confirmExport = window.confirm(`You are about to export ${totalRecords} records. This might take a while. Proceed?`);
      if (!confirmExport) return;
    }

    setIsExporting(true);
    try {
      if (type === 'pdf') await reportService.exportPDF(filters);
      if (type === 'excel') await reportService.exportExcel(filters);
      if (type === 'csv') await reportService.exportCSV(filters);
    } catch (error) {
      console.error(`Failed to export ${type}:`, error);
      alert('Failed to generate export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Reports & Exports</h1>
              <p className="text-slate-500">Generate, view, and export ticket reports</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting || totalRecords === 0}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={() => handleExport('excel')}
              disabled={isExporting || totalRecords === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting || totalRecords === 0}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              <FileJson className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Report Filters
            </h2>
            <button onClick={() => setShowFilters(!showFilters)} className="text-blue-600 text-sm font-medium hover:text-blue-700">
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {showFilters && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Ticket ID</label>
                  <input type="text" value={filters.ticketId} onChange={e => setFilters({ ...filters, ticketId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Search ID..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Created By</label>
                  <input type="text" value={filters.createdBy} onChange={e => setFilters({ ...filters, createdBy: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Name or email..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Assigned Agent</label>
                  <input type="text" value={filters.assignedTo} onChange={e => setFilters({ ...filters, assignedTo: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Name or email..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Department</label>
                  <select value={filters.department} onChange={e => setFilters({ ...filters, department: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                  <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">All Categories</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Network">Network</option>
                    <option value="Access">Access</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                  <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Priority</label>
                  <select value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">All Priorities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Sort By</label>
                  <select value={filters.sort} onChange={e => setFilters({ ...filters, sort: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="priority">Priority</option>
                    <option value="status">Status</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Created Date</label>
                  <div className="flex items-center gap-2">
                    <input type="date" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
                    <span className="text-slate-400">to</span>
                    <input type="date" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Resolved Date</label>
                  <div className="flex items-center gap-2">
                    <input type="date" value={filters.resolvedFrom} onChange={e => setFilters({ ...filters, resolvedFrom: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
                    <span className="text-slate-400">to</span>
                    <input type="date" value={filters.resolvedTo} onChange={e => setFilters({ ...filters, resolvedTo: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Closed Date</label>
                  <div className="flex items-center gap-2">
                    <input type="date" value={filters.closedFrom} onChange={e => setFilters({ ...filters, closedFrom: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
                    <span className="text-slate-400">to</span>
                    <input type="date" value={filters.closedTo} onChange={e => setFilters({ ...filters, closedTo: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button onClick={handleApplyFilter} disabled={isLoading} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {isLoading ? 'Applying...' : 'Apply Filters'}
                </button>
                <button onClick={handleResetFilter} className="px-5 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Analytics Section (Role-based) */}
        {showAnalytics && stats && charts && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Open</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.open}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Assigned</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.assigned}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">In Progress</p>
                <p className="text-2xl font-bold text-amber-500 mt-1">{stats.inProgress}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Resolved</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.resolved}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Closed</p>
                <p className="text-2xl font-bold text-slate-600 mt-1">{stats.closed}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Critical</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.critical}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Avg Res</p>
                <p className="text-xl font-bold text-slate-900 mt-1 pt-1">{stats.avgResolutionTime}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Tickets by Status</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={charts.byStatus.filter((d: any) => d.value > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {charts.byStatus.filter((d: any) => d.value > 0).map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {user?.role === 'Admin' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Top Departments</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charts.topDepartments} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                        <RechartsTooltip />
                        <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Top Support Agents (Resolved)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.topAgents} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tickets Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Matched Tickets ({totalRecords})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-400 mb-3" />
              <p>No records found.</p>
              <p className="text-sm mt-1">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-medium text-slate-500">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Created By</th>
                    <th className="px-4 py-3">Agent</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {tickets.map(t => (
                    <tr key={t._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">#{String(t._id).slice(-6).toUpperCase()}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate" title={t.title}>{t.title}</td>
                      <td className="px-4 py-3 text-slate-600">{typeof t.department === 'object' ? t.department?.name : t.department || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          t.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                          t.status === 'Closed' ? 'bg-slate-100 text-slate-700' :
                          t.status === 'In Progress' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          t.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                          t.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                          t.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>{t.priority}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{t.createdBy?.name || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{t.assignedTo?.name || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                  <span className="text-sm text-slate-500">
                    Showing {(page - 1) * filters.limit! + 1} to {Math.min(page * filters.limit!, totalRecords)} of {totalRecords} records
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 hover:bg-white"
                    >
                      Prev
                    </button>
                    <span className="text-sm font-medium px-2">Page {page} of {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 hover:bg-white"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
