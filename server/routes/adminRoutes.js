const express = require('express');
const {
  getUsers,
  getTickets,
  updateTicketStatus,
  assignTicket,
  deleteUser,
  deleteTicket,
  updateUserRole,
  getStats
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Admin and Manager can access stats and tickets
router.route('/stats').get(authorize('Admin', 'Manager'), getStats);
router.route('/tickets').get(authorize('Admin', 'Manager'), getTickets);
router.route('/tickets/:id/status').put(authorize('Admin', 'Manager'), updateTicketStatus);
router.route('/tickets/:id/assign').put(authorize('Admin', 'Manager'), assignTicket);

// User management (Write actions) are Admin only, but reading users is needed for Manager dropdowns
router.route('/users').get(authorize('Admin', 'Manager'), getUsers);
router.route('/users/:id/role').put(authorize('Admin'), updateUserRole);
router.route('/users/:id').delete(authorize('Admin'), deleteUser);

// Ticket deletion is Admin only
router.route('/tickets/:id').delete(authorize('Admin'), deleteTicket);

module.exports = router;
