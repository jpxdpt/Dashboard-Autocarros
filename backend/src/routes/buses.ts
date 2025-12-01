import { Router, Response } from 'express';
import prisma from '../config/database';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/auth';
import { createAuditLog, getClientIp, getUserAgent } from '../services/auditService';
import { UserRole } from '@prisma/client';

const router = Router();

const busSchema = z.object({
  matricula: z.string().min(1, 'Matrícula é obrigatória').max(20, 'Matrícula muito longa'),
});

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/buses - Listar todos os autocarros da empresa
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.companyId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const buses = await prisma.bus.findMany({
      where: {
        companyId: req.companyId,
      },
      include: {
        inspections: {
          orderBy: {
            type: 'asc',
          },
        },
        driverAssignments: {
          where: {
            unassignedAt: null,
          },
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                licenseNumber: true,
              },
            },
          },
        },
      },
      orderBy: {
        matricula: 'asc',
      },
    });
    res.json(buses);
  } catch (error: any) {
    console.error('Erro ao listar autocarros:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Erro ao listar autocarros',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/buses/:id - Obter autocarro por ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.companyId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const { id } = req.params;
    const bus = await prisma.bus.findFirst({
      where: {
        id,
        companyId: req.companyId,
      },
      include: {
        inspections: {
          orderBy: {
            type: 'asc',
          },
        },
        driverAssignments: {
          where: {
            unassignedAt: null,
          },
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                licenseNumber: true,
              },
            },
          },
        },
      },
    });

    if (!bus) {
      return res.status(404).json({ error: 'Autocarro não encontrado' });
    }

    res.json(bus);
  } catch (error) {
    console.error('Erro ao obter autocarro:', error);
    res.status(500).json({ error: 'Erro ao obter autocarro' });
  }
});

// POST /api/buses - Criar novo autocarro
router.post('/', authorize(UserRole.ADMIN, UserRole.GESTOR), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.companyId || !req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const validatedData = busSchema.parse(req.body);

    const bus = await prisma.bus.create({
      data: {
        matricula: validatedData.matricula.toUpperCase(),
        companyId: req.companyId,
      },
      include: {
        inspections: true,
      },
    });

    // Log de auditoria
    await createAuditLog({
      companyId: req.companyId,
      userId: req.user.userId,
      action: 'CREATE',
      entityType: 'Bus',
      entityId: bus.id,
      changes: {
        matricula: { after: bus.matricula },
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.status(201).json(bus);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return res.status(409).json({ error: 'Matrícula já existe nesta empresa' });
    }
    console.error('Erro ao criar autocarro:', error);
    res.status(500).json({ error: 'Erro ao criar autocarro' });
  }
});

// PUT /api/buses/:id - Atualizar autocarro
router.put('/:id', authorize(UserRole.ADMIN, UserRole.GESTOR), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.companyId || !req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const { id } = req.params;
    const validatedData = busSchema.parse(req.body);

    // Verificar se o autocarro pertence à empresa
    const existingBus = await prisma.bus.findFirst({
      where: {
        id,
        companyId: req.companyId,
      },
    });

    if (!existingBus) {
      return res.status(404).json({ error: 'Autocarro não encontrado' });
    }

    const bus = await prisma.bus.update({
      where: { id },
      data: {
        matricula: validatedData.matricula.toUpperCase(),
      },
      include: {
        inspections: true,
      },
    });

    // Log de auditoria
    await createAuditLog({
      companyId: req.companyId,
      userId: req.user.userId,
      action: 'UPDATE',
      entityType: 'Bus',
      entityId: bus.id,
      changes: {
        matricula: {
          before: existingBus.matricula,
          after: bus.matricula,
        },
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.json(bus);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({ error: 'Autocarro não encontrado' });
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return res.status(409).json({ error: 'Matrícula já existe nesta empresa' });
    }
    console.error('Erro ao atualizar autocarro:', error);
    res.status(500).json({ error: 'Erro ao atualizar autocarro' });
  }
});

// DELETE /api/buses/:id - Remover autocarro
router.delete('/:id', authorize(UserRole.ADMIN, UserRole.GESTOR), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.companyId || !req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const { id } = req.params;

    // Verificar se o autocarro pertence à empresa
    const bus = await prisma.bus.findFirst({
      where: {
        id,
        companyId: req.companyId,
      },
    });

    if (!bus) {
      return res.status(404).json({ error: 'Autocarro não encontrado' });
    }

    await prisma.bus.delete({
      where: { id },
    });

    // Log de auditoria
    await createAuditLog({
      companyId: req.companyId,
      userId: req.user.userId,
      action: 'DELETE',
      entityType: 'Bus',
      entityId: id,
      changes: {
        matricula: { before: bus.matricula },
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.status(204).send();
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({ error: 'Autocarro não encontrado' });
    }
    console.error('Erro ao remover autocarro:', error);
    res.status(500).json({ error: 'Erro ao remover autocarro' });
  }
});

export default router;
