import api from './api';
import { InspectionType } from './api';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  busIds?: string[];
  inspectionTypes?: InspectionType[];
}

export interface InspectionStats {
  total: number;
  ok: number;
  warning: number;
  expired: number;
  byType: Record<InspectionType, {
    total: number;
    ok: number;
    warning: number;
    expired: number;
  }>;
}

export const reportsApi = {
  getStats: (filters?: ReportFilters) =>
    api.get<InspectionStats>('/reports/stats', { params: filters }),

  exportPDF: async (filters?: ReportFilters) => {
    const response = await api.get('/reports/pdf', {
      params: filters,
      responseType: 'blob',
    });
    return response;
  },

  exportExcel: async (filters?: ReportFilters) => {
    const response = await api.get('/reports/excel', {
      params: filters,
      responseType: 'blob',
    });
    return response;
  },
};

