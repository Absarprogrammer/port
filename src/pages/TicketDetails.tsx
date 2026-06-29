import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  Tag,
  Edit2,
  Trash2,
  Loader2
} from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { useTicketContext } from '../context/TicketContext';
import { useAuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import TicketForm from '../components/TicketForm';
import ticketService, { TicketStatus, TicketPriority, TicketCategory } from '../services/ticketService';
import adminService, { User as AdminUser } from '../services/adminService';

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTicket, fetchTicket, updateTicket, deleteTicket, isLoading } = useTicketContext();
  const { user } = useAuthContext();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [supportAgents, setSupportAgents] = useState<AdminUser[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTicket(id);
    }
  }, [id]);

  useEffect(() => {
    if (user?.role === 'Admin' || user?.role === 'Manager') {
      fetchSupportAgents();
    }
  }, [user]);

  const fetchSupportAgents = async () => {
    try {
      const response = await adminService.getUsers({ role: 'Support Agent' });
      setSupportAgents(response.data);
    } catch (error) {
      console.error('Failed to fetch support agents');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'High':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Assigned':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'In Progress':
        return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'Resolved':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Closed':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Hardware':
        return 'bg-purple-100 text-purple-700';
      case 'Software':
        return 'bg-indigo-100 text-indigo-700';
      case 'Network':
        return 'bg-cyan-100 text-cyan-700';
      case 'Access':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleUpdate = async (data: {
    title: string;
    description: string;
    priority: TicketPriority;
    category: TicketCategory;
    status?: TicketStatus;
  }) => {
    try {
      await updateTicket(id!, data);
      toast.success('Ticket updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update ticket');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTicket(id!);
      toast.success('Ticket deleted successfully');
      setShowDeleteConfirm(false);
      navigate('/tickets');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete ticket');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setIsSubmittingComment(true);
    try {
      await ticketService.addComment(id!, newComment);
      setNewComment('');
      fetchTicket(id!);
      toast.success('Comment added');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const canEdit = currentTicket && (
    user?.role === 'Admin' || user?.role === 'Manager' || currentTicket.createdBy._id === user?.id || (user?.role === 'Support Agent' && currentTicket.assignedTo?._id === user?.id)
  );

  const canDelete = currentTicket && currentTicket.status === 'Open' && (
    user?.role === 'Admin' || (user?.role === 'Employee' && currentTicket.createdBy._id === user?.id)
  );

  const canChangeStatus = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Support Agent';

  const handleAssign = async (userId: string) => {
    setIsAssigning(true);
    try {
      await adminService.assignTicket(id!, userId === 'unassigned' ? null : userId);
      toast.success('Ticket assigned successfully');
      fetchTicket(id!);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign ticket');
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading && !currentTicket) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  if (!currentTicket) {
    return (
      <MainLayout>
        <div className="text-center py-20">
          <p className="text-slate-500">Ticket not found</p>
          <Link to="/tickets" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
            Back to tickets
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            to="/tickets"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to tickets
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-slate-400 font-mono">
                  #{currentTicket._id.slice(-6).toUpperCase()}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(
                    currentTicket.priority
                  )}`}
                >
                  {currentTicket.priority}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                    currentTicket.status
                  )}`}
                >
                  {currentTicket.status}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{currentTicket.title}</h1>
            </div>

            {canEdit && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                {canDelete && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <TicketForm
              initialValues={{
                title: currentTicket.title,
                description: currentTicket.description,
                priority: currentTicket.priority,
                category: currentTicket.category,
                status: currentTicket.status
              }}
              onSubmit={handleUpdate}
              isLoading={isLoading}
              isEdit
              isAdmin={canChangeStatus}
            />
            <button
              onClick={() => setIsEditing(false)}
              className="mt-4 text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-sm font-medium text-slate-500 mb-3">Description</h2>
              <p className="text-slate-900 whitespace-pre-wrap">{currentTicket.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Tag className="w-4 h-4" />
                    <span className="text-sm font-medium">Category</span>
                  </div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(
                      currentTicket.category
                    )}`}
                  >
                    {currentTicket.category}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Priority</span>
                  </div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(
                      currentTicket.priority
                    )}`}
                  >
                    {currentTicket.priority}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Status</span>
                  </div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                      currentTicket.status
                    )}`}
                  >
                    {currentTicket.status}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">Created By</span>
                  </div>
                  <p className="text-slate-900">{currentTicket.createdBy.name}</p>
                  <p className="text-sm text-slate-500">{currentTicket.createdBy.email}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">Assigned To</span>
                  </div>
                  {(user?.role === 'Admin' || user?.role === 'Manager') ? (
                    supportAgents.length === 0 ? (
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-sm text-slate-500">No Support Agents available.</p>
                        <button disabled className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-sm font-medium cursor-not-allowed">Assign</button>
                      </div>
                    ) : (
                      <select
                        value={currentTicket.assignedTo?._id || 'unassigned'}
                        onChange={(e) => handleAssign(e.target.value)}
                        disabled={isAssigning}
                        className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="unassigned">Unassigned</option>
                        {supportAgents.map(agent => (
                          <option key={agent._id} value={agent._id}>{agent.name} ({agent.email})</option>
                        ))}
                      </select>
                    )
                  ) : (
                    <>
                      <p className="text-slate-900">{currentTicket.assignedTo?.name || 'Unassigned'}</p>
                      {currentTicket.assignedTo?.email && (
                        <p className="text-sm text-slate-500">{currentTicket.assignedTo.email}</p>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">Created</span>
                  </div>
                  <p className="text-slate-900">{formatDate(currentTicket.createdAt)}</p>
                </div>

                {currentTicket.updatedAt !== currentTicket.createdAt && (
                  <div>
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">Last Updated</span>
                    </div>
                    <p className="text-slate-900">{formatDate(currentTicket.updatedAt)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Comments</h2>
              
              <div className="space-y-4 mb-6">
                {!currentTicket.comments || currentTicket.comments.length === 0 ? (
                  <p className="text-slate-500 text-sm">No comments yet.</p>
                ) : (
                  currentTicket.comments.map((comment) => (
                    <div key={comment._id} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-semibold text-sm text-slate-900">{comment.user?.name || 'Unknown User'}</span>
                          <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{comment.user?.role}</span>
                        </div>
                        <span className="text-xs text-slate-500">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="text-slate-700 text-sm whitespace-pre-wrap">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleCommentSubmit} className="mt-4 border-t pt-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none h-24"
                  disabled={isSubmittingComment}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-sm"
                  >
                    {isSubmittingComment ? 'Adding...' : 'Add Comment'}
                  </button>
                </div>
              </form>
            </div>

            {/* Timeline Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Ticket Timeline</h2>
              <div className="space-y-4">
                {(!currentTicket.timeline || currentTicket.timeline.length === 0) ? (
                  <p className="text-slate-500 text-sm">No timeline events.</p>
                ) : (
                  <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-2 mt-4">
                    {currentTicket.timeline.map((event, index) => (
                      <div key={event._id || index} className="relative pl-6">
                        <div className="absolute -left-[9px] top-1.5 w-4 h-4 bg-blue-100 rounded-full border-2 border-white flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900">{event.action}</span>
                          {event.details && <span className="text-sm text-slate-600">{event.details}</span>}
                          <span className="text-xs text-slate-500 mt-1">
                            by {event.user?.name || 'Unknown User'} <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 ml-1">{event.user?.role || 'Unknown'}</span> &bull; {formatDate(event.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Ticket</h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete this ticket? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
