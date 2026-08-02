import { Bus, InspectionType, Inspection } from '../services/api';
import AlertBadge from './AlertBadge';
import Card from './ui/Card';

interface BusTableProps {
  buses: Bus[];
  onEdit: (bus: Bus) => void;
  onDelete: (id: string) => void;
  onInspectionClick: (bus: Bus, inspectionType: InspectionType) => void;
  onMileageClick?: (bus: Bus) => void;
}

const INSPECTION_TYPES: InspectionType[] = [
  InspectionType.EXTINTORES,
  InspectionType.PNEUS,
  InspectionType.REVISOES,
  InspectionType.LICENCAS_TCC,
  InspectionType.LICENCAS_COMUNITARIAS,
  InspectionType.INSPECOES,
  InspectionType.INSPECOES_EXTRAORDINARIAS,
];

const INSPECTION_LABELS: Record<InspectionType, string> = {
  EXTINTORES: 'Extintores',
  PNEUS: 'Pneus',
  REVISOES: 'Revisões',
  LICENCAS_TCC: 'Licenças TCC',
  LICENCAS_COMUNITARIAS: 'Licenças Comunitárias',
  INSPECOES: 'Inspeções',
  INSPECOES_EXTRAORDINARIAS: 'Inspeções Extraordinárias',
};

function getInspectionStatus(inspection: Inspection | undefined): {
  status: 'ok' | 'warning' | 'expired';
  daysUntilDue: number | null;
} {
  if (!inspection || !inspection.nextInspectionDate) {
    return { status: 'ok', daysUntilDue: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextDate = new Date(inspection.nextInspectionDate);
  nextDate.setHours(0, 0, 0, 0);

  const diffTime = nextDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'expired', daysUntilDue: diffDays };
  } else if (diffDays <= 30) {
    return { status: 'warning', daysUntilDue: diffDays };
  } else {
    return { status: 'ok', daysUntilDue: diffDays };
  }
}

export default function BusTable({ buses, onEdit, onDelete, onInspectionClick, onMileageClick }: BusTableProps) {
  const getInspectionByType = (bus: Bus, type: InspectionType) => {
    return bus.inspections.find((insp) => insp.type === type);
  };

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-surface-2">
            <tr>
              <th className="px-6 py-3 text-left footnote uppercase tracking-wider">
                Matrícula
              </th>
              {INSPECTION_TYPES.map((type) => (
                <th
                  key={type}
                  className="px-4 py-3 text-center footnote uppercase tracking-wider"
                >
                  {INSPECTION_LABELS[type]}
                </th>
              ))}
              <th className="px-6 py-3 text-right footnote uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {buses.length === 0 ? (
              <tr>
                <td colSpan={INSPECTION_TYPES.length + 2} className="px-6 py-8 text-center footnote">
                  Nenhum autocarro registado
                </td>
              </tr>
            ) : (
              buses.map((bus) => (
                <tr key={bus.id} className="border-t border-separator hover:bg-fill transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-[14px] font-semibold text-label">{bus.matricula}</div>
                    {bus.currentMileage !== null && bus.currentMileage !== undefined && (
                      <div className="footnote mt-0.5">
                        {bus.currentMileage.toLocaleString('pt-PT')} km
                      </div>
                    )}
                    {bus.driverAssignments && bus.driverAssignments.length > 0 && (
                      <div className="footnote mt-0.5">
                        {bus.driverAssignments.map(a => a.driver.name).join(', ')}
                      </div>
                    )}
                  </td>
                  {INSPECTION_TYPES.map((type) => {
                    const inspection = getInspectionByType(bus, type);
                    const { status, daysUntilDue } = getInspectionStatus(inspection);

                    return (
                      <td key={type} className="px-4 py-4 whitespace-nowrap text-center">
                        {inspection ? (
                          <div
                            onClick={() => onInspectionClick(bus, type)}
                            className="cursor-pointer inline-flex flex-col items-center gap-1"
                          >
                            <AlertBadge status={status} daysUntilDue={daysUntilDue} type={type} />
                            {type === InspectionType.PNEUS && inspection.mileage && (
                              <span className="text-[11px] font-medium text-accent">
                                {inspection.mileage.toLocaleString('pt-PT')} km
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            onClick={() => onInspectionClick(bus, type)}
                            className="text-[12px] text-label-tertiary italic cursor-pointer hover:text-label-secondary"
                          >
                            Não registado
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-[13px] font-medium">
                    {onMileageClick && (
                      <button
                        onClick={() => onMileageClick(bus)}
                        className="text-[var(--green)] hover:opacity-75 mr-4 active:scale-95 transition-all duration-100"
                        title="Gestão de Quilometragem"
                      >
                        KM
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(bus)}
                      className="text-accent hover:opacity-75 mr-4 active:scale-95 transition-all duration-100"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(bus.id)}
                      className="text-[var(--red)] hover:opacity-75 active:scale-95 transition-all duration-100"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
