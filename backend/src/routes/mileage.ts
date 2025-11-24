import { Router } from 'express';
import prisma from '../config/database';
import { z } from 'zod';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { auditLog } from '../services/auditService';

const router = Router();

const odometerReadingSchema = z.object({
  busId: z.string().uuid('ID do autocarro inválido'),
  mileage: z.number().int().positive('A quilometragem deve ser um número positivo'),
  readingDate: z.string().transform((str) => new Date(str)).optional(),
  notes: z.string().optional().nullable(),
});

const maintenanceScheduleSchema = z.object({
  busId: z.string().uuid('ID do autocarro inválido'),
  maintenanceType: z.string().min(1, 'Tipo de manutenção é obrigatório'),
  mileageInterval: z.number().int().positive('Intervalo deve ser positivo'),
  lastMaintenanceMileage: z.number().int().nonnegative().optional().nullable(),
  nextMaintenanceMileage: z.number().int().positive('Próxima quilometragem deve ser positiva'),
  notes: z.string().optional().nullable(),
});

// GET /api/mileage/buses/:busId/readings - Listar registos de quilometragem de um autocarro
router.get('/buses/:busId/readings', authenticate, async (req: AuthRequest, res) => {
  try {
    const { busId } = req.params;
    const companyId = req.companyId!;

    // Verificar se o autocarro pertence à empresa
    const bus = await prisma.bus.findFirst({
      where: { id: busId, companyId },
    });

    if (!bus) {
      return res.status(404).json({ error: 'Autocarro não encontrado' });
    }

    const readings = await prisma.odometerReading.findMany({
      where: { busId },
      orderBy: { readingDate: 'desc' },
      take: 100, // Limitar a 100 registos mais recentes
    });

    res.json(readings);
  } catch (error) {
    console.error('Erro ao listar registos de quilometragem:', error);
    res.status(500).json({ error: 'Erro ao listar registos de quilometragem' });
  }
});

// POST /api/mileage/readings - Criar novo registo de quilometragem
router.post('/readings', authenticate, async (req: AuthRequest, res) => {
  try {
    const companyId = req.companyId!;
    const userId = req.user?.userId;
    const validatedData = odometerReadingSchema.parse(req.body);

    // Verificar se o autocarro pertence à empresa
    const bus = await prisma.bus.findFirst({
      where: { id: validatedData.busId, companyId },
    });

    if (!bus) {
      return res.status(404).json({ error: 'Autocarro não encontrado' });
    }

    // Verificar se a quilometragem é maior que a anterior
    const currentMileage = bus.currentMileage || 0;
    if (validatedData.mileage < currentMileage) {
      return res.status(400).json({ 
        error: `A quilometragem deve ser maior ou igual à atual (${currentMileage} km)` 
      });
    }

    // Criar registo
    const reading = await prisma.odometerReading.create({
      data: {
        busId: validatedData.busId,
        mileage: validatedData.mileage,
        readingDate: validatedData.readingDate || new Date(),
        notes: validatedData.notes,
        recordedBy: userId,
      },
    });

    // Atualizar quilometragem atual do autocarro
    await prisma.bus.update({
      where: { id: validatedData.busId },
      data: {
        currentMileage: validatedData.mileage,
        lastMileageUpdate: new Date(),
      },
    });

    // Verificar alertas de manutenção baseados em km
    await checkMaintenanceAlerts(validatedData.busId, validatedData.mileage);

    if (userId) {
      await auditLog(userId, companyId, 'CREATE', 'OdometerReading', reading.id, null, reading, req);
    }

    res.status(201).json(reading);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('Erro ao criar registo de quilometragem:', error);
    res.status(500).json({ error: 'Erro ao criar registo de quilometragem' });
  }
});

// GET /api/mileage/buses/:busId/schedules - Listar agendas de manutenção
router.get('/buses/:busId/schedules', authenticate, async (req: AuthRequest, res) => {
  try {
    const { busId } = req.params;
    const companyId = req.companyId!;

    const bus = await prisma.bus.findFirst({
      where: { id: busId, companyId },
    });

    if (!bus) {
      return res.status(404).json({ error: 'Autocarro não encontrado' });
    }

    const schedules = await prisma.maintenanceSchedule.findMany({
      where: { busId, isActive: true },
      orderBy: { nextMaintenanceMileage: 'asc' },
    });

    res.json(schedules);
  } catch (error) {
    console.error('Erro ao listar agendas de manutenção:', error);
    res.status(500).json({ error: 'Erro ao listar agendas de manutenção' });
  }
});

// POST /api/mileage/schedules - Criar agenda de manutenção
router.post('/schedules', authenticate, authorize(UserRole.ADMIN, UserRole.GESTOR), async (req: AuthRequest, res) => {
  try {
    const companyId = req.companyId!;
    const userId = req.user?.userId;
    const validatedData = maintenanceScheduleSchema.parse(req.body);

    const bus = await prisma.bus.findFirst({
      where: { id: validatedData.busId, companyId },
    });

    if (!bus) {
      return res.status(404).json({ error: 'Autocarro não encontrado' });
    }

    const schedule = await prisma.maintenanceSchedule.create({
      data: validatedData,
    });

    if (userId) {
      await auditLog(userId, companyId, 'CREATE', 'MaintenanceSchedule', schedule.id, null, schedule, req);
    }

    res.status(201).json(schedule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('Erro ao criar agenda de manutenção:', error);
    res.status(500).json({ error: 'Erro ao criar agenda de manutenção' });
  }
});

// PUT /api/mileage/schedules/:id - Atualizar agenda de manutenção
router.put('/schedules/:id', authenticate, authorize(UserRole.ADMIN, UserRole.GESTOR), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId!;
    const userId = req.user?.userId;
    const validatedData = maintenanceScheduleSchema.partial().parse(req.body);

    const schedule = await prisma.maintenanceSchedule.findFirst({
      where: { id },
      include: { bus: true },
    });

    if (!schedule || schedule.bus.companyId !== companyId) {
      return res.status(404).json({ error: 'Agenda de manutenção não encontrada' });
    }

    const oldValue = schedule;
    const updated = await prisma.maintenanceSchedule.update({
      where: { id },
      data: validatedData,
    });

    if (userId) {
      await auditLog(userId, companyId, 'UPDATE', 'MaintenanceSchedule', id, oldValue, updated, req);
    }

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('Erro ao atualizar agenda de manutenção:', error);
    res.status(500).json({ error: 'Erro ao atualizar agenda de manutenção' });
  }
});

// DELETE /api/mileage/schedules/:id - Desativar agenda de manutenção
router.delete('/schedules/:id', authenticate, authorize(UserRole.ADMIN, UserRole.GESTOR), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId!;
    const userId = req.user?.userId;

    const schedule = await prisma.maintenanceSchedule.findFirst({
      where: { id },
      include: { bus: true },
    });

    if (!schedule || schedule.bus.companyId !== companyId) {
      return res.status(404).json({ error: 'Agenda de manutenção não encontrada' });
    }

    const oldValue = schedule;
    const updated = await prisma.maintenanceSchedule.update({
      where: { id },
      data: { isActive: false },
    });

    if (userId) {
      await auditLog(userId, companyId, 'DELETE', 'MaintenanceSchedule', id, oldValue, updated, req);
    }

    res.json({ message: 'Agenda de manutenção desativada' });
  } catch (error) {
    console.error('Erro ao desativar agenda de manutenção:', error);
    res.status(500).json({ error: 'Erro ao desativar agenda de manutenção' });
  }
});

// Função auxiliar para verificar alertas de manutenção
async function checkMaintenanceAlerts(busId: string, currentMileage: number): Promise<void> {
  const schedules = await prisma.maintenanceSchedule.findMany({
    where: { busId, isActive: true },
  });

  for (const schedule of schedules) {
    // Verificar se a quilometragem atual está próxima ou ultrapassou a próxima manutenção
    const kmRemaining = schedule.nextMaintenanceMileage - currentMileage;
    
    if (kmRemaining <= 0) {
      // Manutenção vencida
      console.log(`⚠️ Alerta: Manutenção "${schedule.maintenanceType}" vencida para o autocarro ${busId}. Quilometragem atual: ${currentMileage} km`);
      // Aqui pode enviar email de alerta
    } else if (kmRemaining <= 1000) {
      // Próximo da manutenção (menos de 1000 km)
      console.log(`⚠️ Alerta: Manutenção "${schedule.maintenanceType}" próxima para o autocarro ${busId}. Restam ${kmRemaining} km`);
      // Aqui pode enviar email de alerta
    }
  }
}

export default router;

