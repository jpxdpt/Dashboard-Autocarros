import { useState, useEffect, useMemo } from 'react';
import { Bus, InspectionType, Inspection, busesApi, inspectionsApi } from '../services/api';
import { authService } from '../services/auth';
import BusTable from './BusTable';
import BusCard from './BusCard';
import BusForm from './BusForm';
import InspectionForm from './InspectionForm';
import MileageManagement from './MileageManagement';
import DriversManagement from './DriversManagement';
import BusesTab from './BusesTab';
import Settings from './Settings';
import { ToastContainer } from './Toast';
import { useToast } from '../hooks/useToast';

type ViewMode = 'table' | 'cards';
type FilterStatus = 'all' | 'ok' | 'warning' | 'expired';
type TabType = 'buses' | 'drivers' | 'settings';

export default function Dashboard() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showBusForm, setShowBusForm] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | undefined>();
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [selectedBus, setSelectedBus] = useState<Bus | undefined>();
  const [selectedInspectionType, setSelectedInspectionType] = useState<InspectionType | undefined>();
  const [editingInspection, setEditingInspection] = useState<Inspection | undefined>();
  
  // Busca e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterInspectionType, setFilterInspectionType] = useState<InspectionType | 'all'>('all');
  const [activeTab, setActiveTab] = useState<TabType>('buses');
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [selectedBusForMileage, setSelectedBusForMileage] = useState<Bus | undefined>();
  
  const { toasts, success, error, removeToast } = useToast();

  useEffect(() => {
    loadBuses();
  }, []);

  const loadBuses = async () => {
    try {
      setLoading(true);
      const response = await busesApi.getAll();
      setBuses(response.data);
    } catch (err: any) {
      console.error('Erro ao carregar autocarros:', err);
      if (err.response?.status === 401) {
        authService.logout();
      } else {
        error(err.response?.data?.error || 'Erro ao carregar autocarros');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddBus = () => {
    setEditingBus(undefined);
    setShowBusForm(true);
  };

  const handleEditBus = (bus: Bus) => {
    setEditingBus(bus);
    setShowBusForm(true);
  };

  const handleSaveBus = async (matricula: string) => {
    try {
      if (editingBus) {
        await busesApi.update(editingBus.id, matricula);
        success('Autocarro atualizado com sucesso!');
      } else {
        await busesApi.create(matricula);
        success('Autocarro adicionado com sucesso!');
      }
      setShowBusForm(false);
      setEditingBus(undefined);
      loadBuses();
    } catch (err: any) {
      console.error('Erro ao salvar autocarro:', err);
      if (err.response?.status === 401) {
        authService.logout();
      } else {
        error(err.response?.data?.error || 'Erro ao salvar autocarro');
      }
    }
  };

  const handleDeleteBus = async (id: string) => {
    if (!confirm('Tem a certeza que deseja remover este autocarro?')) {
      return;
    }

    try {
      await busesApi.delete(id);
      success('Autocarro removido com sucesso!');
      loadBuses();
    } catch (err: any) {
      console.error('Erro ao remover autocarro:', err);
      if (err.response?.status === 401) {
        authService.logout();
      } else {
        error(err.response?.data?.error || 'Erro ao remover autocarro');
      }
    }
  };

  const handleInspectionClick = (bus: Bus, type: InspectionType) => {
    const existingInspection = bus.inspections.find((insp) => insp.type === type);
    setSelectedBus(bus);
    setSelectedInspectionType(type);
    setEditingInspection(existingInspection);
    setShowInspectionForm(true);
  };

  const handleSaveInspection = async (data: {
    busId: string;
    type: InspectionType;
    lastInspectionDate: string;
    nextInspectionDate?: string | null;
    notes?: string | null;
  }) => {
    try {
      if (editingInspection) {
        await inspectionsApi.update(editingInspection.id, {
          lastInspectionDate: data.lastInspectionDate,
          nextInspectionDate: data.nextInspectionDate,
          notes: data.notes,
        });
        success('Inspeção atualizada com sucesso!');
      } else {
        await inspectionsApi.create(data);
        success('Inspeção registada com sucesso!');
      }
      setShowInspectionForm(false);
      setSelectedBus(undefined);
      setSelectedInspectionType(undefined);
      setEditingInspection(undefined);
      loadBuses();
    } catch (err: any) {
      console.error('Erro ao salvar inspeção:', err);
      if (err.response?.status === 401) {
        authService.logout();
      } else {
        error(err.response?.data?.error || 'Erro ao salvar inspeção');
      }
    }
  };

  const calculateStats = () => {
    const totalBuses = buses.length;
    let expiredCount = 0;
    let warningCount = 0;

    buses.forEach((bus) => {
      bus.inspections.forEach((inspection) => {
        if (!inspection.nextInspectionDate) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextDate = new Date(inspection.nextInspectionDate);
        nextDate.setHours(0, 0, 0, 0);

        const diffTime = nextDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          expiredCount++;
        } else if (diffDays <= 30) {
          warningCount++;
        }
      });
    });

    return { totalBuses, expiredCount, warningCount };
  };

  const stats = calculateStats();

  // Filtrar autocarros baseado na busca e filtros
  const filteredBuses = useMemo(() => {
    return buses.filter((bus) => {
      // Busca por matrícula
      if (searchTerm && !bus.matricula.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Filtro por tipo de inspeção
      if (filterInspectionType !== 'all') {
        const hasInspectionType = bus.inspections.some(
          (insp) => insp.type === filterInspectionType
        );
        if (!hasInspectionType) return false;
      }

      // Filtro por status
      if (filterStatus !== 'all') {
        const hasMatchingStatus = bus.inspections.some((inspection) => {
          if (!inspection.nextInspectionDate) return filterStatus === 'ok';
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const nextDate = new Date(inspection.nextInspectionDate);
          nextDate.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays < 0) return filterStatus === 'expired';
          if (diffDays <= 30) return filterStatus === 'warning';
          return filterStatus === 'ok';
        });
        if (!hasMatchingStatus) return false;
      }

      return true;
    });
  }, [buses, searchTerm, filterStatus, filterInspectionType]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">A carregar autocarros...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Dashboard de Manutenção
              </h1>
              <p className="text-gray-600 mt-1">Gestão completa de autocarros e condutores</p>
              {authService.getUser() && (
                <p className="text-sm text-gray-500 mt-1">
                  {authService.getUser()?.name} • {authService.getCompany()?.name}
                </p>
              )}
            </div>
            <div className="flex gap-3 items-center">
              {activeTab === 'buses' && (
                <button
                  onClick={handleAddBus}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
                >
                  + Adicionar Autocarro
                </button>
              )}
              <button
                onClick={() => authService.logout()}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Sair"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('buses')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'buses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Autocarros
            </button>
            <button
              onClick={() => setActiveTab('drivers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'drivers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Condutores
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ⚙️ Configurações
            </button>
          </nav>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'buses' ? (
        <BusesTab
          buses={buses}
          filteredBuses={filteredBuses}
          loading={loading}
          viewMode={viewMode}
          setViewMode={setViewMode}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterInspectionType={filterInspectionType}
          setFilterInspectionType={setFilterInspectionType}
          stats={stats}
          handleAddBus={handleAddBus}
          handleEditBus={handleEditBus}
          handleDeleteBus={handleDeleteBus}
          handleInspectionClick={handleInspectionClick}
          onMileageClick={(bus) => {
            setSelectedBusForMileage(bus);
            setShowMileageModal(true);
          }}
        />
      ) : activeTab === 'drivers' ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DriversManagement />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Settings />
        </div>
      )}

      {/* Modals */}
      {showMileageModal && selectedBusForMileage && (
        <MileageManagement
          bus={selectedBusForMileage}
          onClose={() => {
            setShowMileageModal(false);
            setSelectedBusForMileage(undefined);
            loadBuses();
          }}
        />
      )}

      {/* Modals */}
      {showBusForm && (
        <BusForm
          bus={editingBus}
          onSave={handleSaveBus}
          onCancel={() => {
            setShowBusForm(false);
            setEditingBus(undefined);
          }}
        />
      )}

      {showInspectionForm && selectedBus && selectedInspectionType && (
        <InspectionForm
          bus={selectedBus}
          inspectionType={selectedInspectionType}
          inspection={editingInspection}
          onSave={handleSaveInspection}
          onCancel={() => {
            setShowInspectionForm(false);
            setSelectedBus(undefined);
            setSelectedInspectionType(undefined);
            setEditingInspection(undefined);
          }}
        />
      )}
    </div>
  );
}

