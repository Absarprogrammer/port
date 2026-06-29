import api from './api';
import { Ticket, TicketStatus, TicketFilters } from './ticketService';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Employee' | 'Support Agent' | 'Manager';
  department?: { _id: string; name: string; isActive: boolean } | null;
  createdAt: string;
}

export interface AdminStats {
  users: {
    total: number;
    admins: number;
    employees: number;
    supportAgents: number;
    managers: number;
  };
  tickets: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    byPriority: {
      Low: number;
      Medium: number;
      High: number;
      Critical: number;
    };
  };
  agentWorkload?: { name: string; count: number }[];
  monthlyTickets?: { _id: string; count: number }[];
}

export interface UserFilters {
  search?: string;
  role?: 'Admin' | 'Employee' | 'Support Agent' | 'Manager';
}

const adminService = {
  async getStats(): Promise<{ success: boolean; data: AdminStats }> {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  async getUsers(filters?: UserFilters): Promise<{ success: boolean; count: number; data: User[] }> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.role) params.append('role', filters.role);

    const response = await api.get(`/admin/users?${params.toString()}`);
    return response.data;
  },

  async updateUserRole(userId: string, role: 'Admin' | 'Employee' | 'Support Agent' | 'Manager', department?: string | null): Promise<{ success: boolean; message: string; data: User }> {
    const response = await api.put(`/admin/users/${userId}/role`, { role, department });
    return response.data;
  },

  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  async getTickets(filters?: TicketFilters): Promise<{ success: boolean; count: number; data: Ticket[] }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/admin/tickets?${params.toString()}`);
    return response.data;
  },

  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<{ success: boolean; message: string; data: Ticket }> {
    const response = await api.put(`/admin/tickets/${ticketId}/status`, { status });
    return response.data;
  },

  async assignTicket(ticketId: string, assignedTo: string | null): Promise<{ success: boolean; message: string; data: Ticket }> {
    const response = await api.put(`/admin/tickets/${ticketId}/assign`, { assignedTo });
    return response.data;
  },
};

export default adminService;
