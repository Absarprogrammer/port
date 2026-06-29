import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import TicketForm from '../components/TicketForm';
import { useTicketContext } from '../context/TicketContext';
import { useToast } from '../context/ToastContext';
import { TicketPriority, TicketCategory } from '../services/ticketService';

export default function NewTicket() {
  const navigate = useNavigate();
  const { createTicket, isLoading } = useTicketContext();
  const toast = useToast();

  const handleSubmit = async (data: {
    title: string;
    description: string;
    priority: TicketPriority;
    category: TicketCategory;
    department?: string;
  }) => {
    try {
      const ticket = await createTicket({
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category,
        department: data.department || ''
      });
      toast.success('Ticket created successfully');
      navigate(`/tickets/${ticket._id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create ticket');
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PlusCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Create New Ticket</h1>
              <p className="text-slate-500">Submit a new support request</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <TicketForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </div>
    </MainLayout>
  );
}
