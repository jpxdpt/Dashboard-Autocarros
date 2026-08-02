import { useState, useEffect } from 'react';
import { Bus } from '../services/api';
import { mileageApi, OdometerReading, MaintenanceSchedule } from '../services/mileageApi';
import { useToast } from '../hooks/useToast';
import Sheet from './ui/Sheet';
import Button from './ui/Button';
import Skeleton from './ui/Skeleton';

interface MileageManagementProps {
  open: boolean;
  bus?: Bus;
  onClose: () => void;
}

const fieldClasses =
  'w-full px-3.5 py-2.5 rounded-xl bg-surface text-label border border-separator placeholder:text-label-tertiary outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 transition-shadow';

export default function MileageManagement({ open, bus, onClose }: MileageManagementProps) {
  const [readings, setReadings] = useState<OdometerReading[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReadingForm, setShowReadingForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MaintenanceSchedule | undefined>();
  const { success, error } = useToast();

  useEffect(() => {
    if (open && bus) loadData();
  }, [open, bus?.id]);

  const loadData = async () => {
    if (!bus) return;
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
    if (!bus) return;
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
    if (!bus) return;
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

  const currentMileage = bus?.currentMileage || 0;

  return (
    <Sheet open={open && !!bus} onClose={onClose} title="Gestão de Quilometragem" wide>
      <p className="footnote mb-4">
        Autocarro: <span className="font-semibold text-label">{bus?.matricula}</span>
        {' • '}Quilometragem atual:{' '}
        <span className="font-semibold text-label">{currentMileage.toLocaleString('pt-PT')} km</span>
      </p>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registos de Quilometragem */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="headline">Registos de Quilometragem</h3>
              <Button size="sm" onClick={() => setShowReadingForm(!showReadingForm)}>
                + Novo Registo
              </Button>
            </div>

            {showReadingForm && (
              <form onSubmit={handleAddReading} className="bg-surface-2 p-4 rounded-xl mb-4">
                <div className="space-y-3">
                  <label className="block">
                    <span className="footnote block mb-1.5">Quilometragem (km)</span>
                    <input
                      type="number"
                      name="mileage"
                      required
                      min={currentMileage}
                      className={fieldClasses}
                      placeholder="Ex: 50000"
                    />
                  </label>
                  <label className="block">
                    <span className="footnote block mb-1.5">Data do Registo</span>
                    <input
                      type="date"
                      name="readingDate"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className={fieldClasses}
                    />
                  </label>
                  <label className="block">
                    <span className="footnote block mb-1.5">Notas (opcional)</span>
                    <textarea
                      name="notes"
                      rows={2}
                      className={fieldClasses}
                      placeholder="Observações..."
                    />
                  </label>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setShowReadingForm(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm">
                      Adicionar
                    </Button>
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {readings.length === 0 ? (
                <p className="footnote text-center py-8">Nenhum registo encontrado</p>
              ) : (
                readings.map((reading) => (
                  <div key={reading.id} className="bg-surface border border-separator rounded-xl p-4">
                    <p className="font-semibold text-label">
                      {reading.mileage.toLocaleString('pt-PT')} km
                    </p>
                    <p className="footnote">
                      {new Date(reading.readingDate).toLocaleDateString('pt-PT')}
                    </p>
                    {reading.notes && (
                      <p className="footnote mt-1">{reading.notes}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Agendas de Manutenção */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="headline">Agendas de Manutenção</h3>
              <Button
                size="sm"
                onClick={() => {
                  setEditingSchedule(undefined);
                  setShowScheduleForm(!showScheduleForm);
                }}
              >
                + Nova Agenda
              </Button>
            </div>

            {showScheduleForm && (
              <form onSubmit={handleSaveSchedule} className="bg-surface-2 p-4 rounded-xl mb-4">
                <div className="space-y-3">
                  <label className="block">
                    <span className="footnote block mb-1.5">Tipo de Manutenção</span>
                    <input
                      type="text"
                      name="maintenanceType"
                      required
                      defaultValue={editingSchedule?.maintenanceType}
                      className={fieldClasses}
                      placeholder="Ex: Revisão 10.000km"
                    />
                  </label>
                  <label className="block">
                    <span className="footnote block mb-1.5">Intervalo (km)</span>
                    <input
                      type="number"
                      name="mileageInterval"
                      required
                      min={1}
                      defaultValue={editingSchedule?.mileageInterval}
                      className={fieldClasses}
                      placeholder="Ex: 10000"
                    />
                  </label>
                  <label className="block">
                    <span className="footnote block mb-1.5">Última Manutenção (km) — Opcional</span>
                    <input
                      type="number"
                      name="lastMaintenanceMileage"
                      min={0}
                      defaultValue={editingSchedule?.lastMaintenanceMileage || undefined}
                      className={fieldClasses}
                      placeholder="Ex: 40000"
                    />
                  </label>
                  <label className="block">
                    <span className="footnote block mb-1.5">Notas (opcional)</span>
                    <textarea
                      name="notes"
                      rows={2}
                      defaultValue={editingSchedule?.notes || undefined}
                      className={fieldClasses}
                      placeholder="Observações..."
                    />
                  </label>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setShowScheduleForm(false);
                        setEditingSchedule(undefined);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm">
                      {editingSchedule ? 'Atualizar' : 'Criar'}
                    </Button>
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {schedules.length === 0 ? (
                <p className="footnote text-center py-8">Nenhuma agenda encontrada</p>
              ) : (
                schedules.map((schedule) => {
                  const kmRemaining = schedule.nextMaintenanceMileage - currentMileage;
                  const isOverdue = kmRemaining < 0;
                  const isDueSoon = kmRemaining <= 1000 && kmRemaining >= 0;

                  return (
                    <div
                      key={schedule.id}
                      className={`bg-surface border rounded-xl p-4 ${
                        isOverdue
                          ? 'border-[var(--red)]/40 bg-[var(--red)]/5'
                          : isDueSoon
                            ? 'border-[var(--orange)]/40 bg-[var(--orange)]/5'
                            : 'border-separator'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-label">{schedule.maintenanceType}</p>
                          <p className="footnote mt-1">
                            Intervalo: {schedule.mileageInterval.toLocaleString('pt-PT')} km
                          </p>
                          <p className="footnote">
                            Próxima: {schedule.nextMaintenanceMileage.toLocaleString('pt-PT')} km
                          </p>
                          {kmRemaining < 0 ? (
                            <p className="text-[13px] font-semibold text-[var(--red)] mt-1">
                              Vencida há {Math.abs(kmRemaining).toLocaleString('pt-PT')} km
                            </p>
                          ) : (
                            <p className="text-[13px] font-semibold text-label-secondary mt-1">
                              Restam {kmRemaining.toLocaleString('pt-PT')} km
                            </p>
                          )}
                          {schedule.notes && (
                            <p className="footnote mt-1">{schedule.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-1 ml-4">
                          <button
                            onClick={() => {
                              setEditingSchedule(schedule);
                              setShowScheduleForm(true);
                            }}
                            className="px-2.5 py-1.5 text-[13px] font-medium text-accent hover:bg-fill rounded-lg transition-all duration-100 active:scale-95"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="px-2.5 py-1.5 text-[13px] font-medium text-[var(--red)] hover:bg-fill rounded-lg transition-all duration-100 active:scale-95"
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
    </Sheet>
  );
}
