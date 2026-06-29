import { createContext, useContext, useState, ReactNode } from 'react';
import ticketService, {
  Ticket,
  TicketStats,
  CreateTicketData,
  UpdateTicketData,
  TicketFilters
} from '../services/ticketService';

interface TicketContextType {
  tickets: Ticket[];
  currentTicket: Ticket | null;
  stats: TicketStats | null;
  isLoading: boolean;
  error: string | null;
  fetchTickets: (filters?: TicketFilters) => Promise<void>;
  fetchTicket: (id: string) => Promise<void>;
  createTicket: (data: CreateTicketData) => Promise<Ticket>;
  updateTicket: (id: string, data: UpdateTicketData) => Promise<Ticket>;
  deleteTicket: (id: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  clearError: () => void;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export function TicketProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = async (filters?: TicketFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ticketService.getMyTickets(filters);
      setTickets(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTicket = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ticketService.getTicket(id);
      setCurrentTicket(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch ticket');
    } finally {
      setIsLoading(false);
    }
  };

  const createTicket = async (data: CreateTicketData): Promise<Ticket> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ticketService.createTicket(data);
      setTickets((prev) => [response.data, ...prev]);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create ticket');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTicket = async (id: string, data: UpdateTicketData): Promise<Ticket> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ticketService.updateTicket(id, data);
      setTickets((prev) =>
        prev.map((t) => (t._id === id ? response.data : t))
      );
      setCurrentTicket(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update ticket');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTicket = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await ticketService.deleteTicket(id);
      setTickets((prev) => prev.filter((t) => t._id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete ticket');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await ticketService.getStats();
      setStats(response.data);
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const clearError = () => setError(null);

  return (
    <TicketContext.Provider
      value={{
        tickets,
        currentTicket,
        stats,
        isLoading,
        error,
        fetchTickets,
        fetchTicket,
        createTicket,
        updateTicket,
        deleteTicket,
        fetchStats,
        clearError,
      }}
    >
      {children}
    </TicketContext.Provider>
  );
}

export function useTicketContext() {
  const context = useContext(TicketContext);
  if (context === undefined) {
    throw new Error('useTicketContext must be used within a TicketProvider');
  }
  return context;
}

export default TicketContext;
