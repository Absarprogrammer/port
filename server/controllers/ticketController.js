const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { sendTicketCreatedEmail, sendTicketStatusChangedEmail, sendTicketResolvedEmail, sendTicketClosedEmail, sendTicketReopenedEmail, sendManagerNewTicketEmail } = require('../utils/email');

// @desc   Get logged-in user's tickets
// @route  GET /api/tickets/my
// @access Private
const getMyTickets = async (req, res) => {
  try {
    const { status, priority, category, search } = req.query;
    let query = {};
    if (req.user.role === 'Employee') query.createdBy = req.user.id;
    else if (req.user.role === 'Support Agent') query.assignedTo = req.user.id;
    else if (req.user.role === 'Manager') {
      query.department = req.user.department;
    }
    else query.createdBy = req.user.id; // fallback

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
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    console.error('Get my tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tickets'
    });
  }
};

// @desc   Get all tickets (Admin/Manager sees all, Employee/Agent sees own)
// @route  GET /api/tickets
// @access Private
const getTickets = async (req, res) => {
  try {
    const { status, priority, category, search } = req.query;
    const query = {};

    // Employees only see their own tickets
    if (req.user.role === 'Employee') {
      query.createdBy = req.user.id;
    }
    if (req.user.role === 'Support Agent') {
      query.assignedTo = req.user.id;
    }
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
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tickets'
    });
  }
};

// @desc   Get single ticket
// @route  GET /api/tickets/:id
// @access Private
const getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('comments.user', 'name role email')
      .populate('timeline.user', 'name role email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check authorization
    if (req.user.role === 'Employee' && ticket.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this ticket'
      });
    }
    if (req.user.role === 'Support Agent' && ticket.assignedTo?._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this ticket'
      });
    }

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching ticket'
    });
  }
};

// @desc   Create new ticket
// @route  POST /api/tickets
// @access Private
const createTicket = async (req, res) => {
  try {
    const { title, description, priority, category, department } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and description'
      });
    }
    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Please select a department'
      });
    }

    // Verify department is active
    const Department = require('../models/Department');
    const dept = await Department.findById(department);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
    if (!dept.isActive) return res.status(400).json({ success: false, message: 'Cannot create ticket for an inactive department' });

    const ticket = await Ticket.create({
      title,
      description,
      priority: priority || 'Medium',
      category: category || 'Other',
      department,
      createdBy: req.user.id,
      timeline: [{
        action: 'Ticket Created',
        user: req.user.id,
        details: 'Ticket was created'
      }]
    });

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('createdBy', 'name email')
      .populate('department', 'name');

    // Fire and forget email for creator
    sendTicketCreatedEmail(populatedTicket.createdBy, populatedTicket).catch(console.error);

    // Notify all active managers in the department
    const User = require('../models/User');
    const managers = await User.find({ role: 'Manager', department: department, isActive: { $ne: false } });
    if (managers.length > 0) {
      Promise.allSettled(
        managers.map(manager => 
          sendManagerNewTicketEmail(manager, populatedTicket, populatedTicket.createdBy.name, populatedTicket.department.name)
        )
      ).catch(console.error);
    }

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: populatedTicket
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating ticket'
    });
  }
};

// @desc   Update ticket
// @route  PUT /api/tickets/:id
// @access Private
const updateTicket = async (req, res) => {
  try {
    const { title, description, status, priority, category, assignedTo } = req.body;

    let ticket = await Ticket.findById(req.params.id);
    const originalStatus = ticket ? ticket.status : null;

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check authorization
    if (req.user.role === 'Employee' && ticket.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this ticket'
      });
    }
    if (req.user.role === 'Support Agent' && ticket.assignedTo?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this ticket'
      });
    }

    // Build update object based on role
    const updateData = {};
    
    if (req.user.role === 'Employee') {
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (priority) updateData.priority = priority;
      if (category) updateData.category = category;
    } else if (req.user.role === 'Support Agent') {
      if (status) {
        // Enforce workflow: Assigned -> In Progress -> Resolved
        const validTransitions = {
          'Assigned': ['In Progress'],
          'In Progress': ['Resolved']
        };
        const allowedNext = validTransitions[ticket.status] || [];
        if (!allowedNext.includes(status)) {
          return res.status(400).json({
            success: false,
            message: `Support Agents can only transition from ${ticket.status} to ${allowedNext.length ? allowedNext.join(' or ') : 'no further status'}`
          });
        }
        updateData.status = status;
        if (status === 'Resolved') updateData.resolvedAt = Date.now();
      }
    } else if (req.user.role === 'Admin' || req.user.role === 'Manager') {
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (priority) updateData.priority = priority;
      if (category) updateData.category = category;
      if (status) {
        updateData.status = status;
        if (status === 'Resolved') updateData.resolvedAt = Date.now();
        if (status === 'Closed') updateData.closedAt = Date.now();
        if (status === 'Open' || status === 'Assigned') {
          updateData.resolvedAt = null;
          updateData.closedAt = null;
        }
      }
      if (assignedTo !== undefined) {
        updateData.assignedTo = assignedTo || null;
      }
    }

    const timelineEvents = [];
    if (updateData.status && updateData.status !== ticket.status) {
      if ((updateData.status === 'Open' || updateData.status === 'Assigned') && (ticket.status === 'Closed' || ticket.status === 'Resolved')) {
        timelineEvents.push({ action: 'Ticket Reopened', user: req.user.id, details: `Status changed from ${ticket.status} to ${updateData.status}` });
      } else {
        timelineEvents.push({ action: 'Status Changed', user: req.user.id, details: `Status changed from ${ticket.status} to ${updateData.status}` });
      }
    }
    if (updateData.priority && updateData.priority !== ticket.priority) {
      timelineEvents.push({ action: 'Priority Changed', user: req.user.id, details: `Priority changed from ${ticket.priority} to ${updateData.priority}` });
    }
    if (updateData.assignedTo !== undefined && (updateData.assignedTo?.toString() || null) !== (ticket.assignedTo?.toString() || null)) {
      if (updateData.assignedTo) {
        const assignedUser = await User.findById(updateData.assignedTo);
        timelineEvents.push({ action: 'Assigned', user: req.user.id, details: `Assigned to ${assignedUser ? assignedUser.name : 'Unknown'}` });
      } else {
        timelineEvents.push({ action: 'Unassigned', user: req.user.id, details: 'Ticket was unassigned' });
      }
    }

    const updateQuery = { $set: updateData };
    if (timelineEvents.length > 0) {
      updateQuery.$push = { timeline: { $each: timelineEvents } };
    }

    ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      updateQuery,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('comments.user', 'name role email')
      .populate('timeline.user', 'name role email');

    // Fire email notifications based on status change
    if (updateData.status && updateData.status !== originalStatus) {
      if (updateData.status === 'Resolved') {
        sendTicketResolvedEmail(ticket.createdBy, ticket).catch(console.error);
      } else if (updateData.status === 'Closed') {
        sendTicketClosedEmail(ticket.createdBy, ticket).catch(console.error);
      } else if ((updateData.status === 'Open' || updateData.status === 'Assigned') && (originalStatus === 'Closed' || originalStatus === 'Resolved')) {
        sendTicketReopenedEmail(ticket.createdBy, ticket, req.user.name).catch(console.error);
        if (ticket.assignedTo && ticket.assignedTo._id.toString() !== ticket.createdBy._id.toString()) {
           sendTicketReopenedEmail(ticket.assignedTo, ticket, req.user.name).catch(console.error);
        }
      } else {
        sendTicketStatusChangedEmail(ticket.createdBy, ticket).catch(console.error);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Ticket updated successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating ticket'
    });
  }
};

// @desc   Delete ticket (only own tickets with Open status, or Admin/Manager)
// @route  DELETE /api/tickets/:id
// @access Private
const deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check authorization
    if (req.user.role === 'Employee' && ticket.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this ticket'
      });
    }
    if (req.user.role === 'Support Agent') {
      return res.status(403).json({
        success: false,
        message: 'Support Agents cannot delete tickets'
      });
    }
    if (req.user.role === 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Managers cannot delete tickets'
      });
    }

    // Employees can only delete Open tickets
    if (req.user.role === 'Employee' && ticket.status !== 'Open') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete ticket that is not Open'
      });
    }

    await ticket.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Ticket deleted successfully'
    });
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting ticket'
    });
  }
};

// @desc   Get ticket statistics
// @route  GET /api/tickets/stats
// @access Private
const getTicketStats = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'Employee') query.createdBy = req.user.id;
    if (req.user.role === 'Support Agent') query.assignedTo = req.user.id;

    const stats = await Ticket.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'Open'] }, 1, 0] } },
          assigned: { $sum: { $cond: [{ $eq: ['$status', 'Assigned'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$priority', 'Low'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$priority', 'Medium'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$priority', 'High'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$priority', 'Critical'] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      open: 0,
      assigned: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get ticket stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
};

// @desc   Add comment to ticket
// @route  POST /api/tickets/:id/comments
// @access Private
const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Please provide comment text' });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    // Permissions
    if (req.user.role === 'Employee' && ticket.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (req.user.role === 'Support Agent' && ticket.assignedTo?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    ticket.comments.push({ user: req.user.id, text });
    ticket.timeline.push({
      action: 'Comment Added',
      user: req.user.id,
      details: 'A new comment was added'
    });
    await ticket.save();

    const updatedTicket = await Ticket.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('comments.user', 'name role email')
      .populate('timeline.user', 'name role email');

    res.status(200).json({ success: true, message: 'Comment added', data: updatedTicket });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ success: false, message: 'Server error adding comment' });
  }
};

module.exports = {
  getTickets,
  getMyTickets,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  getTicketStats,
  addComment
};
