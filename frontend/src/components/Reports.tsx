import { useState, useEffect } from 'react';
import { reportsApi, ReportFilters, InspectionStats } from '../services/reportsApi';
import { busesApi, Bus, InspectionType } from '../services/api';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const INSPECTION_LABELS: Record<InspectionType, string> = {
  EXTINTORES: 'Extintores',
  PNEUS: 'Pneus',
  REVISOES: 'Revisões',
  LICENCAS_TCC: 'Licenças TCC',
  LICENCAS_COMUNITARIAS: 'Licenças Comunitárias',
  INSPECOES: 'Inspeções',
};

const COLORS = {
  ok: '#10b981',
  warning: '#f59e0b',
  expired: '#ef4444',
};

export default function Reports() {
  const [stats, setStats] = useState<InspectionStats | null>(null);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsResponse, busesResponse] = await Promise.all([
        reportsApi.getStats(filters),
        busesApi.getAll(),
      ]);
      setStats(statsResponse.data);
      setBuses(busesResponse.data);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      alert(error.response?.data?.error || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting('pdf');
      const response = await reportsApi.exportPDF(filters);
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-inspecoes-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Erro ao exportar PDF:', error);
      alert(error.response?.data?.error || 'Erro ao exportar PDF');
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting('excel');
      const response = await reportsApi.exportExcel(filters);
      
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-inspecoes-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Erro ao exportar Excel:', error);
      alert(error.response?.data?.error || 'Erro ao exportar Excel');
    } finally {
      setExporting(null);
    }
  };

  const prepareChartData = () => {
    if (!stats) return [];

    return Object.entries(stats.byType).map(([type, data]) => ({
      name: INSPECTION_LABELS[type as InspectionType],
      OK: data.ok,
      'Próxima': data.warning,
      'Expirada': data.expired,
    }));
  };

  const preparePieData = () => {
    if (!stats) return [];

    return [
      { name: 'OK', value: stats.ok, color: COLORS.ok },
      { name: 'Próxima do Vencimento', value: stats.warning, color: COLORS.warning },
      { name: 'Expirada', value: stats.expired, color: COLORS.expired },
    ];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">A carregar relatórios...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Erro ao carregar estatísticas</div>
      </div>
    );
  }

  const chartData = prepareChartData();
  const pieData = preparePieData();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Relatórios e Análises</h1>
              <p className="text-gray-600 mt-1">Estatísticas e exportação de dados</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExportPDF}
                disabled={exporting === 'pdf'}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting === 'pdf' ? 'A exportar...' : 'Exportar PDF'}
              </button>
              <button
                onClick={handleExportExcel}
                disabled={exporting === 'excel'}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting === 'excel' ? 'A exportar...' : 'Exportar Excel'}
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Autocarros
              </label>
              <select
                multiple
                value={filters.busIds || []}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                  setFilters({ ...filters, busIds: selected.length > 0 ? selected : undefined });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                size={3}
              >
                {buses.map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.matricula}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={() => setFilters({})}
            className="mt-4 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Limpar Filtros
          </button>
        </div>

        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm font-medium text-gray-600">Total de Inspeções</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm font-medium text-gray-600">OK</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{stats.ok}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm font-medium text-gray-600">Próximas do Vencimento</div>
            <div className="text-3xl font-bold text-yellow-600 mt-2">{stats.warning}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm font-medium text-gray-600">Expiradas</div>
            <div className="text-3xl font-bold text-red-600 mt-2">{stats.expired}</div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfico de Barras */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Status por Tipo de Inspeção
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="OK" fill={COLORS.ok} />
                <Bar dataKey="Próxima" fill={COLORS.warning} />
                <Bar dataKey="Expirada" fill={COLORS.expired} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Pizza */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Distribuição Geral</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela Detalhada por Tipo */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Estatísticas por Tipo de Inspeção
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    OK
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Próxima
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expirada
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(stats.byType).map(([type, data]) => (
                  <tr key={type}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {INSPECTION_LABELS[type as InspectionType]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                      {data.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-green-600">
                      {data.ok}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-yellow-600">
                      {data.warning}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-red-600">
                      {data.expired}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}



