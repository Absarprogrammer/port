const User = require('../models/User');
const Ticket = require('../models/Ticket');
const { sendTicketAssignedEmail, sendTicketStatusChangedEmail, sendTicketResolvedEmail, sendTicketClosedEmail, sendTicketReopenedEmail, sendRoleChangeEmail, sendDepartmentChangeEmail, sendTicketReassignedFromEmail, sendTicketReassignedToEmail } = require('../utils/email');

// @desc   Get all users
// @route  GET /api/admin/users
// @access Private (Admin only)
const getUsers = async (req, res) => {
  try {
    const { search, role } = req.query;
    const query = {};

    // If Manager, restrict to their department only
    if (req.user.role === 'Manager') {
      query.department = req.user.department;
    }

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .populate('department', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

// @desc   Get all tickets (Admin view)
// @route  GET /api/admin/tickets
// @access Private (Admin only)
const getTickets = async (req, res) => {
  try {
    const { status, priority, category, search } = req.query;
    const query = {};

    // If Manager, restrict to their department
    if (req.user.role === 'Manager') {
      query.department = req.user.department;
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const tickets = await Ticket.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('department', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    console.error('Get admin tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tickets'
    });
  }
};

// @desc   Update ticket status
// @route  PUT /api/admin/tickets/:id/status
// @access Private (Admin only)
const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid status'
      });
    }

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const updateData = { status };
    if (status === 'Resolved') updateData.resolvedAt = Date.now();
    if (status === 'Closed') updateData.closedAt = Date.now();
    if (status === 'Open' || status === 'Assigned') {
      updateData.resolvedAt = null;
      updateData.closedAt = null;
    }

    const timelineEvent = {
       action: (status === 'Open' || status === 'Assigned') && (ticket.status === 'Closed' || ticket.status === 'Resolved') ? 'Ticket Reopened' : 'Status Changed',
       user: req.user.id,
       details: `Status changed from ${ticket.status} to ${status}`
    };

    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { $set: updateData, $push: { timeline: timelineEvent } },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('department', 'name');

    if (status === 'Resolved') {
      sendTicketResolvedEmail(updatedTicket.createdBy, updatedTicket).catch(console.error);
    } else if (status === 'Closed') {
      sendTicketClosedEmail(updatedTicket.createdBy, updatedTicket).catch(console.error);
    } else if ((status === 'Open' || status === 'Assigned') && (ticket.status === 'Closed' || ticket.status === 'Resolved')) {
      sendTicketReopenedEmail(updatedTicket.createdBy, updatedTicket, req.user.name).catch(console.error);
      if (updatedTicket.assignedTo && updatedTicket.assignedTo._id.toString() !== updatedTicket.createdBy._id.toString()) {
         sendTicketReopenedEmail(updatedTicket.assignedTo, updatedTicket, req.user.name).catch(console.error);
      }
    } else {
      sendTicketStatusChangedEmail(updatedTicket.createdBy, updatedTicket).catch(console.error);
    }

    res.status(200).json({
      success: true,
      message: 'Ticket status updated successfully',
      data: updatedTicket
    });
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating ticket status'
    });
  }
};

const assignTicket = async (req, res) => {
  try {
    const { assignedTo } = req.body;

    // Validate assignedTo before saving
    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Support Agent is required.'
      });
    }

    // Check if ticket exists
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Manager can only assign tickets in their own department
    if (req.user.role === 'Manager') {
      if (!ticket.department || ticket.department.toString() !== req.user.department?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Managers can only assign tickets in their own department.'
        });
      }
    }

    // Verify assigned user exists and is a Support Agent
    const agent = await User.findById(assignedTo);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (agent.role !== 'Support Agent') {
      return res.status(400).json({
        success: false,
        message: 'Can only assign tickets to Support Agents.'
      });
    }

    // Enforce: agent's department must match ticket's department
    if (!agent.department || agent.department.toString() !== ticket.department?.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Can only assign to a Support Agent who belongs to the ticket\'s department.'
      });
    }

    // Manager can only assign to agents in their own department
    if (req.user.role === 'Manager') {
      if (!agent.department || agent.department.toString() !== req.user.department?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Managers can only assign to Support Agents in their own department.'
        });
      }
    }

    // Check that the ticket's department is still active
    const Department = require('../models/Department');
    const dept = await Department.findById(ticket.department);
    if (dept && !dept.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign a ticket belonging to an inactive department.'
      });
    }

    const updateData = {
      assignedTo,
      assignedBy: req.user.id,
      assignedAt: new Date()
    };

    // Automatically manage status based on assignment
    if (ticket.status === 'Open') {
      updateData.status = 'Assigned';
    }

    const timelineEvents = [
      { action: 'Assigned', user: req.user.id, details: `Assigned to ${agent.name}` }
    ];
    if (updateData.status && updateData.status !== ticket.status) {
      timelineEvents.push({ action: 'Status Changed', user: req.user.id, details: `Status changed from ${ticket.status} to ${updateData.status}` });
    }

    const previousAgentId = ticket.assignedTo ? ticket.assignedTo.toString() : null;

    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { $set: updateData, $push: { timeline: { $each: timelineEvents } } },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('department', 'name');

    if (previousAgentId && previousAgentId !== agent._id.toString()) {
      const previousAgent = await User.findById(previousAgentId);
      if (previousAgent) {
        sendTicketReassignedFromEmail(previousAgent, updatedTicket, agent.name).catch(console.error);
        sendTicketReassignedToEmail(agent, updatedTicket, previousAgent.name).catch(console.error);
      }
    } else if (!previousAgentId) {
      sendTicketAssignedEmail(agent, updatedTicket).catch(console.error);
    }

    res.status(200).json({
      success: true,
      message: 'Ticket assigned successfully',
      data: updatedTicket
    });
  } catch (error) {
    console.error('Assign ticket error:', error.stack || error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning ticket',
      error: error.message
    });
  }
};

// @desc   Delete user
// @route  DELETE /api/admin/users/:id
// @access Private (Admin only)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting self
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
};

// @desc   Update user role
// @route  PUT /api/admin/users/:id/role
// @access Private (Admin only)
const updateUserRole = async (req, res) => {
  try {
    const { role, department } = req.body;

    if (!role || !['Admin', 'Employee', 'Support Agent', 'Manager'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid role'
      });
    }

    // Manager and Support Agent must have a department
    if ((role === 'Manager' || role === 'Support Agent') && !department) {
      return res.status(400).json({
        success: false,
        message: `${role}s must be assigned to a department.`
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent changing own role
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    // Validate the target department (must exist and be active)
    if (department) {
      const Department = require('../models/Department');
      const dept = await Department.findById(department);
      if (!dept) {
        return res.status(404).json({ success: false, message: 'Department not found' });
      }
      if (!dept.isActive) {
        return res.status(400).json({ success: false, message: 'Cannot assign user to an inactive department.' });
      }
    }

    // If moving Support Agent to a different department, check for active tickets
    const targetDept = department ? department.toString() : null;
    const currentDept = user.department ? user.department.toString() : null;
    if (targetDept && targetDept !== currentDept && user.role === 'Support Agent') {
      const activeTickets = await Ticket.countDocuments({ assignedTo: user._id, status: { $in: ['Assigned', 'In Progress'] } });
      if (activeTickets > 0) {
        return res.status(409).json({
          success: false,
          message: `Cannot move support agent with ${activeTickets} active ticket(s). Transfer them first.`
        });
      }
    }

    // If user is currently a Manager and is being moved away from their department, remove from managerIds
    const Department = require('../models/Department');
    if (user.role === 'Manager' && currentDept && targetDept !== currentDept) {
      await Department.findByIdAndUpdate(currentDept, { $pull: { managerIds: user._id } });
    }

    const oldRole = user.role;
    user.role = role;
    user.department = department || null;
    await user.save();

    // Sync Department.managerIds for the new department
    if (role === 'Manager' && department) {
      await Department.findByIdAndUpdate(department, { $addToSet: { managerIds: user._id } });
    }
    // If demoted from Manager, remove from old department's managerIds
    if (role !== 'Manager' && user.role !== 'Manager' && currentDept) {
      await Department.findByIdAndUpdate(currentDept, { $pull: { managerIds: user._id } });
    }

    const updated = await User.findById(user._id).populate('department', 'name isActive');

    if (oldRole !== role) {
      sendRoleChangeEmail(updated, oldRole, role).catch(console.error);
    }
    
    if (currentDept !== targetDept) {
      const DepartmentModel = require('../models/Department');
      const oldDeptDoc = currentDept ? await DepartmentModel.findById(currentDept) : null;
      const oldDeptName = oldDeptDoc ? oldDeptDoc.name : 'None';
      const newDeptName = updated.department ? updated.department.name : 'None';
      sendDepartmentChangeEmail(updated, oldDeptName, newDeptName).catch(console.error);
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        _id: updated._id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        department: updated.department
      }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user role'
    });
  }
};

// @desc   Get admin/manager dashboard stats
// @route  GET /api/admin/stats
// @access Private (Admin + Manager)
const getStats = async (req, res) => {
  try {
    const isManager = req.user.role === 'Manager';
    const deptFilter = isManager && req.user.department ? { department: req.user.department } : {};
    const userDeptFilter = isManager && req.user.department ? { department: req.user.department } : {};

    const totalUsers = isManager
      ? await User.countDocuments({ department: req.user.department })
      : await User.countDocuments();
    const totalTickets = await Ticket.countDocuments(deptFilter);
    const openTickets = await Ticket.countDocuments({ ...deptFilter, status: 'Open' });
    const resolvedTickets = await Ticket.countDocuments({ ...deptFilter, status: 'Resolved' });
    const inProgressTickets = await Ticket.countDocuments({ ...deptFilter, status: 'In Progress' });
    const closedTickets = await Ticket.countDocuments({ ...deptFilter, status: 'Closed' });

    const adminCount = isManager ? 0 : await User.countDocuments({ role: 'Admin' });
    const employeeCount = isManager
      ? await User.countDocuments({ ...userDeptFilter, role: 'Employee' })
      : await User.countDocuments({ role: 'Employee' });
    const supportAgentCount = isManager
      ? await User.countDocuments({ ...userDeptFilter, role: 'Support Agent' })
      : await User.countDocuments({ role: 'Support Agent' });
    const managerCount = isManager
      ? await User.countDocuments({ ...userDeptFilter, role: 'Manager' })
      : await User.countDocuments({ role: 'Manager' });

    // Tickets by priority
    const priorityStats = await Ticket.aggregate([
      { $match: deptFilter },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    const ticketsByPriority = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    priorityStats.forEach(p => ticketsByPriority[p._id] = p.count);

    // Agent Workload
    const agentWorkloadRaw = await Ticket.aggregate([
      { $match: { ...deptFilter, assignedTo: { $ne: null }, status: { $in: ['Assigned', 'In Progress'] } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { name: '$user.name', count: 1, _id: 0 } }
    ]);

    // Monthly Tickets (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyTickets = await Ticket.aggregate([
      { $match: { ...deptFilter, createdAt: { $gte: sixMonthsAgo } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          admins: adminCount,
          employees: employeeCount,
          supportAgents: supportAgentCount,
          managers: managerCount
        },
        tickets: {
          total: totalTickets,
          open: openTickets,
          inProgress: inProgressTickets,
          resolved: resolvedTickets,
          closed: closedTickets,
          byPriority: ticketsByPriority
        },
        agentWorkload: agentWorkloadRaw,
        monthlyTickets
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
};

module.exports = {
  getUsers,
  getTickets,
  updateTicketStatus,
  assignTicket,
  deleteUser,
  updateUserRole,
  getStats
};
