const Department = require('../models/Department');
const User = require('../models/User');
const Ticket = require('../models/Ticket');

// @desc   Get all departments
// @route  GET /api/departments
// @access Private
const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().populate('managerIds', 'name email');
    res.status(200).json({ success: true, data: departments });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Create department
// @route  POST /api/departments
// @access Private (Admin only)
const createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Department name is required.' });

    const existing = await Department.findOne({ name: name.trim() });
    if (existing) return res.status(409).json({ success: false, message: 'A department with this name already exists.' });

    const department = await Department.create({ name: name.trim(), description });
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Update department
// @route  PUT /api/departments/:id
// @access Private (Admin only)
const updateDepartment = async (req, res) => {
  try {
    const { name, description, managerIds } = req.body;
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ success: false, message: 'Department not found' });

    if (name && name.trim() !== department.name) {
      const duplicate = await Department.findOne({ name: name.trim(), _id: { $ne: req.params.id } });
      if (duplicate) return res.status(409).json({ success: false, message: 'A department with this name already exists.' });
      department.name = name.trim();
    }
    if (description !== undefined) department.description = description;
    if (managerIds !== undefined) department.managerIds = managerIds;

    await department.save();
    const updated = await Department.findById(department._id).populate('managerIds', 'name email');
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Toggle department active status
// @route  PATCH /api/departments/:id/status
// @access Private (Admin only)
const toggleDepartmentStatus = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ success: false, message: 'Department not found' });

    department.isActive = !department.isActive;
    await department.save();
    res.status(200).json({ success: true, data: department, message: `Department ${department.isActive ? 'enabled' : 'disabled'} successfully.` });
  } catch (error) {
    console.error('Toggle department status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Delete department
// @route  DELETE /api/departments/:id
// @access Private (Admin only)
const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ success: false, message: 'Department not found' });

    const userCount = await User.countDocuments({ department: req.params.id });
    const ticketCount = await Ticket.countDocuments({ department: req.params.id });

    if (userCount > 0 || ticketCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete department with ${userCount} user(s) and ${ticketCount} ticket(s). Disable it instead.`
      });
    }

    await department.deleteOne();
    res.status(200).json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get single department
// @route  GET /api/departments/:id
// @access Private (Admin only)
const getDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id).populate('managerIds', 'name email');
    if (!department) return res.status(404).json({ success: false, message: 'Department not found' });
    res.status(200).json({ success: true, data: department });
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDepartments, getDepartment, createDepartment, updateDepartment, toggleDepartmentStatus, deleteDepartment };
