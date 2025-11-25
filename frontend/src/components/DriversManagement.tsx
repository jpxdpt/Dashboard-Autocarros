import { useState, useEffect } from 'react';
import { driversApi, Driver } from '../services/driversApi';
import { busesApi, Bus } from '../services/api';
import { useToast } from '../hooks/useToast';

type DriverFilter = 'all' | 'expired-license' | 'expiring-license' | 'with-assignments' | 'without-assignments';

export default function DriversManagement() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [showLicenseForm, setShowLicenseForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | undefined>();
  const [selectedDriver, setSelectedDriver] = useState<Driver | undefined>();
  const [filter, setFilter] = useState<DriverFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { success, error } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [driversRes, busesRes] = await Promise.all([
        driversApi.getAll(true),
        busesApi.getAll(),
      ]);
      setDrivers(driversRes.data);
      setBuses(busesRes.data);
    } catch (err: any) {
      error(err.response?.data?.error || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const filterDriver = (driver: Driver): boolean => {
    // Filtro de busca
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesName = driver.name.toLowerCase().includes(search);
      const matchesLicense = driver.licenseNumber.toLowerCase().includes(search);
      const matchesEmail = driver.email?.toLowerCase().includes(search);
      if (!matchesName && !matchesLicense && !matchesEmail) {
        return false;
      }
    }

    // Filtro por licença expirada
    if (filter === 'expired-license') {
      const hasExpiredLicense = driver.licenses?.some(l => {
        const expiryDate = new Date(l.expiryDate);
        return expiryDate < new Date();
      });
      if (!hasExpiredLicense) return false;
    }

    // Filtro por licença a expirar
    if (filter === 'expiring-license') {
      const hasExpiringLicense = driver.licenses?.some(l => {
        const expiryDate = new Date(l.expiryDate);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 90 && daysUntilExpiry >= 0;
      });
      if (!hasExpiringLicense) return false;
    }

    // Filtro por atribuições
    const activeAssignments = driver.assignments?.filter(a => !a.unassignedAt) || [];
    if (filter === 'with-assignments' && activeAssignments.length === 0) {
      return false;
    }
    if (filter === 'without-assignments' && activeAssignments.length > 0) {
      return false;
    }

    return true;
  };

  const filteredDrivers = drivers.filter(filterDriver);

  const handleSaveDriver = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      licenseNumber: formData.get('licenseNumber') as string,
      licenseCategory: formData.get('licenseCategory') as string,
      phone: formData.get('phone') as string || null,
      email: formData.get('email') as string || null,
      address: formData.get('address') as string || null,
      hireDate: formData.get('hireDate') as string || null,
    };

    try {
      if (editingDriver) {
        await driversApi.update(editingDriver.id, data);
        success('Condutor atualizado com sucesso!');
      } else {
        await driversApi.create(data);
        success('Condutor adicionado com sucesso!');
      }
      setShowDriverForm(false);
      setEditingDriver(undefined);
      loadData();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Erro ao salvar condutor';
      const errorDetails = err.response?.data?.details;
      error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (!confirm('Tem a certeza que deseja desativar este condutor?')) {
      return;
    }

    try {
      await driversApi.delete(id);
      success('Condutor desativado com sucesso!');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.error || 'Erro ao desativar condutor');
    }
  };

  const handleAddLicense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDriver) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      licenseNumber: formData.get('licenseNumber') as string,
      category: formData.get('category') as string,
      issueDate: formData.get('issueDate') as string,
      expiryDate: formData.get('expiryDate') as string,
      issuingAuthority: formData.get('issuingAuthority') as string || null,
      notes: formData.get('notes') as string || null,
    };

    try {
      await driversApi.addLicense(selectedDriver.id, data);
      success('Licença adicionada com sucesso!');
      setShowLicenseForm(false);
      setSelectedDriver(undefined);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.error || 'Erro ao adicionar licença');
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      busId: formData.get('busId') as string,
      driverId: formData.get('driverId') as string,
      notes: formData.get('notes') as string || null,
    };

    try {
      await driversApi.createAssignment(data);
      success('Condutor atribuído com sucesso!');
      setShowAssignmentForm(false);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.error || 'Erro ao atribuir condutor');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">A carregar condutores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestão de Condutores</h2>
        <button
          onClick={() => {
            setEditingDriver(undefined);
            setShowDriverForm(true);
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + Adicionar Condutor
        </button>
      </div>

      {/* Formulário de Condutor */}
      {showDriverForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingDriver ? 'Editar Condutor' : 'Novo Condutor'}
          </h3>
          <form onSubmit={handleSaveDriver} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingDriver?.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número da Carta *</label>
                <input
                  type="text"
                  name="licenseNumber"
                  required
                  defaultValue={editingDriver?.licenseNumber}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                <input
                  type="text"
                  name="licenseCategory"
                  required
                  defaultValue={editingDriver?.licenseCategory}
                  placeholder="Ex: D, D+E"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="tel"
                  name="phone"
                  defaultValue={editingDriver?.phone || undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingDriver?.email || undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Contratação</label>
                <input
                  type="date"
                  name="hireDate"
                  defaultValue={editingDriver?.hireDate ? editingDriver.hireDate.split('T')[0] : undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Morada</label>
              <textarea
                name="address"
                rows={2}
                defaultValue={editingDriver?.address || undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                {editingDriver ? 'Atualizar' : 'Criar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDriverForm(false);
                  setEditingDriver(undefined);
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="driver-search" className="block text-sm font-medium text-gray-700 mb-2">
              Buscar condutor
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                id="driver-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome, carta, email..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          <div>
            <label htmlFor="driver-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filtro
            </label>
            <select
              id="driver-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as DriverFilter)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">Todos</option>
              <option value="expired-license">Licença Expirada</option>
              <option value="expiring-license">Licença a Expirar</option>
              <option value="with-assignments">Com Atribuições</option>
              <option value="without-assignments">Sem Atribuições</option>
            </select>
          </div>
        </div>
        {(searchTerm || filter !== 'all') && (
          <div className="mt-4">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilter('all');
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Lista de Condutores */}
      {filteredDrivers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum condutor encontrado</h3>
          <p className="mt-2 text-sm text-gray-500">
            {searchTerm || filter !== 'all'
              ? 'Tente ajustar os filtros de busca.'
              : 'Comece adicionando um novo condutor.'}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Condutores {filteredDrivers.length !== drivers.length && 
                `(${filteredDrivers.length} de ${drivers.length})`}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDrivers.map((driver) => {
          const activeAssignments = driver.assignments?.filter(a => !a.unassignedAt) || [];

          return (
            <div key={driver.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{driver.name}</h3>
                  <p className="text-sm text-gray-600">Carta: {driver.licenseNumber}</p>
                  <p className="text-sm text-gray-600">Categoria: {driver.licenseCategory}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingDriver(driver);
                      setShowDriverForm(true);
                    }}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteDriver(driver.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Desativar
                  </button>
                </div>
              </div>

              {driver.phone && (
                <p className="text-sm text-gray-600 mb-1">📞 {driver.phone}</p>
              )}
              {driver.email && (
                <p className="text-sm text-gray-600 mb-1">✉️ {driver.email}</p>
              )}

              {/* Licenças */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">Licenças</h4>
                  <button
                    onClick={() => {
                      setSelectedDriver(driver);
                      setShowLicenseForm(true);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    + Adicionar
                  </button>
                </div>
                {driver.licenses && driver.licenses.length > 0 ? (
                  <div className="space-y-2">
                    {driver.licenses.map((license) => {
                      const expiryDate = new Date(license.expiryDate);
                      const today = new Date();
                      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      const isExpired = expiryDate < today;
                      const isExpiringSoon = daysUntilExpiry <= 90 && daysUntilExpiry >= 0;

                      return (
                        <div
                          key={license.id}
                          className={`text-xs p-2 rounded ${
                            isExpired
                              ? 'bg-red-50 border border-red-200'
                              : isExpiringSoon
                              ? 'bg-yellow-50 border border-yellow-200'
                              : 'bg-gray-50'
                          }`}
                        >
                          <p className="font-medium">{license.category} - {license.licenseNumber}</p>
                          <p className="text-gray-600">
                            Expira: {expiryDate.toLocaleDateString('pt-PT')}
                            {isExpired && <span className="text-red-600 font-semibold ml-2">EXPIRADA</span>}
                            {isExpiringSoon && !isExpired && (
                              <span className="text-yellow-600 font-semibold ml-2">
                                Expira em {daysUntilExpiry} dias
                              </span>
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Nenhuma licença registada</p>
                )}
              </div>

              {/* Atribuições */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">Autocarros Atribuídos</h4>
                  <button
                    onClick={() => {
                      setSelectedDriver(driver);
                      setShowAssignmentForm(true);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    + Atribuir
                  </button>
                </div>
                {activeAssignments.length > 0 ? (
                  <div className="space-y-1">
                    {activeAssignments.map((assignment) => (
                      <div key={assignment.id} className="text-xs bg-blue-50 p-2 rounded flex justify-between items-center">
                        <div>
                          <p className="font-medium">{assignment.bus?.matricula}</p>
                          <p className="text-gray-600">
                            Desde {new Date(assignment.assignedAt).toLocaleDateString('pt-PT')}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            if (!confirm('Tem a certeza que deseja desatribuir este condutor do autocarro?')) {
                              return;
                            }
                            try {
                              await driversApi.deleteAssignment(assignment.id);
                              success('Condutor desatribuído com sucesso!');
                              loadData();
                            } catch (err: any) {
                              error(err.response?.data?.error || 'Erro ao desatribuir condutor');
                            }
                          }}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          title="Desatribuir"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Nenhum autocarro atribuído</p>
                )}
              </div>
            </div>
          );
        })}
          </div>
        </>
      )}

      {/* Modal de Adicionar Licença */}
      {showLicenseForm && selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Adicionar Licença</h3>
              <button
                onClick={() => {
                  setShowLicenseForm(false);
                  setSelectedDriver(undefined);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddLicense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número da Licença *</label>
                <input
                  type="text"
                  name="licenseNumber"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                <input
                  type="text"
                  name="category"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Emissão *</label>
                  <input
                    type="date"
                    name="issueDate"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Expiração *</label>
                  <input
                    type="date"
                    name="expiryDate"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Autoridade Emissora</label>
                <input
                  type="text"
                  name="issuingAuthority"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  name="notes"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Adicionar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLicenseForm(false);
                    setSelectedDriver(undefined);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Atribuir Condutor */}
      {showAssignmentForm && selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Atribuir Condutor a Autocarro</h3>
              <button
                onClick={() => {
                  setShowAssignmentForm(false);
                  setSelectedDriver(undefined);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <input type="hidden" name="driverId" value={selectedDriver.id} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condutor</label>
                <input
                  type="text"
                  value={selectedDriver.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Autocarro *</label>
                <select
                  name="busId"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um autocarro</option>
                  {buses.map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.matricula}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  name="notes"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Atribuir
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignmentForm(false);
                    setSelectedDriver(undefined);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

