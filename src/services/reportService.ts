import api from './api';

export interface ReportFilters {
  ticketId?: string;
  department?: string;
  category?: string;
  priority?: string;
  status?: string;
  assignedTo?: string;
  createdBy?: string;
  dateFrom?: string;
  dateTo?: string;
  resolvedFrom?: string;
  resolvedTo?: string;
  closedFrom?: string;
  closedTo?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

class ReportService {
  getTickets(filters: ReportFilters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });
    return api.get(`/reports/tickets?${params.toString()}`);
  }

  getDashboardStats(filters: ReportFilters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });
    return api.get(`/reports/dashboard?${params.toString()}`);
  }

  async exportPDF(filters: ReportFilters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });
    const response = await api.get(`/reports/export/pdf?${params.toString()}`, { responseType: 'blob' });
    this.downloadFile(response.data, this.getFilenameFromHeader(response) || `Ticket_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  async exportExcel(filters: ReportFilters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });
    const response = await api.get(`/reports/export/excel?${params.toString()}`, { responseType: 'blob' });
    this.downloadFile(response.data, this.getFilenameFromHeader(response) || `Ticket_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  async exportCSV(filters: ReportFilters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });
    const response = await api.get(`/reports/export/csv?${params.toString()}`, { responseType: 'blob' });
    this.downloadFile(response.data, this.getFilenameFromHeader(response) || `Ticket_Report_${new Date().toISOString().split('T')[0]}.csv`);
  }

  private getFilenameFromHeader(response: any) {
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  private downloadFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

export default new ReportService();
