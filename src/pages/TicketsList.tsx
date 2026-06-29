import { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import TicketList from '../components/TicketList';
import { useTicketContext } from '../context/TicketContext';
import { useAuthContext } from '../context/AuthContext';
import { TicketFilters } from '../services/ticketService';
import { ListTodo } from 'lucide-react';

export default function TicketsList() {
  const { tickets, fetchTickets, isLoading } = useTicketContext();
  const { user } = useAuthContext();
  const [filters, setFilters] = useState<TicketFilters>({});

  useEffect(() => {
    fetchTickets(filters);
  }, [filters.status, filters.priority, filters.category]);

  const handleFilterChange = (newFilters: TicketFilters) => {
    setFilters(newFilters);
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <ListTodo className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {user?.role === 'Support Agent'
                ? 'My Assigned Tickets'
                : user?.role === 'Admin' || user?.role === 'Manager'
                ? 'All Tickets'
                : 'My Tickets'}
            </h1>
            <p className="text-slate-500">
              {user?.role === 'Support Agent'
                ? 'View and manage tickets assigned to you'
                : user?.role === 'Admin' || user?.role === 'Manager'
                ? 'Manage and track all support tickets'
                : 'Manage and track your support tickets'}
            </p>
          </div>
        </div>
      </div>

      <TicketList
        tickets={tickets}
        isLoading={isLoading}
        onFilterChange={handleFilterChange}
      />
    </MainLayout>
  );
}
