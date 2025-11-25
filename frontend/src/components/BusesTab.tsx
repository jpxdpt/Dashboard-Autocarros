import { Bus, InspectionType } from '../services/api';
import BusTable from './BusTable';
import BusCard from './BusCard';

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
  handleAddBus: _handleAddBus,
  handleEditBus,
  handleDeleteBus,
  handleInspectionClick,
  onMileageClick,
}: BusesTabProps) {
  return (
    <>
      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Autocarros</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBuses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Próximas do Vencimento</p>
                <p className="text-2xl font-bold text-gray-900">{stats.warningCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expiradas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.expiredCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Busca e Filtros */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Busca */}
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Buscar por matrícula
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ex: AB-12-CD"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Filtro por Status */}
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'ok' | 'warning' | 'expired')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">Todos</option>
                <option value="ok">OK</option>
                <option value="warning">Próximas</option>
                <option value="expired">Expiradas</option>
              </select>
            </div>

            {/* Filtro por Tipo de Inspeção */}
            <div>
              <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Inspeção
              </label>
              <select
                id="type-filter"
                value={filterInspectionType}
                onChange={(e) => setFilterInspectionType(e.target.value as InspectionType | 'all')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">Todos</option>
                <option value={InspectionType.EXTINTORES}>Extintores</option>
                <option value={InspectionType.PNEUS}>Pneus</option>
                <option value={InspectionType.REVISOES}>Revisões</option>
                <option value={InspectionType.LICENCAS_TCC}>Licenças TCC</option>
                <option value={InspectionType.LICENCAS_COMUNITARIAS}>Licenças Comunitárias</option>
                <option value={InspectionType.INSPECOES}>Inspeções</option>
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
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Autocarros {filteredBuses.length !== buses.length && `(${filteredBuses.length} de ${buses.length})`}
          </h2>
          <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Tabela
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-md transition-colors ${
                viewMode === 'cards'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Cards
            </button>
          </div>
        </div>

        {/* Content */}
        {filteredBuses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum autocarro encontrado</h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchTerm || filterStatus !== 'all' || filterInspectionType !== 'all'
                ? 'Tente ajustar os filtros de busca.'
                : 'Comece adicionando um novo autocarro.'}
            </p>
          </div>
        ) : viewMode === 'table' ? (
          <BusTable
            buses={filteredBuses}
            onEdit={handleEditBus}
            onDelete={handleDeleteBus}
            onInspectionClick={handleInspectionClick}
            onMileageClick={onMileageClick}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </>
  );
}



