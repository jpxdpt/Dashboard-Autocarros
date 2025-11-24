import api from './api';

export interface OdometerReading {
  id: string;
  busId: string;
  mileage: number;
  readingDate: string;
  notes: string | null;
  recordedBy: string | null;
  createdAt: string;
}

export interface MaintenanceSchedule {
  id: string;
  busId: string;
  maintenanceType: string;
  mileageInterval: number;
  lastMaintenanceMileage: number | null;
  nextMaintenanceMileage: number;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusMileageInfo {
  id: string;
  matricula: string;
  currentMileage: number | null;
  lastMileageUpdate: string | null;
}

export const mileageApi = {
  // Registos de quilometragem
  getReadings: (busId: string) => api.get<OdometerReading[]>(`/mileage/buses/${busId}/readings`),
  
  createReading: (data: {
    busId: string;
    mileage: number;
    readingDate?: string;
    notes?: string | null;
  }) => api.post<OdometerReading>('/mileage/readings', data),

  // Agendas de manutenção
  getSchedules: (busId: string) => api.get<MaintenanceSchedule[]>(`/mileage/buses/${busId}/schedules`),
  
  createSchedule: (data: {
    busId: string;
    maintenanceType: string;
    mileageInterval: number;
    lastMaintenanceMileage?: number | null;
    nextMaintenanceMileage: number;
    notes?: string | null;
  }) => api.post<MaintenanceSchedule>('/mileage/schedules', data),
  
  updateSchedule: (id: string, data: Partial<MaintenanceSchedule>) =>
    api.put<MaintenanceSchedule>(`/mileage/schedules/${id}`, data),
  
  deleteSchedule: (id: string) => api.delete(`/mileage/schedules/${id}`),
};



