import axios from 'axios';
import { authService } from './auth';

// Usar variável de ambiente ou fallback para /api (proxy local)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token a todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('Token não encontrado para requisição:', config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para lidar com erros 401 (não autenticado)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se receber 401 e não for uma tentativa de refresh e não for a rota /auth/me
    if (
      error.response?.status === 401 && 
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/me') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;

      try {
        // Tentar renovar o token
        await authService.refreshToken();
        // Repetir a requisição original
        const token = authService.getToken();
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Se o refresh falhar, limpar auth mas não redirecionar aqui
        // Deixar o componente tratar
        authService.clearAuth();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export interface Bus {
  id: string;
  matricula: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  chassisNumber?: string | null;
  currentMileage?: number | null;
  lastMileageUpdate?: string | null;
  createdAt: string;
  updatedAt: string;
  inspections: Inspection[];
  driverAssignments?: {
    id: string;
    driverId: string;
    busId: string;
    assignedAt: string;
    unassignedAt: string | null;
    driver: {
      id: string;
      name: string;
      licenseNumber: string;
    };
  }[];
}

export interface Inspection {
  id: string;
  busId: string;
  type: InspectionType;
  lastInspectionDate: string;
  nextInspectionDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  bus?: {
    id: string;
    matricula: string;
  };
}

export enum InspectionType {
  EXTINTORES = 'EXTINTORES',
  PNEUS = 'PNEUS',
  REVISOES = 'REVISOES',
  LICENCAS_TCC = 'LICENCAS_TCC',
  LICENCAS_COMUNITARIAS = 'LICENCAS_COMUNITARIAS',
  INSPECOES = 'INSPECOES',
}

export interface InspectionWithStatus extends Inspection {
  daysUntilDue: number | null;
  status: 'ok' | 'warning' | 'expired';
}

// Buses API
export const busesApi = {
  getAll: () => api.get<Bus[]>('/buses'),
  getById: (id: string) => api.get<Bus>(`/buses/${id}`),
  create: (matricula: string) => api.post<Bus>('/buses', { matricula }),
  update: (id: string, matricula: string) => api.put<Bus>(`/buses/${id}`, { matricula }),
  delete: (id: string) => api.delete(`/buses/${id}`),
};

// Inspections API
export const inspectionsApi = {
  getAll: (withStatus?: boolean) => 
    api.get<Inspection[] | InspectionWithStatus[]>('/inspections', {
      params: withStatus ? { withStatus: 'true' } : {},
    }),
  getById: (id: string) => api.get<Inspection>(`/inspections/${id}`),
  getByBusId: (busId: string) => api.get<Inspection[]>(`/inspections?busId=${busId}`),
  create: (data: {
    busId: string;
    type: InspectionType;
    lastInspectionDate: string;
    nextInspectionDate?: string | null;
    notes?: string | null;
  }) => api.post<Inspection>('/inspections', data),
  update: (id: string, data: {
    lastInspectionDate?: string;
    nextInspectionDate?: string | null;
    notes?: string | null;
  }) => api.put<Inspection>(`/inspections/${id}`, data),
  delete: (id: string) => api.delete(`/inspections/${id}`),
};

export default api;

