import axios from 'axios';

// Usar variável de ambiente ou fallback para /api (proxy local)
// Se VITE_API_URL já incluir o domínio completo, adicionar /api
const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'GESTOR' | 'OPERADOR';
  companyId: string;
}

export interface Company {
  id: string;
  name: string;
  email?: string;
  subscriptionPlan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  maxBuses: number;
  isActive: boolean;
}

export interface AuthResponse {
  user: User;
  company: Company;
  accessToken: string;
  refreshToken: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  companyName: string;
}

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';
const COMPANY_KEY = 'company_data';

export const authService = {
  // Guardar tokens e dados do utilizador
  setAuth: (data: AuthResponse): void => {
    if (!data.accessToken || !data.refreshToken) {
      console.error('Tentativa de guardar autenticação sem tokens:', data);
      throw new Error('Tokens não fornecidos na resposta de autenticação');
    }
    
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    localStorage.setItem(COMPANY_KEY, JSON.stringify(data.company));
    
    console.log('Autenticação guardada com sucesso');
  },

  // Obter token de acesso
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Obter refresh token
  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  // Obter dados do utilizador
  getUser: (): User | null => {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  // Obter dados da empresa
  getCompany: (): Company | null => {
    const companyStr = localStorage.getItem(COMPANY_KEY);
    return companyStr ? JSON.parse(companyStr) : null;
  },

  // Verificar se está autenticado
  isAuthenticated: (): boolean => {
    return !!authService.getToken();
  },

  // Limpar autenticação
  clearAuth: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(COMPANY_KEY);
  },

  // Login
  login: async (data: LoginData): Promise<AuthResponse> => {
    try {
      const response = await axios.post<AuthResponse>(`${API_URL}/auth/login`, data);
      if (response.data.accessToken && response.data.refreshToken) {
        authService.setAuth(response.data);
      } else {
        throw new Error('Resposta de login inválida: tokens não recebidos');
      }
      return response.data;
    } catch (error: any) {
      console.error('Erro no login:', error);
      throw error;
    }
  },

  // Registo
  register: async (data: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await axios.post<AuthResponse>(`${API_URL}/auth/register`, data);
      if (response.data.accessToken && response.data.refreshToken) {
        authService.setAuth(response.data);
      } else {
        throw new Error('Resposta de registo inválida: tokens não recebidos');
      }
      return response.data;
    } catch (error: any) {
      console.error('Erro no registo:', error);
      throw error;
    }
  },

  // Logout
  logout: (): void => {
    authService.clearAuth();
    window.location.href = '/login';
  },

  // Obter utilizador atual
  getCurrentUser: async (): Promise<{ user: User; company: Company }> => {
    const token = authService.getToken();
    if (!token) {
      console.error('getCurrentUser: Nenhum token encontrado');
      throw new Error('Não autenticado');
    }
    
    console.log('getCurrentUser: Enviando requisição com token');
    
    try {
      const response = await axios.get<{ user: User; company: Company }>(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      console.log('getCurrentUser: Resposta recebida com sucesso');
      
      // Atualizar dados do utilizador e empresa
      if (response.data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
      }
      if (response.data.company) {
        localStorage.setItem(COMPANY_KEY, JSON.stringify(response.data.company));
      }
      
      return response.data;
    } catch (error: any) {
      console.error('getCurrentUser: Erro na requisição:', error.response?.status, error.response?.data);
      throw error;
    }
  },

  // Renovar token
  refreshToken: async (): Promise<{ accessToken: string; refreshToken: string }> => {
    const refreshToken = authService.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${API_URL}/auth/refresh`,
      { refreshToken }
    );

    localStorage.setItem(TOKEN_KEY, response.data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken);

    return response.data;
  },
};

