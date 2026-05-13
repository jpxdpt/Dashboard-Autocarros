import api from './api';

export interface Schedule {
  id: string;
  companyId: string;
  date: string;
  driverId: string;
  busId: string;
  service: string;
  createdAt: string;
  updatedAt: string;
  driver?: {
    id: string;
    name: string;
    licenseNumber: string;
  };
  bus?: {
    id: string;
    matricula: string;
    brand: string | null;
    model: string | null;
  };
}

export interface ScheduleInput {
  date: string;
  driverId: string;
  busId: string;
  service: string;
}

export const schedulesApi = {
  getAll: (params?: { date?: string; startDate?: string; endDate?: string }) =>
    api.get<Schedule[]>('/schedules', { params }),

  getById: (id: string) => api.get<Schedule>(`/schedules/${id}`),

  create: (data: ScheduleInput) => api.post<Schedule>('/schedules', data),

  createBulk: (schedules: ScheduleInput[]) =>
    api.post<Schedule[]>('/schedules/bulk', { schedules }),

  update: (id: string, data: Partial<ScheduleInput>) =>
    api.put<Schedule>(`/schedules/${id}`, data),

  delete: (id: string) => api.delete(`/schedules/${id}`),

  deleteByDate: (date: string) => api.delete(`/schedules/date/${date}`),
};