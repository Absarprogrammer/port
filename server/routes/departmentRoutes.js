const express = require('express');
const {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  toggleDepartmentStatus,
  deleteDepartment
} = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getDepartments)
  .post(authorize('Admin'), createDepartment);

router.route('/:id')
  .get(authorize('Admin'), getDepartment)
  .put(authorize('Admin'), updateDepartment)
  .delete(authorize('Admin'), deleteDepartment);

router.patch('/:id/status', authorize('Admin'), toggleDepartmentStatus);

module.exports = router;
