import { Router, Response } from 'express';
import prisma from '../config/database';
import { z } from 'zod';
import { InspectionType } from '@prisma/client';
import { getAllInspectionsWithStatus } from '../services/alertService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createAuditLog, getClientIp, getUserAgent } from '../services/auditService';

const router = Router();

const inspectionSchema = z.object({
  busId: z.string().uuid('ID do autocarro inválido'),
  type: z.nativeEnum(InspectionType, {
    errorMap: () => ({ message: 'Tipo de inspeção inválido' }),
  }),
  lastInspectionDate: z.string().transform((str) => new Date(str)),
  nextInspectionDate: z.string().transform((str) => new Date(str)).optional().nullable(),
  mileage: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateInspectionSchema = z.object({
  lastInspectionDate: z.string().transform((str) => new Date(str)).optional(),
  nextInspectionDate: z.string().transform((str) => new Date(str)).optional().nullable(),
  mileage: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Intervalos padrão em dias para cada tipo de inspeção
const INSPECTION_INTERVALS: Record<InspectionType, number> = {
  EXTINTORES: 365, // 1 ano
  PNEUS: 90, // 3 meses
  REVISOES: 180, // 6 meses
  LICENCAS_TCC: 365, // 1 ano
  LICENCAS_COMUNITARIAS: 365, // 1 ano
  INSPECOES: 365, // 1 ano
};

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/inspections - Listar todas as inspeções da empresa
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.companyId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const { busId, withStatus } = req.query;

    if (withStatus === 'true') {
      const inspections = await getAllInspectionsWithStatus(req.companyId);
      return res.json(inspections);
    }

    const where: any = {
      bus: {
        companyId: req.companyId,
      },
    };

    if (busId) {
      where.busId = busId as string;
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

    res.json(inspections);
  } catch (error) {
    console.error('Erro ao listar inspeções:', error);
    res.status(500).json({ error: 'Erro ao listar inspeções' });
  }
});

// GET /api/inspections/:id - Obter inspeção por ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.companyId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const { id } = req.params;
    const inspection = await prisma.inspection.findFirst({
      where: {
        id,
        bus: {
          companyId: req.companyId,
        },
      },
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

    if (!inspection) {
      return res.status(404).json({ error: 'Inspeção não encontrada' });
    }

    res.json(inspection);
  } catch (error) {
    console.error('Erro ao obter inspeção:', error);
    res.status(500).json({ error: 'Erro ao obter inspeção' });
  }
});

// POST /api/inspections - Criar nova inspeção
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.companyId || !req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const validatedData = inspectionSchema.parse(req.body);

    // Verificar se o autocarro pertence à empresa
    const bus = await prisma.bus.findFirst({
      where: {
        id: validatedData.busId,
        companyId: req.companyId,
      },
    });

    if (!bus) {
      return res.status(404).json({ error: 'Autocarro não encontrado' });
    }

    // Calcular próxima inspeção se não fornecida
    const interval = INSPECTION_INTERVALS[validatedData.type];
    const nextDate = validatedData.nextInspectionDate ||
      new Date(validatedData.lastInspectionDate.getTime() + interval * 24 * 60 * 60 * 1000);

    const inspection = await prisma.inspection.create({
      data: {
        busId: validatedData.busId,
        type: validatedData.type,
        lastInspectionDate: validatedData.lastInspectionDate,
        nextInspectionDate: nextDate,
        mileage: validatedData.mileage,
        notes: validatedData.notes,
      },
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

    // Log de auditoria
    await createAuditLog({
      companyId: req.companyId,
      userId: req.user.userId,
      action: 'CREATE',
      entityType: 'Inspection',
      entityId: inspection.id,
      changes: {
        type: { after: inspection.type },
        lastInspectionDate: { after: inspection.lastInspectionDate },
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.status(201).json(inspection);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return res.status(409).json({ error: 'Inspeção deste tipo já existe para este autocarro' });
    }
    console.error('Erro ao criar inspeção:', error);
    res.status(500).json({ error: 'Erro ao criar inspeção' });
  }
});

// PUT /api/inspections/:id - Atualizar inspeção
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.companyId || !req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const { id } = req.params;
    const validatedData = updateInspectionSchema.parse(req.body);

    // Verificar se a inspeção pertence à empresa
    const currentInspection = await prisma.inspection.findFirst({
      where: {
        id,
        bus: {
          companyId: req.companyId,
        },
      },
    });

    if (!currentInspection) {
      return res.status(404).json({ error: 'Inspeção não encontrada' });
    }

    // Se a data da última inspeção mudou, recalcular próxima data
    let nextInspectionDate = validatedData.nextInspectionDate;
    if (validatedData.lastInspectionDate && !validatedData.nextInspectionDate) {
      const interval = INSPECTION_INTERVALS[currentInspection.type];
      nextInspectionDate = new Date(
        validatedData.lastInspectionDate.getTime() + interval * 24 * 60 * 60 * 1000
      );
    }

    const inspection = await prisma.inspection.update({
      where: { id },
      data: {
        ...(validatedData.lastInspectionDate && { lastInspectionDate: validatedData.lastInspectionDate }),
        ...(nextInspectionDate !== undefined && { nextInspectionDate }),
        ...(validatedData.mileage !== undefined && { mileage: validatedData.mileage }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
      },
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

    // Log de auditoria
    const changes: Record<string, { before?: any; after?: any }> = {};
    if (validatedData.lastInspectionDate) {
      changes.lastInspectionDate = {
        before: currentInspection.lastInspectionDate,
        after: inspection.lastInspectionDate,
      };
    }
    if (nextInspectionDate !== undefined) {
      changes.nextInspectionDate = {
        before: currentInspection.nextInspectionDate,
        after: inspection.nextInspectionDate,
      };
    }

    await createAuditLog({
      companyId: req.companyId,
      userId: req.user.userId,
      action: 'UPDATE',
      entityType: 'Inspection',
      entityId: inspection.id,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.json(inspection);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({ error: 'Inspeção não encontrada' });
    }
    console.error('Erro ao atualizar inspeção:', error);
    res.status(500).json({ error: 'Erro ao atualizar inspeção' });
  }
});

// DELETE /api/inspections/:id - Remover inspeção
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.companyId || !req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const { id } = req.params;

    // Verificar se a inspeção pertence à empresa
    const inspection = await prisma.inspection.findFirst({
      where: {
        id,
        bus: {
          companyId: req.companyId,
        },
      },
    });

    if (!inspection) {
      return res.status(404).json({ error: 'Inspeção não encontrada' });
    }

    await prisma.inspection.delete({
      where: { id },
    });

    // Log de auditoria
    await createAuditLog({
      companyId: req.companyId,
      userId: req.user.userId,
      action: 'DELETE',
      entityType: 'Inspection',
      entityId: id,
      changes: {
        type: { before: inspection.type },
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.status(204).send();
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({ error: 'Inspeção não encontrada' });
    }
    console.error('Erro ao remover inspeção:', error);
    res.status(500).json({ error: 'Erro ao remover inspeção' });
  }
});

export default router;
