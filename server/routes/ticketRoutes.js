const express = require('express');
const {
  getTickets,
  getMyTickets,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  getTicketStats,
  addComment
} = require('../controllers/ticketController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Ticket routes
router.route('/stats').get(getTicketStats);
router.route('/my').get(getMyTickets);
router.route('/').get(getTickets).post(createTicket);
router.route('/:id').get(getTicket).put(updateTicket).delete(deleteTicket);
router.route('/:id/comments').post(addComment);

module.exports = router;
