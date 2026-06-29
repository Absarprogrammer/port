import { Link } from 'react-router-dom';
import { Ticket } from '../services/ticketService';
import { Clock, User, AlertCircle } from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
}

export default function TicketCard({ ticket }: TicketCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700 border-red-200';
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
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Link
      to={`/tickets/${ticket._id}`}
      className="block bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="font-semibold text-slate-900 line-clamp-2">{ticket.title}</h3>
        <span className="text-xs text-slate-400 font-mono shrink-0">
          #{ticket._id.slice(-6).toUpperCase()}
        </span>
      </div>

      <p className="text-sm text-slate-500 line-clamp-2 mb-4">{ticket.description}</p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
            ticket.priority
          )}`}
        >
          {ticket.priority}
        </span>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
            ticket.status
          )}`}
        >
          {ticket.status}
        </span>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryColor(
            ticket.category
          )}`}
        >
          {ticket.category}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <User className="w-3.5 h-3.5" />
          <span>{ticket.createdBy.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatDate(ticket.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
