import api from './api';

export interface EmailConfig {
  id: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string | null; // '***' se já configurada, null se não
  emailFrom: string;
  emailTo: string;
  alertDaysBefore: number;
  isEnabled: boolean;
  testEmailSent: boolean;
  lastTestDate: string | null;
}

export const settingsApi = {
  getEmailConfig: () => api.get<EmailConfig | null>('/settings/email'),
  
  saveEmailConfig: (data: {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPassword: string;
    emailFrom: string;
    emailTo: string;
    alertDaysBefore: number;
    isEnabled: boolean;
  }) => api.post<EmailConfig>('/settings/email', data),
  
  testEmailConfig: () => api.post<{ message: string }>('/settings/email/test'),
};



