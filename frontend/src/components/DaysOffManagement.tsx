import { useEffect, useState } from 'react';
import { driversApi, Driver } from '../services/driversApi';
import { schedulesApi, WeeklyDayOff } from '../services/schedulesApi';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';

function getLisbonDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getSunday(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - value.getUTCDay());
  return value.toISOString().split('T')[0];
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: 'Europe/Lisbon' });
}

export default function DaysOffManagement() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [daysOff, setDaysOff] = useState<WeeklyDayOff[]>([]);
  const [weekStart, setWeekStart] = useState(() => getSunday(getLisbonDate()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${weekStart}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().split('T')[0];
  });
  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [driversResponse, daysOffResponse] = await Promise.all([
          driversApi.getAll(true),
          schedulesApi.getDaysOff(weekStart),
        ]);
        setDrivers(driversResponse.data);
        setDaysOff(daysOffResponse.data);
      } catch (error) {
        console.error('Erro ao carregar folgas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [weekStart]);

  const toggleDayOff = (driverId: string, dayOfWeek: number) => {
    setDaysOff(current => {
      const existing = current.find(item => item.driverId === driverId && item.dayOfWeek === dayOfWeek);
      if (existing) return current.filter(item => item.id !== existing.id);
      return [...current, { id: `new-${driverId}-${dayOfWeek}`, driverId, weekStart, dayOfWeek }];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await schedulesApi.saveDaysOff({
        weekStart,
        entries: drivers.map(driver => ({
          driverId: driver.id,
          days: daysOff.filter(item => item.driverId === driver.id).map(item => item.dayOfWeek),
        })),
      });
      alert('Folgas semanais guardadas com sucesso!');
      const response = await schedulesApi.getDaysOff(weekStart);
      setDaysOff(response.data);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao guardar folgas semanais');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const escapeHTML = (value: string) => value.replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character] || character);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Folgas semanais - ${formatDate(weekDates[0])} a ${formatDate(weekDates[6])}</title>
        <style>
          * { box-sizing: border-box; }
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: Arial, sans-serif; color: #111; }
          header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 18px; }
          h1 { font-size: 21px; margin: 0 0 6px; }
          .period { font-size: 13px; color: #444; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { border: 1px solid #111; padding: 7px; }
          th { background: #f0f0f0; font-size: 11px; }
          td { font-size: 11px; height: 12mm; }
          th:first-child, td:first-child { width: 25%; text-align: left; }
          th:not(:first-child), td:not(:first-child) { text-align: center; width: 10.7%; }
          .off { font-weight: bold; color: #087f5b; }
          footer { margin-top: 14px; text-align: center; color: #666; font-size: 9px; }
        </style>
      </head>
      <body>
        <header>
          <h1>Folgas semanais dos motoristas</h1>
          <div class="period">${formatDate(weekDates[0])} a ${formatDate(weekDates[6])}</div>
        </header>
        <table>
          <thead>
            <tr>
              <th>Motorista</th>
              ${dayLabels.map((label, index) => `<th>${label}<br>${formatDate(weekDates[index])}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${drivers.map(driver => `
              <tr>
                <td>${escapeHTML(driver.name)}</td>
                ${dayLabels.map((_, index) => {
                  const isDayOff = daysOff.some(item => item.driverId === driver.id && item.dayOfWeek === index);
                  return `<td class="${isDayOff ? 'off' : ''}">${isDayOff ? 'FOLGA' : '-'}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <footer>Gerado em ${new Date().toLocaleString('pt-PT')}</footer>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
        <div>
          <h1 className="title-2">Folgas dos Motoristas</h1>
          <p className="text-sm text-gray-500">Defina os dias de folga para cada motorista.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Input label="Domingo da semana" type="date" value={weekStart} onChange={event => setWeekStart(getSunday(event.target.value))} className="w-auto" />
          <Button onClick={handlePrint} disabled={loading || drivers.length === 0} className="bg-[var(--green)]">Imprimir / PDF</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">A carregar...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem]">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-3 text-left text-sm font-semibold">Motorista</th>
                  {dayLabels.map((label, index) => (
                    <th key={label} className="px-3 py-3 text-center text-sm font-semibold">
                      {label}<span className="block text-xs text-gray-400">{formatDate(weekDates[index])}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drivers.map(driver => (
                  <tr key={driver.id} className="border-b last:border-0">
                    <td className="px-3 py-3 text-sm font-medium">{driver.name}</td>
                    {dayLabels.map((_, index) => {
                      const selected = daysOff.some(item => item.driverId === driver.id && item.dayOfWeek === index);
                      return (
                        <td key={index} className="px-3 py-3 text-center">
                          <button type="button" onClick={() => toggleDayOff(driver.id, index)} className={`w-9 h-9 rounded-full text-sm font-semibold ${selected ? 'bg-[var(--green)] text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`} aria-label={`${selected ? 'Remover' : 'Marcar'} folga de ${driver.name} ${dayLabels[index]}`}>
                            {selected ? 'F' : '-'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && drivers.length === 0 && <div className="p-8 text-center text-gray-500">Nenhum motorista ativo encontrado.</div>}
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'A guardar...' : 'Guardar Folgas'}</Button>
      </div>
    </div>
  );
}
