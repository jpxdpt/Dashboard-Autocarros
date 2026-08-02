import { Bus, InspectionType } from '../services/api';
import BusTable from './BusTable';
import BusCard from './BusCard';
import Card from './ui/Card';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';

interface BusesTabProps {
  buses: Bus[];
  filteredBuses: Bus[];
  loading: boolean;
  viewMode: 'table' | 'cards';
  setViewMode: (mode: 'table' | 'cards') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: 'all' | 'ok' | 'warning' | 'expired';
  setFilterStatus: (status: 'all' | 'ok' | 'warning' | 'expired') => void;
  filterInspectionType: InspectionType | 'all';
  setFilterInspectionType: (type: InspectionType | 'all') => void;
  stats: { totalBuses: number; expiredCount: number; warningCount: number };
  handleAddBus: () => void;
  handleEditBus: (bus: Bus) => void;
  handleDeleteBus: (id: string) => void;
  handleInspectionClick: (bus: Bus, type: InspectionType) => void;
  onMileageClick: (bus: Bus) => void;
}

const selectClasses =
  'block w-full px-3.5 py-2.5 rounded-xl bg-surface text-label text-[14px] border border-separator outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 transition-shadow';

export default function BusesTab({
  buses,
  filteredBuses,
  loading: _loading,
  viewMode,
  setViewMode,
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  filterInspectionType,
  setFilterInspectionType,
  stats,
  handleAddBus,
  handleEditBus,
  handleDeleteBus,
  handleInspectionClick,
  onMileageClick,
}: BusesTabProps) {
  const kpis = [
    {
      label: 'Total de Autocarros',
      value: stats.totalBuses,
      valueClass: 'text-label',
      iconBg: 'bg-accent/15 text-accent',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      label: 'Próximas do Vencimento',
      value: stats.warningCount,
      valueClass: 'text-[var(--orange)]',
      iconBg: 'bg-[var(--orange)]/15 text-[var(--orange)]',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Expiradas',
      value: stats.expiredCount,
      valueClass: 'text-[var(--red)]',
      iconBg: 'bg-[var(--red)]/15 text-[var(--red)]',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="footnote">{kpi.label}</p>
                <p className={`display-1 mt-1 ${kpi.valueClass}`}>{kpi.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-full flex items-center justify-center ${kpi.iconBg}`}>
                {kpi.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Busca e Filtros */}
      <Card className="p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Busca */}
          <div className="md:col-span-2">
            <label htmlFor="search" className="footnote block mb-1.5">
              Buscar por matrícula
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-label-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ex: AB-12-CD"
                className="block w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface text-label text-[14px] border border-separator placeholder:text-label-tertiary outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 transition-shadow"
              />
            </div>
          </div>

          {/* Filtro por Status */}
          <div>
            <label htmlFor="status-filter" className="footnote block mb-1.5">
              Status
            </label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'ok' | 'warning' | 'expired')}
              className={selectClasses}
            >
              <option value="all">Todos</option>
              <option value="ok">OK</option>
              <option value="warning">Próximas</option>
              <option value="expired">Expiradas</option>
            </select>
          </div>

          {/* Filtro por Tipo de Inspeção */}
          <div>
            <label htmlFor="type-filter" className="footnote block mb-1.5">
              Tipo de Inspeção
            </label>
            <select
              id="type-filter"
              value={filterInspectionType}
              onChange={(e) => setFilterInspectionType(e.target.value as InspectionType | 'all')}
              className={selectClasses}
            >
              <option value="all">Todos</option>
              <option value={InspectionType.EXTINTORES}>Extintores</option>
              <option value={InspectionType.PNEUS}>Pneus</option>
              <option value={InspectionType.REVISOES}>Revisões</option>
              <option value={InspectionType.LICENCAS_TCC}>Licenças TCC</option>
              <option value={InspectionType.LICENCAS_COMUNITARIAS}>Licenças Comunitárias</option>
              <option value={InspectionType.INSPECOES}>Inspeções</option>
              <option value={InspectionType.INSPECOES_EXTRAORDINARIAS}>Inspeções Extraordinárias</option>
            </select>
          </div>
        </div>

        {/* Botão limpar filtros */}
        {(searchTerm || filterStatus !== 'all' || filterInspectionType !== 'all') && (
          <div className="mt-4">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setFilterInspectionType('all');
              }}
              className="text-[14px] text-accent hover:underline font-medium"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </Card>

      {/* View Mode Toggle */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="title-2">
          Autocarros {filteredBuses.length !== buses.length && `(${filteredBuses.length} de ${buses.length})`}
        </h2>
        <div className="inline-flex p-0.5 rounded-xl bg-fill">
          {(['table', 'cards'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1.5 rounded-[10px] text-[14px] font-medium transition-all duration-150 active:scale-[0.98] ${
                viewMode === mode ? 'bg-surface shadow-sm text-label' : 'text-label-secondary'
              }`}
            >
              {mode === 'table' ? 'Tabela' : 'Cards'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filteredBuses.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="Nenhum autocarro encontrado"
            message={
              searchTerm || filterStatus !== 'all' || filterInspectionType !== 'all'
                ? 'Tente ajustar os filtros de busca.'
                : 'Comece adicionando um novo autocarro.'
            }
            action={
              !searchTerm && filterStatus === 'all' && filterInspectionType === 'all' ? (
                <Button onClick={handleAddBus}>Adicionar Autocarro</Button>
              ) : undefined
            }
          />
        </Card>
      ) : viewMode === 'table' ? (
        <BusTable
          buses={filteredBuses}
          onEdit={handleEditBus}
          onDelete={handleDeleteBus}
          onInspectionClick={handleInspectionClick}
          onMileageClick={onMileageClick}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBuses.map((bus) => (
            <BusCard
              key={bus.id}
              bus={bus}
              onEdit={handleEditBus}
              onDelete={handleDeleteBus}
              onInspectionClick={handleInspectionClick}
              onMileageClick={onMileageClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
