import { useState, useEffect } from 'react';
import { Bus } from '../services/api';
import { mileageApi, OdometerReading, MaintenanceSchedule } from '../services/mileageApi';
import { useToast } from '../hooks/useToast';

interface MileageManagementProps {
  bus: Bus;
  onClose: () => void;
}

export default function MileageManagement({ bus, onClose }: MileageManagementProps) {
  const [readings, setReadings] = useState<OdometerReading[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReadingForm, setShowReadingForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MaintenanceSchedule | undefined>();
  const { success, error } = useToast();

  useEffect(() => {
    loadData();
  }, [bus.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [readingsRes, schedulesRes] = await Promise.all([
        mileageApi.getReadings(bus.id),
        mileageApi.getSchedules(bus.id),
      ]);
      setReadings(readingsRes.data);
      setSchedules(schedulesRes.data);
    } catch (err: any) {
      error(err.response?.data?.error || 'Erro ao carregar dados de quilometragem');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReading = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const mileage = parseInt(formData.get('mileage') as string);
    const readingDate = formData.get('readingDate') as string;
    const notes = formData.get('notes') as string;

    try {
      await mileageApi.createReading({
        busId: bus.id,
        mileage,
        readingDate,
        notes: notes || null,
      });
      success('Registo de quilometragem adicionado com sucesso!');
      setShowReadingForm(false);
      await loadData();
    } catch (err: any) {
      error(err.response?.data?.error || 'Erro ao adicionar registo');
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const maintenanceType = formData.get('maintenanceType') as string;
    const mileageInterval = parseInt(formData.get('mileageInterval') as string);
    const lastMaintenanceMileage = formData.get('lastMaintenanceMileage') 
      ? parseInt(formData.get('lastMaintenanceMileage') as string) 
      : null;
    const currentMileage = bus.currentMileage || 0;
    const nextMaintenanceMileage = lastMaintenanceMileage 
      ? lastMaintenanceMileage + mileageInterval 
      : currentMileage + mileageInterval;
    const notes = formData.get('notes') as string;

    try {
      if (editingSchedule) {
        await mileageApi.updateSchedule(editingSchedule.id, {
          maintenanceType,
          mileageInterval,
          lastMaintenanceMileage,
          nextMaintenanceMileage,
          notes: notes || null,
        });
        success('Agenda de manutenção atualizada com sucesso!');
      } else {
        await mileageApi.createSchedule({
          busId: bus.id,
          maintenanceType,
          mileageInterval,
          lastMaintenanceMileage,
          nextMaintenanceMileage,
          notes: notes || null,
        });
        success('Agenda de manutenção criada com sucesso!');
      }
      setShowScheduleForm(false);
      setEditingSchedule(undefined);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.error || 'Erro ao salvar agenda');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Tem a certeza que deseja remover esta agenda de manutenção?')) {
      return;
    }

    try {
      await mileageApi.deleteSchedule(id);
      success('Agenda de manutenção removida com sucesso!');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.error || 'Erro ao remover agenda');
    }
  };

  const currentMileage = bus.currentMileage || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestão de Quilometragem</h2>
            <p className="text-gray-600 mt-1">Autocarro: {bus.matricula}</p>
            <p className="text-sm text-gray-500 mt-1">
              Quilometragem atual: <span className="font-semibold">{currentMileage.toLocaleString('pt-PT')} km</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">A carregar...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Registos de Quilometragem */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">Registos de Quilometragem</h3>
                  <button
                    onClick={() => setShowReadingForm(!showReadingForm)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    + Novo Registo
                  </button>
                </div>

                {showReadingForm && (
                  <form onSubmit={handleAddReading} className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quilometragem (km)
                        </label>
                        <input
                          type="number"
                          name="mileage"
                          required
                          min={currentMileage}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: 50000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data do Registo
                        </label>
                        <input
                          type="date"
                          name="readingDate"
                          defaultValue={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notas (opcional)
                        </label>
                        <textarea
                          name="notes"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Observações..."
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
                          onClick={() => setShowReadingForm(false)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {readings.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Nenhum registo encontrado</p>
                  ) : (
                    readings.map((reading) => (
                      <div key={reading.id} className="bg-white border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-lg text-gray-900">
                              {reading.mileage.toLocaleString('pt-PT')} km
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(reading.readingDate).toLocaleDateString('pt-PT')}
                            </p>
                            {reading.notes && (
                              <p className="text-sm text-gray-600 mt-1">{reading.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Agendas de Manutenção */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">Agendas de Manutenção</h3>
                  <button
                    onClick={() => {
                      setEditingSchedule(undefined);
                      setShowScheduleForm(!showScheduleForm);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                  >
                    + Nova Agenda
                  </button>
                </div>

                {showScheduleForm && (
                  <form onSubmit={handleSaveSchedule} className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo de Manutenção
                        </label>
                        <input
                          type="text"
                          name="maintenanceType"
                          required
                          defaultValue={editingSchedule?.maintenanceType}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: Revisão 10.000km"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Intervalo (km)
                        </label>
                        <input
                          type="number"
                          name="mileageInterval"
                          required
                          min={1}
                          defaultValue={editingSchedule?.mileageInterval}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: 10000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Última Manutenção (km) - Opcional
                        </label>
                        <input
                          type="number"
                          name="lastMaintenanceMileage"
                          min={0}
                          defaultValue={editingSchedule?.lastMaintenanceMileage || undefined}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: 40000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notas (opcional)
                        </label>
                        <textarea
                          name="notes"
                          rows={2}
                          defaultValue={editingSchedule?.notes || undefined}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Observações..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                        >
                          {editingSchedule ? 'Atualizar' : 'Criar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowScheduleForm(false);
                            setEditingSchedule(undefined);
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {schedules.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Nenhuma agenda encontrada</p>
                  ) : (
                    schedules.map((schedule) => {
                      const kmRemaining = schedule.nextMaintenanceMileage - currentMileage;
                      const isOverdue = kmRemaining < 0;
                      const isDueSoon = kmRemaining <= 1000 && kmRemaining >= 0;

                      return (
                        <div
                          key={schedule.id}
                          className={`bg-white border rounded-lg p-4 ${
                            isOverdue ? 'border-red-300 bg-red-50' : isDueSoon ? 'border-yellow-300 bg-yellow-50' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{schedule.maintenanceType}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                Intervalo: {schedule.mileageInterval.toLocaleString('pt-PT')} km
                              </p>
                              <p className="text-sm text-gray-600">
                                Próxima: {schedule.nextMaintenanceMileage.toLocaleString('pt-PT')} km
                              </p>
                              {kmRemaining < 0 ? (
                                <p className="text-sm font-semibold text-red-600 mt-1">
                                  Vencida há {Math.abs(kmRemaining).toLocaleString('pt-PT')} km
                                </p>
                              ) : (
                                <p className="text-sm font-semibold text-gray-700 mt-1">
                                  Restam {kmRemaining.toLocaleString('pt-PT')} km
                                </p>
                              )}
                              {schedule.notes && (
                                <p className="text-sm text-gray-500 mt-1">{schedule.notes}</p>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => {
                                  setEditingSchedule(schedule);
                                  setShowScheduleForm(true);
                                }}
                                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteSchedule(schedule.id)}
                                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

