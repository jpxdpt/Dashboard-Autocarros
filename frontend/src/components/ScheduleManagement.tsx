import { useState, useEffect } from 'react';
import { busesApi, Bus } from '../services/api';
import { driversApi, Driver } from '../services/driversApi';
import { schedulesApi, Schedule, ScheduleInput } from '../services/schedulesApi';
import { authService } from '../services/auth';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';

function ScheduleManagement() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formEntries, setFormEntries] = useState<ScheduleInput[]>([
    { date: new Date().toISOString().split('T')[0], driverId: '', busId: '', service: '' }
  ]);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const user = authService.getUser();
    if (user?.name) {
      setUserName(user.name);
    }
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [busesRes, driversRes, schedulesRes] = await Promise.all([
        busesApi.getAll(),
        driversApi.getAll(true),
        schedulesApi.getAll({ date: selectedDate })
      ]);
      setBuses(busesRes.data);
      setDrivers(driversRes.data);
      setSchedules(schedulesRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = () => {
    setFormEntries(prev => [
      ...prev,
      { date: selectedDate, driverId: '', busId: '', service: '' }
    ]);
  };

  const handleRemoveEntry = (index: number) => {
    setFormEntries(formEntries.filter((_, i) => i !== index));
  };

  const handleEntryChange = (index: number, field: keyof ScheduleInput, value: string) => {
    setFormEntries(prev => prev.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry
    ));
  };

  const handleSaveAll = async () => {
    const validEntries = formEntries
      .filter(e => e.driverId && e.busId && e.service)
      .map(e => ({ ...e, date: selectedDate }));

    const incompleteCount = formEntries.length - validEntries.length;
    if (incompleteCount > 0) {
      alert(`Atenção: ${incompleteCount} linha(s) incompleta(s) não serão gravadas. Preencha motorista, viatura e serviço em todas as linhas.`);
    }

    if (validEntries.length === 0) {
      alert('Preencha pelo menos uma escala completa');
      return;
    }

    setSaving(true);
    try {
      await schedulesApi.createBulk(validEntries);
      alert('Escalas guardadas com sucesso!');
      setFormEntries([{ date: selectedDate, driverId: '', busId: '', service: '' }]);
      setShowForm(false);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao guardar escalas');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja eliminar esta escala?')) return;
    try {
      await schedulesApi.delete(id);
      loadData();
    } catch (error) {
      alert('Erro ao eliminar escala');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = generatePrintHTML();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const generatePrintHTML = () => {
    const formattedDate = new Date(selectedDate).toLocaleDateString('pt-PT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Escala de Serviço - ${formattedDate}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
          .header h1 { font-size: 24px; margin-bottom: 10px; }
          .header .date { font-size: 18px; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 12px; text-align: left; }
          th { background-color: #f0f0f0; font-weight: bold; }
          td { font-size: 14px; }
          .序号 { width: 50px; text-align: center; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          @media print {
            body { padding: 0; }
            .header { margin-bottom: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Escala de Serviço</h1>
          <div class="date">${userName || 'Utilizador'} - ${formattedDate}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th class="序号">#</th>
              <th>Motorista</th>
              <th>Matrícula</th>
              <th>Serviço</th>
            </tr>
          </thead>
          <tbody>
            ${schedules.map((s, i) => `
              <tr>
                <td class="序号">${i + 1}</td>
                <td>${s.driver?.name || '-'}</td>
                <td>${s.bus?.matricula || '-'}</td>
                <td>${s.service}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          Gerado em ${new Date().toLocaleString('pt-PT')}
        </div>
      </body>
      </html>
    `;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <h1 className="title-2">Escalas Diárias</h1>
        <div className="flex flex-wrap gap-3">
          <Input
            label="Data"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          <Button
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancelar' : 'Nova Escala'}
          </Button>
          {schedules.length > 0 && (
            <Button
              onClick={handlePrint}
              className="bg-[var(--green)]"
            >
              Imprimir / PDF
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Criar Escalas para {formatDate(selectedDate)}</h2>
          <div className="space-y-4 overflow-x-auto">
            {formEntries.map((entry, index) => (
              <div key={index} className="flex min-w-[42rem] gap-3 items-start p-3 bg-gray-50 rounded-lg">
                <select
                  value={entry.driverId}
                  onChange={(e) => handleEntryChange(index, 'driverId', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                >
                  <option value="">Selecionar Motorista</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <select
                  value={entry.busId}
                  onChange={(e) => handleEntryChange(index, 'busId', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                >
                  <option value="">Selecionar Viatura</option>
                  {buses.map(b => (
                    <option key={b.id} value={b.id}>{b.matricula}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Serviço"
                  value={entry.service}
                  onChange={(e) => handleEntryChange(index, 'service', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                />
                {formEntries.length > 1 && (
                  <button
                    onClick={() => handleRemoveEntry(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAddEntry}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded"
            >
              + Adicionar Linha
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Todas as Escalas'}
            </button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold">Escalas de {formatDate(selectedDate)}</h2>
          <p className="text-sm text-gray-500">{schedules.length} escala(s) registada(s)</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">A carregar...</div>
        ) : schedules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhuma escala registada para esta data.
            <br />
            Clique em "Nova Escala" para criar.
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">#</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Motorista</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Matrícula</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Serviço</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule, index) => (
                <tr key={schedule.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{index + 1}</td>
                  <td className="px-4 py-3 text-sm">{schedule.driver?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{schedule.bus?.matricula || '-'}</td>
                  <td className="px-4 py-3 text-sm">{schedule.service}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default ScheduleManagement;
