const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Department = require('../models/Department');
const { generatePDFReport, generateExcelReport, generateCSVReport } = require('../utils/reportGenerator');

// Helper to build Mongoose query based on filters and roles
const buildReportQuery = async (req) => {
  const {
    ticketId, createdBy, assignedTo, department, category, priority, status,
    dateFrom, dateTo, resolvedFrom, resolvedTo, closedFrom, closedTo
  } = req.query;

  let query = {};

  // Role constraints
  if (req.user.role === 'Manager') {
    query.department = req.user.department;
  } else if (req.user.role === 'Support Agent') {
    query.assignedTo = req.user._id;
  } else if (req.user.role === 'Employee') {
    query.createdBy = req.user._id;
  }

  // Filters
  if (ticketId) {
    if (ticketId.length === 24) {
      query._id = ticketId;
    } else {
      // It's a short id, we can't easily query last 6 chars in mongo directly unless we use regex or aggregation
      // Since ticket IDs are usually full ObjectIds in mongo, searching by last 6 chars requires $where or matching string
      query.$where = `this._id.toString().slice(-6).toUpperCase().includes('${ticketId.toUpperCase()}')`;
    }
  }
  
  if (department) query.department = department;
  if (category) query.category = category;
  if (priority) query.priority = priority;
  if (status) query.status = status;

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }
  if (resolvedFrom || resolvedTo) {
    query.resolvedAt = {};
    if (resolvedFrom) query.resolvedAt.$gte = new Date(resolvedFrom);
    if (resolvedTo) query.resolvedAt.$lte = new Date(resolvedTo);
  }
  if (closedFrom || closedTo) {
    query.closedAt = {};
    if (closedFrom) query.closedAt.$gte = new Date(closedFrom);
    if (closedTo) query.closedAt.$lte = new Date(closedTo);
  }

  // Text search on createdBy / assignedTo needs subqueries
  if (createdBy) {
    const users = await User.find({ name: { $regex: createdBy, $options: 'i' } }).select('_id');
    query.createdBy = { $in: users.map(u => u._id) };
  }
  if (assignedTo) {
    const agents = await User.find({ name: { $regex: assignedTo, $options: 'i' } }).select('_id');
    query.assignedTo = { $in: agents.map(u => u._id) };
  }

  return query;
};

const getSortOption = (sortParam) => {
  switch (sortParam) {
    case 'oldest': return { createdAt: 1 };
    case 'priority': return { priority: -1, createdAt: -1 }; // high to low, then newest
    case 'status': return { status: 1, createdAt: -1 };
    default: return { createdAt: -1 }; // newest
  }
};

const getAppliedFilters = (req) => {
  const filters = {};
  if (req.query.department) filters.Department = req.query.department;
  if (req.query.category) filters.Category = req.query.category;
  if (req.query.priority) filters.Priority = req.query.priority;
  if (req.query.status) filters.Status = req.query.status;
  if (req.query.createdBy) filters['Created By'] = req.query.createdBy;
  if (req.query.assignedTo) filters['Assigned To'] = req.query.assignedTo;
  if (req.query.dateFrom) filters['From'] = req.query.dateFrom;
  if (req.query.dateTo) filters['To'] = req.query.dateTo;
  return filters;
};

const calculateStats = (tickets) => {
  const stats = {
    total: tickets.length,
    open: 0,
    assigned: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    critical: 0,
    avgResolutionTime: 'N/A'
  };

  let totalResTime = 0;
  let resolvedCount = 0;

  tickets.forEach(t => {
    if (t.status === 'Open') stats.open++;
    if (t.status === 'Assigned') stats.assigned++;
    if (t.status === 'In Progress') stats.inProgress++;
    if (t.status === 'Resolved') stats.resolved++;
    if (t.status === 'Closed') stats.closed++;
    if (t.priority === 'Critical') stats.critical++;

    if (t.resolvedAt && t.createdAt) {
      totalResTime += (new Date(t.resolvedAt) - new Date(t.createdAt));
      resolvedCount++;
    }
  });

  if (resolvedCount > 0) {
    const avgMs = totalResTime / resolvedCount;
    const hours = Math.round(avgMs / (1000 * 60 * 60));
    stats.avgResolutionTime = `${hours} hrs`;
  }

  return stats;
};

// GET /api/reports/tickets
exports.getReportTickets = async (req, res) => {
  try {
    const query = await buildReportQuery(req);
    const sort = getSortOption(req.query.sort);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await Ticket.countDocuments(query);
    const tickets = await Ticket.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('department', 'name');

    res.json({ tickets, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching report tickets' });
  }
};

// GET /api/reports/dashboard
exports.getDashboardStats = async (req, res) => {
  try {
    const query = await buildReportQuery(req);
    const tickets = await Ticket.find(query)
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name')
      .populate('department', 'name');

    const stats = calculateStats(tickets);

    // Advanced analytics
    const byDepartment = {};
    const byPriority = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    const byStatus = { Open: 0, Assigned: 0, 'In Progress': 0, Resolved: 0, Closed: 0 };
    const agentWorkload = {};
    const monthlyTrend = {};

    tickets.forEach(t => {
      // By Dept
      const dName = t.department?.name || 'Unassigned';
      byDepartment[dName] = (byDepartment[dName] || 0) + 1;

      // By Priority/Status
      if (byPriority[t.priority] !== undefined) byPriority[t.priority]++;
      if (byStatus[t.status] !== undefined) byStatus[t.status]++;

      // Agent workload (resolved tickets)
      if (t.status === 'Resolved' || t.status === 'Closed') {
        if (t.assignedTo) {
          const aName = t.assignedTo.name;
          agentWorkload[aName] = (agentWorkload[aName] || 0) + 1;
        }
      }

      // Monthly Trend (created)
      const monthStr = new Date(t.createdAt).toISOString().slice(0, 7); // YYYY-MM
      monthlyTrend[monthStr] = (monthlyTrend[monthStr] || 0) + 1;
    });

    const topAgents = Object.keys(agentWorkload)
      .map(name => ({ name, count: agentWorkload[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topDepartments = Object.keys(byDepartment)
      .map(name => ({ name, count: byDepartment[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const trendChart = Object.keys(monthlyTrend)
      .map(date => ({ date, count: monthlyTrend[date] }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      stats,
      charts: {
        byPriority: Object.keys(byPriority).map(name => ({ name, value: byPriority[name] })),
        byStatus: Object.keys(byStatus).map(name => ({ name, value: byStatus[name] })),
        topDepartments,
        topAgents,
        trendChart
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
};

const getExportData = async (req) => {
  const query = await buildReportQuery(req);
  const sort = getSortOption(req.query.sort);
  const tickets = await Ticket.find(query)
    .sort(sort)
    .populate('createdBy', 'name email')
    .populate('assignedTo', 'name email')
    .populate('department', 'name');

  const stats = calculateStats(tickets);
  const appliedFilters = getAppliedFilters(req);

  return { tickets, stats, appliedFilters };
};

// GET /api/reports/export/pdf
exports.exportPDF = async (req, res) => {
  try {
    const { tickets, stats, appliedFilters } = await getExportData(req);
    generatePDFReport(tickets, appliedFilters, stats, req.user, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating PDF' });
  }
};

// GET /api/reports/export/excel
exports.exportExcel = async (req, res) => {
  try {
    const { tickets, stats, appliedFilters } = await getExportData(req);
    await generateExcelReport(tickets, appliedFilters, stats, req.user, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating Excel' });
  }
};

// GET /api/reports/export/csv
exports.exportCSV = async (req, res) => {
  try {
    const { tickets } = await getExportData(req);
    generateCSVReport(tickets, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating CSV' });
  }
};
