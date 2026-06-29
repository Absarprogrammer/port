import api from './api';

export interface Department {
  _id: string;
  name: string;
  description?: string;
  managerIds: { _id: string; name: string; email: string }[];
  isActive: boolean;
  createdAt: string;
}

export interface CreateDepartmentData {
  name: string;
  description?: string;
}

export interface UpdateDepartmentData {
  name?: string;
  description?: string;
  managerIds?: string[];
}

const departmentService = {
  async getDepartments(): Promise<{ success: boolean; data: Department[] }> {
    const response = await api.get('/departments');
    return response.data;
  },

  async getDepartment(id: string): Promise<{ success: boolean; data: Department }> {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  },

  async createDepartment(data: CreateDepartmentData): Promise<{ success: boolean; data: Department }> {
    const response = await api.post('/departments', data);
    return response.data;
  },

  async updateDepartment(id: string, data: UpdateDepartmentData): Promise<{ success: boolean; data: Department }> {
    const response = await api.put(`/departments/${id}`, data);
    return response.data;
  },

  async toggleStatus(id: string): Promise<{ success: boolean; data: Department; message: string }> {
    const response = await api.patch(`/departments/${id}/status`);
    return response.data;
  },

  async deleteDepartment(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/departments/${id}`);
    return response.data;
  },
};

export default departmentService;
