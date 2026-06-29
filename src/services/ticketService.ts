import api from './api';

export type TicketStatus = 'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketCategory = 'Hardware' | 'Software' | 'Network' | 'Access' | 'Other';

export interface Comment {
  _id: string;
  user: {
    _id: string;
    name: string;
    role: string;
    email?: string;
  };
  text: string;
  createdAt: string;
}

export interface TimelineEvent {
  _id: string;
  action: string;
  user: {
    _id: string;
    name: string;
    role: string;
    email?: string;
  };
  details?: string;
  createdAt: string;
}

export interface Ticket {
  _id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  department: {
    _id: string;
    name: string;
  } | string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  assignedBy?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  assignedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  comments?: Comment[];
  timeline?: TimelineEvent[];
}

export interface TicketStats {
  total: number;
  open: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  closed: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface CreateTicketData {
  title: string;
  description: string;
  priority?: TicketPriority;
  category?: TicketCategory;
  department: string;
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignedTo?: string | null;
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  search?: string;
}

const ticketService = {
  async getMyTickets(filters?: TicketFilters): Promise<{ success: boolean; count: number; data: Ticket[] }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/tickets/my?${params.toString()}`);
    return response.data;
  },

  async getTickets(filters?: TicketFilters): Promise<{ success: boolean; count: number; data: Ticket[] }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/tickets?${params.toString()}`);
    return response.data;
  },

  async getTicket(id: string): Promise<{ success: boolean; data: Ticket }> {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },

  async createTicket(data: CreateTicketData): Promise<{ success: boolean; message: string; data: Ticket }> {
    const response = await api.post('/tickets', data);
    return response.data;
  },

  async updateTicket(id: string, data: UpdateTicketData): Promise<{ success: boolean; message: string; data: Ticket }> {
    const response = await api.put(`/tickets/${id}`, data);
    return response.data;
  },

  async deleteTicket(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/tickets/${id}`);
    return response.data;
  },

  async getStats(): Promise<{ success: boolean; data: TicketStats }> {
    const response = await api.get('/tickets/stats');
    return response.data;
  },

  async addComment(ticketId: string, text: string): Promise<{ success: boolean; message: string; data: Ticket }> {
    const response = await api.post(`/tickets/${ticketId}/comments`, { text });
    return response.data;
  }
};

export default ticketService;
