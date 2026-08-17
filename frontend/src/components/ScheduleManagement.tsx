import { useState, useEffect } from 'react';
import { busesApi, Bus } from '../services/api';
import { driversApi, Driver } from '../services/driversApi';
import { schedulesApi, Schedule, ScheduleInput, WeeklyDayOff } from '../services/schedulesApi';
import { authService } from '../services/auth';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';

function ScheduleManagement() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [daysOff, setDaysOff] = useState<WeeklyDayOff[]>([]);
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
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date().toISOString().split('T')[0]));
  const [savingDaysOff, setSavingDaysOff] = useState(false);
  const [showDaysOff, setShowDaysOff] = useState(false);

  function getMonday(date: string) {
    const value = new Date(`${date}T00:00:00`);
    const day = value.getDay();
    value.setDate(value.getDate() - (day === 0 ? 6 : day - 1));
    return value.toISOString().split('T')[0];
  }

  const daysOffDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${weekStart}T00:00:00`);
    date.setDate(date.getDate() + index);
    return date.toISOString().split('T')[0];
  });

  const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  const getWeekDates = (dateStr: string) => {
    const date = new Date(`${dateStr}T00:00:00`);
    date.setDate(date.getDate() - date.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const weekDate = new Date(date);
      weekDate.setDate(date.getDate() + index);
      return weekDate.toISOString().split('T')[0];
    });
  };

  const scheduleWeekDates = getWeekDates(selectedDate);
  const scheduleWeekStart = scheduleWeekDates[0];
  const scheduleWeekEnd = scheduleWeekDates[6];

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
      const [busesRes, driversRes, schedulesRes, daysOffRes] = await Promise.all([
        busesApi.getAll(),
        driversApi.getAll(true),
        schedulesApi.getAll({ startDate: scheduleWeekStart, endDate: scheduleWeekEnd }),
        schedulesApi.getDaysOff(weekStart)
      ]);
      setBuses(busesRes.data);
      setDrivers(driversRes.data);
      setSchedules(schedulesRes.data);
      setDaysOff(daysOffRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDayOff = (driverId: string, day: number) => {
    setDaysOff((current) => {
      const existing = current.find((item) => item.driverId === driverId && item.dayOfWeek === day);
      if (existing) return current.filter((item) => item.id !== existing.id);
      return [...current, { id: `new-${driverId}-${day}`, driverId, weekStart, dayOfWeek: day }];
    });
  };

  const handleSaveDaysOff = async () => {
    setSavingDaysOff(true);
    try {
      await schedulesApi.saveDaysOff({
        weekStart,
        entries: drivers.map((driver) => ({
          driverId: driver.id,
          days: daysOff.filter((item) => item.driverId === driver.id).map((item) => item.dayOfWeek),
        })),
      });
      alert('Folgas semanais guardadas com sucesso!');
      const response = await schedulesApi.getDaysOff(weekStart);
      setDaysOff(response.data);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao guardar folgas semanais');
    } finally {
      setSavingDaysOff(false);
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
    const formattedStart = formatDate(scheduleWeekStart);
    const formattedEnd = formatDate(scheduleWeekEnd);
    const escapeHTML = (value: string) => value.replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character] || character);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mapa semanal de serviço - ${formattedStart} a ${formattedEnd}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: Arial, sans-serif; padding: 10px; color: #111; }
          .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h1 { font-size: 20px; margin-bottom: 6px; }
          .header .date { font-size: 13px; color: #333; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { border: 1px solid #000; padding: 5px; text-align: left; vertical-align: top; }
          th { background-color: #f0f0f0; font-weight: bold; }
          td { font-size: 10px; height: 22mm; }
          .day { width: 14.28%; }
          .day-title { display: block; font-size: 11px; margin-bottom: 4px; }
          .entry { border-top: 1px solid #bbb; padding-top: 3px; margin-top: 3px; }
          .entry:first-child { border-top: 0; padding-top: 0; margin-top: 0; }
          .empty { color: #777; }
          .footer { margin-top: 12px; text-align: center; font-size: 9px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Mapa semanal de serviço</h1>
          <div class="date">${escapeHTML(userName || 'Utilizador')} - ${formattedStart} a ${formattedEnd}</div>
        </div>
        <table>
          <thead>
            <tr>
              ${scheduleWeekDates.map(date => `<th class="day">${new Date(`${date}T00:00:00`).toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: '2-digit' })}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              ${scheduleWeekDates.map(date => {
                const daySchedules = schedules.filter(schedule => schedule.date.split('T')[0] === date);
                return `<td class="day">${daySchedules.length ? daySchedules.map(schedule => `<div class="entry"><strong>${escapeHTML(schedule.driver?.name || '-')}</strong><br>${escapeHTML(schedule.bus?.matricula || '-')}<br>${escapeHTML(schedule.service)}</div>`).join('') : '<span class="empty">Sem escalas</span>'}</td>`;
              }).join('')}
            </tr>
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
          <Button onClick={() => setShowDaysOff(!showDaysOff)} className="bg-[var(--green)]">
            {showDaysOff ? 'Fechar Folgas' : 'Folgas Semanais'}
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

      {showDaysOff && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Folgas semanais</h2>
              <p className="text-sm text-gray-500">Selecione os dias de folga de cada motorista.</p>
            </div>
            <Input label="Semana de" type="date" value={weekStart} onChange={(e) => setWeekStart(getMonday(e.target.value))} className="w-auto" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem]">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-3 text-left text-sm font-semibold">Motorista</th>
                  {dayLabels.map((label, index) => <th key={label} className="px-3 py-3 text-center text-sm font-semibold">{label}<span className="block text-xs text-gray-400">{formatDate(daysOffDates[index])}</span></th>)}
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => (
                  <tr key={driver.id} className="border-b">
                    <td className="px-3 py-3 text-sm font-medium">{driver.name}</td>
                    {dayLabels.map((_, index) => {
                      const dayOfWeek = index === 6 ? 0 : index + 1;
                      const selected = daysOff.some((item) => item.driverId === driver.id && item.dayOfWeek === dayOfWeek);
                      return <td key={dayOfWeek} className="px-3 py-3 text-center"><button type="button" onClick={() => toggleDayOff(driver.id, dayOfWeek)} className={`w-9 h-9 rounded-full text-sm font-semibold ${selected ? 'bg-[var(--green)] text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`} aria-label={`${selected ? 'Remover' : 'Marcar'} folga de ${driver.name} ${dayLabels[index]}`}>{selected ? 'F' : '-'}</button></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-4"><Button onClick={handleSaveDaysOff} disabled={savingDaysOff}>{savingDaysOff ? 'A guardar...' : 'Guardar Folgas'}</Button></div>
        </Card>
      )}

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
           <h2 className="font-semibold">Mapa semanal: {formatDate(scheduleWeekStart)} a {formatDate(scheduleWeekEnd)}</h2>
           <p className="text-sm text-gray-500">Semana de domingo a sábado · {schedules.length} escala(s) registada(s)</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">A carregar...</div>
        ) : schedules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
             Nenhuma escala registada para esta semana.
            <br />
            Clique em "Nova Escala" para criar.
          </div>
        ) : (
           <div className="overflow-x-auto">
           <table className="w-full min-w-[40rem]">
             <thead className="bg-gray-50">
               <tr>
                 {scheduleWeekDates.map(date => (
                   <th key={date} className="px-3 py-3 text-left text-sm font-semibold min-w-[10rem]">
                     {new Date(`${date}T00:00:00`).toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                   </th>
                 ))}
               </tr>
             </thead>
             <tbody>
               <tr className="border-t align-top">
                 {scheduleWeekDates.map(date => {
                   const daySchedules = schedules.filter(schedule => schedule.date.split('T')[0] === date);
                   return <td key={date} className="px-3 py-3 text-sm align-top min-w-[10rem]">
                     {daySchedules.length === 0 ? <span className="text-gray-400">Sem escalas</span> : daySchedules.map(schedule => (
                       <div key={schedule.id} className="mb-3 last:mb-0 border-b last:border-0 pb-2 last:pb-0">
                         <div className="font-medium">{schedule.driver?.name || '-'}</div>
                         <div className="text-gray-600">{schedule.bus?.matricula || '-'} · {schedule.service}</div>
                         <button onClick={() => handleDelete(schedule.id)} className="text-red-600 hover:text-red-800 text-xs mt-1">Eliminar</button>
                       </div>
                     ))}
                   </td>;
                 })}
               </tr>
             </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default ScheduleManagement;
