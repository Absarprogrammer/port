const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getReportTickets,
  getDashboardStats,
  exportPDF,
  exportExcel,
  exportCSV
} = require('../controllers/reportController');

// All report routes are protected.
// Role-based filtering is handled within the controller.
router.use(protect);

router.get('/tickets', getReportTickets);
router.get('/dashboard', getDashboardStats);

router.get('/export/pdf', exportPDF);
router.get('/export/excel', exportExcel);
router.get('/export/csv', exportCSV);

module.exports = router;
