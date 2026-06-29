import { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { TicketPriority, TicketCategory, TicketStatus } from '../services/ticketService';
import departmentService, { Department } from '../services/departmentService';

interface TicketFormProps {
  initialValues?: {
    title: string;
    description: string;
    priority: TicketPriority;
    category: TicketCategory;
    status?: TicketStatus;
  };
  onSubmit: (data: {
    title: string;
    description: string;
    priority: TicketPriority;
    category: TicketCategory;
    status?: TicketStatus;
    department?: string;
  }) => Promise<void>;
  isLoading: boolean;
  isEdit?: boolean;
  isAdmin?: boolean;
}

export default function TicketForm({
  initialValues,
  onSubmit,
  isLoading,
  isEdit = false,
  isAdmin = false
}: TicketFormProps) {
  const [formData, setFormData] = useState({
    title: initialValues?.title || '',
    description: initialValues?.description || '',
    priority: initialValues?.priority || 'Medium' as TicketPriority,
    category: initialValues?.category || 'Other' as TicketCategory,
    status: initialValues?.status || 'Open' as TicketStatus,
    department: ''
  });
  const [errors, setErrors] = useState<{ title?: string; description?: string; department?: string }>({});
  const [apiError, setApiError] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);

  useEffect(() => {
    if (!isEdit) {
      setLoadingDepts(true);
      departmentService.getDepartments()
        .then(res => {
          const active = res.data.filter(d => d.isActive);
          setDepartments(active);
          if (active.length > 0) {
            setFormData(prev => ({ ...prev, department: active[0]._id }));
          }
        })
        .catch(console.error)
        .finally(() => setLoadingDepts(false));
    }
  }, [isEdit]);

  const validateForm = () => {
    const newErrors: { title?: string; description?: string; department?: string } = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title cannot exceed 100 characters';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Description cannot exceed 2000 characters';
    }
    if (!isEdit && !formData.department) {
      newErrors.department = 'Please select a department';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validateForm()) return;
    try {
      await onSubmit(formData);
    } catch (error: any) {
      setApiError(error.response?.data?.message || 'Failed to save ticket');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {apiError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{apiError}</p>
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1.5">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          maxLength={100}
          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${errors.title ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
          placeholder="Brief summary of the issue"
        />
        <div className="flex justify-between mt-1">
          {errors.title ? <p className="text-sm text-red-500">{errors.title}</p> : <span></span>}
          <span className="text-xs text-slate-400">{formData.title.length}/100</span>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1.5">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={6}
          maxLength={2000}
          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none ${errors.description ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
          placeholder="Provide detailed information about the issue..."
        />
        <div className="flex justify-between mt-1">
          {errors.description ? <p className="text-sm text-red-500">{errors.description}</p> : <span></span>}
          <span className="text-xs text-slate-400">{formData.description.length}/2000</span>
        </div>
      </div>

      {!isEdit && (
        <div>
          <label htmlFor="department" className="block text-sm font-medium text-slate-700 mb-1.5">
            Department <span className="text-red-500">*</span>
          </label>
          {loadingDepts ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading departments...
            </div>
          ) : (
            <select
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${errors.department ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
            >
              <option value="">Select a department...</option>
              {departments.map(d => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          )}
          {errors.department && <p className="mt-1.5 text-sm text-red-500">{errors.department}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-slate-700 mb-1.5">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1.5">
            Category
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="Hardware">Hardware</option>
            <option value="Software">Software</option>
            <option value="Network">Network</option>
            <option value="Access">Access</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {isEdit && isAdmin && (
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1.5">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="Open">Open</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>{isEdit ? 'Update Ticket' : 'Create Ticket'}</>
          )}
        </button>
      </div>
    </form>
  );
}
