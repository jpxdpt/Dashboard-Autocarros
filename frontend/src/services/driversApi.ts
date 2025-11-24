import api from './api';

export interface Driver {
  id: string;
  companyId: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  hireDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  licenses?: DriverLicense[];
  assignments?: DriverAssignment[];
}

export interface DriverLicense {
  id: string;
  driverId: string;
  licenseNumber: string;
  category: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriverAssignment {
  id: string;
  busId: string;
  driverId: string;
  assignedAt: string;
  unassignedAt: string | null;
  notes: string | null;
  bus?: {
    id: string;
    matricula: string;
  };
  driver?: {
    id: string;
    name: string;
    licenseNumber: string;
  };
}

export const driversApi = {
  getAll: (active?: boolean) =>
    api.get<Driver[]>('/drivers', {
      params: active !== undefined ? { active: active.toString() } : {},
    }),
  
  getById: (id: string) => api.get<Driver>(`/drivers/${id}`),
  
  create: (data: {
    name: string;
    licenseNumber: string;
    licenseCategory: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    hireDate?: string | null;
  }) => api.post<Driver>('/drivers', data),
  
  update: (id: string, data: Partial<Driver>) =>
    api.put<Driver>(`/drivers/${id}`, data),
  
  delete: (id: string) => api.delete(`/drivers/${id}`),
  
  // Licenças
  addLicense: (driverId: string, data: {
    licenseNumber: string;
    category: string;
    issueDate: string;
    expiryDate: string;
    issuingAuthority?: string | null;
    notes?: string | null;
  }) => api.post<DriverLicense>(`/drivers/${driverId}/licenses`, data),
  
  // Atribuições
  createAssignment: (data: {
    busId: string;
    driverId: string;
    notes?: string | null;
  }) => api.post<DriverAssignment>('/drivers/assignments', data),
  
  deleteAssignment: (id: string) => api.delete(`/drivers/assignments/${id}`),
};



