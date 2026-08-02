import { InspectionType } from '../services/api';
import Badge from './ui/Badge';

interface AlertBadgeProps {
  status: 'ok' | 'warning' | 'expired';
  daysUntilDue: number | null;
  type: InspectionType;
}

const INSPECTION_LABELS: Record<InspectionType, string> = {
  EXTINTORES: 'Extintores',
  PNEUS: 'Pneus',
  REVISOES: 'Revisões',
  LICENCAS_TCC: 'Licenças TCC',
  LICENCAS_COMUNITARIAS: 'Licenças Comunitárias',
  INSPECOES: 'Inspeções',
  INSPECOES_EXTRAORDINARIAS: 'Inspeções Extraordinárias',
};

export default function AlertBadge({ status, daysUntilDue, type }: AlertBadgeProps) {
  const tone = status === 'expired' ? 'red' : status === 'warning' ? 'orange' : 'green';
  const label = status === 'expired' ? 'Expirado' : status === 'warning' ? 'Próximo' : 'OK';

  const daysText = daysUntilDue !== null
    ? daysUntilDue < 0
      ? `${Math.abs(daysUntilDue)} dias atrás`
      : `${daysUntilDue} dias`
    : 'N/A';

  return (
    <span title={`${INSPECTION_LABELS[type]}: ${label} (${daysText})`}>
      <Badge tone={tone}>
        {INSPECTION_LABELS[type]}
        <span className="opacity-70 font-medium">({daysText})</span>
      </Badge>
    </span>
  );
}
