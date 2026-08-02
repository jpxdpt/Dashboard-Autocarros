import prisma from '../config/database';
import { sendInspectionAlert } from './emailService';
import { InspectionType } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const parsedAlertDays = Number.parseInt(process.env.ALERT_DAYS_BEFORE || '30', 10);
const ALERT_DAYS_BEFORE = Number.isFinite(parsedAlertDays) && parsedAlertDays >= 0 ? parsedAlertDays : 30;

export interface InspectionStatus {
  id: string;
  busId: string;
  matricula: string;
  type: InspectionType;
  lastInspectionDate: Date;
  nextInspectionDate: Date | null;
  daysUntilDue: number | null;
  status: 'ok' | 'warning' | 'expired';
}

export function calculateInspectionStatus(nextInspectionDate: Date | null): {
  status: 'ok' | 'warning' | 'expired';
  daysUntilDue: number | null;
} {
  if (!nextInspectionDate) {
    return { status: 'ok', daysUntilDue: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const nextDate = new Date(nextInspectionDate);
  nextDate.setHours(0, 0, 0, 0);

  const diffTime = nextDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'expired', daysUntilDue: diffDays };
  } else if (diffDays <= ALERT_DAYS_BEFORE) {
    return { status: 'warning', daysUntilDue: diffDays };
  } else {
    return { status: 'ok', daysUntilDue: diffDays };
  }
}

export async function checkAndSendAlerts(companyId?: string): Promise<void> {
  try {
    console.log('Verificando inspeções próximas do vencimento...');

    const where: any = {
      nextInspectionDate: {
        not: null,
      },
    };

    if (companyId) {
      where.bus = {
        companyId,
      };
    }

    const inspections = await prisma.inspection.findMany({
      where,
      include: {
        bus: {
          select: {
            id: true,
            matricula: true,
            companyId: true,
          },
        },
      },
    });

    const alertsToSend: Array<{
      inspectionId: string;
      busId: string;
      matricula: string;
      type: InspectionType;
      lastInspectionDate: Date;
      nextInspectionDate: Date;
      daysUntilDue: number;
    }> = [];

    for (const inspection of inspections) {
      if (!inspection.nextInspectionDate) continue;

      const { status, daysUntilDue } = calculateInspectionStatus(inspection.nextInspectionDate);

      if (status === 'warning' || status === 'expired') {
        // Verificar se já foi enviado um alerta recente (últimos 7 dias)
        const recentAlert = await prisma.emailAlert.findFirst({
          where: {
            busId: inspection.busId,
            inspectionType: inspection.type,
            sentAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Últimos 7 dias
            },
          },
        });

        if (!recentAlert && daysUntilDue !== null) {
          alertsToSend.push({
            inspectionId: inspection.id,
            busId: inspection.busId,
            matricula: inspection.bus.matricula,
            type: inspection.type,
            lastInspectionDate: inspection.lastInspectionDate,
            nextInspectionDate: inspection.nextInspectionDate,
            daysUntilDue,
          });
        }
      }
    }

    // Enviar emails
    for (const alert of alertsToSend) {
      const sent = await sendInspectionAlert({
        matricula: alert.matricula,
        inspectionType: alert.type,
        lastInspectionDate: alert.lastInspectionDate,
        nextInspectionDate: alert.nextInspectionDate,
        daysUntilDue: alert.daysUntilDue,
      });

      if (sent) {
        // Registrar alerta enviado
        await prisma.emailAlert.create({
          data: {
            busId: alert.busId,
            inspectionType: alert.type,
          },
        });
      }
    }

    console.log(`Verificação concluída. ${alertsToSend.length} alertas enviados.`);
  } catch (error) {
    console.error('Erro ao verificar e enviar alertas:', error);
  }
}

export async function getAllInspectionsWithStatus(companyId?: string): Promise<InspectionStatus[]> {
  try {
    const where: any = {};

    if (companyId) {
      where.bus = {
        companyId,
      };
    }

    const inspections = await prisma.inspection.findMany({
      where,
      include: {
        bus: {
          select: {
            id: true,
            matricula: true,
            companyId: true,
          },
        },
      },
      orderBy: [
        { bus: { matricula: 'asc' } },
        { type: 'asc' },
      ],
    });

    return inspections.map((inspection) => {
      const { status, daysUntilDue } = calculateInspectionStatus(inspection.nextInspectionDate);

      return {
        id: inspection.id,
        busId: inspection.busId,
        matricula: inspection.bus.matricula,
        type: inspection.type,
        lastInspectionDate: inspection.lastInspectionDate,
        nextInspectionDate: inspection.nextInspectionDate,
        daysUntilDue,
        status,
      };
    });
  } catch (error) {
    console.error('Erro ao obter inspeções com status:', error);
    throw error;
  }
}

