import { useState, useEffect } from 'react';
import { settingsApi, EmailConfig } from '../services/settingsApi';
import { useToast } from '../hooks/useToast';

export default function Settings() {
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await settingsApi.getEmailConfig();
      setEmailConfig(response.data);
    } catch (err: any) {
      error(err.response?.data?.error || 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const smtpPasswordValue = (formData.get('smtpPassword') as string)?.trim() || '';
    
    const data = {
      smtpHost: formData.get('smtpHost') as string,
      smtpPort: parseInt(formData.get('smtpPort') as string),
      smtpSecure: formData.get('smtpSecure') === 'true',
      smtpUser: formData.get('smtpUser') as string,
      smtpPassword: smtpPasswordValue || (emailConfig ? '***' : undefined),
      emailFrom: formData.get('emailFrom') as string,
      emailTo: formData.get('emailTo') as string,
      alertDaysBefore: parseInt(formData.get('alertDaysBefore') as string),
      isEnabled: formData.get('isEnabled') === 'on',
    };

    // Validar que password é obrigatória se não existe config
    if (!data.smtpPassword && !emailConfig) {
      error('Password SMTP é obrigatória ao criar uma nova configuração');
      return;
    }

    try {
      setSaving(true);
      const response = await settingsApi.saveEmailConfig(data as any);
      setEmailConfig(response.data);
      success('Configuração de email salva com sucesso!');
    } catch (err: any) {
      error(err.response?.data?.error || 'Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      await settingsApi.testEmailConfig();
      success('Email de teste enviado! Verifique a sua caixa de entrada.');
      await loadConfig(); // Recarregar para atualizar lastTestDate
    } catch (err: any) {
      error(err.response?.data?.error || err.response?.data?.details || 'Erro ao enviar email de teste');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">A carregar configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
        <p className="text-gray-600 mt-1">Gerir configurações do sistema</p>
      </div>

      {/* Configurações de Email */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Notificações por Email</h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure o servidor SMTP para receber alertas de inspeções
            </p>
          </div>
          {emailConfig?.testEmailSent && emailConfig.lastTestDate && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Último teste:</p>
              <p className="text-sm font-medium text-green-600">
                {new Date(emailConfig.lastTestDate).toLocaleString('pt-PT')}
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SMTP Host */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMTP Host *
              </label>
              <input
                type="text"
                name="smtpHost"
                required
                defaultValue={emailConfig?.smtpHost || 'smtp.gmail.com'}
                placeholder="smtp.gmail.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ex: smtp.gmail.com, smtp.outlook.com
              </p>
            </div>

            {/* SMTP Port */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMTP Port *
              </label>
              <input
                type="number"
                name="smtpPort"
                required
                min="1"
                max="65535"
                defaultValue={emailConfig?.smtpPort || 587}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Geralmente 587 (TLS) ou 465 (SSL)
              </p>
            </div>

            {/* SMTP User */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email SMTP (Utilizador) *
              </label>
              <input
                type="email"
                name="smtpUser"
                required
                defaultValue={emailConfig?.smtpUser || ''}
                placeholder="seu-email@gmail.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* SMTP Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password SMTP *
              </label>
              <input
                type="password"
                name="smtpPassword"
                required={!emailConfig}
                defaultValue=""
                placeholder={emailConfig ? 'Deixe em branco para manter a password atual' : 'Password ou App Password'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {emailConfig?.smtpPassword === '***' 
                  ? 'Deixe em branco para manter a password atual'
                  : 'Para Gmail, use uma App Password'}
              </p>
            </div>

            {/* Email From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email de Origem *
              </label>
              <input
                type="email"
                name="emailFrom"
                required
                defaultValue={emailConfig?.emailFrom || ''}
                placeholder="noreply@guidedportugal.tech"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Email To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email de Destino (Alertas) *
              </label>
              <input
                type="email"
                name="emailTo"
                required
                defaultValue={emailConfig?.emailTo || ''}
                placeholder="alertas@empresa.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email que receberá os alertas de inspeções
              </p>
            </div>

            {/* Alert Days Before */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dias Antes do Vencimento *
              </label>
              <input
                type="number"
                name="alertDaysBefore"
                required
                min="1"
                max="365"
                defaultValue={emailConfig?.alertDaysBefore || 30}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enviar alerta quando faltarem X dias para o vencimento
              </p>
            </div>

            {/* SMTP Secure */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="smtpSecure"
                id="smtpSecure"
                defaultChecked={emailConfig?.smtpSecure || false}
                value="true"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="smtpSecure" className="ml-2 block text-sm text-gray-700">
                Usar SSL/TLS (Secure)
              </label>
            </div>

            {/* Is Enabled */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isEnabled"
                id="isEnabled"
                defaultChecked={emailConfig?.isEnabled !== false}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isEnabled" className="ml-2 block text-sm text-gray-700">
                Ativar notificações por email
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'A guardar...' : 'Guardar Configuração'}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !emailConfig?.isEnabled}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? 'A enviar...' : 'Enviar Email de Teste'}
            </button>
          </div>
        </form>

        {/* Informações de Ajuda */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Dicas de Configuração</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li><strong>Gmail:</strong> Use uma "App Password" em vez da password normal. Ative a verificação em 2 passos primeiro.</li>
            <li><strong>Outlook/Hotmail:</strong> Use smtp-mail.outlook.com na porta 587.</li>
            <li><strong>Porta 587:</strong> Usa TLS (recomendado). Marque "Usar SSL/TLS" como false.</li>
            <li><strong>Porta 465:</strong> Usa SSL. Marque "Usar SSL/TLS" como true.</li>
            <li>Teste sempre a configuração antes de ativar as notificações.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

