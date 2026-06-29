const mongoose = require('mongoose');

const DEPT_NAMES = ['Hardware', 'Software', 'Network', 'HR', 'Finance', 'General IT'];

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a department name'],
    unique: true,
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  managerIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-seed default departments if collection is empty
departmentSchema.statics.seedDefaults = async function () {
  const count = await this.countDocuments();
  if (count === 0) {
    await this.insertMany(DEPT_NAMES.map(name => ({ name })));
    console.log('Seeded default departments:', DEPT_NAMES.join(', '));
  }
};

module.exports = mongoose.model('Department', departmentSchema);
