import { Router } from 'express';
import prisma from '../config/database';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../middleware/auth';

const router = Router();

const scheduleSchema = z.object({
  date: z.string().transform((str) => new Date(str)),
  driverId: z.string().uuid('ID do condutor inválido'),
  busId: z.string().uuid('ID do autocarro inválido'),
  service: z.string().min(1, 'Serviço é obrigatório'),
});

const updateScheduleSchema = scheduleSchema.partial();

// GET /api/schedules - Listar escalas
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const companyId = req.companyId!;
    const { date, startDate, endDate } = req.query;

    const where: any = { companyId };

    if (date) {
      const targetDate = new Date(date as string);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            licenseNumber: true,
          },
        },
        bus: {
          select: {
            id: true,
            matricula: true,
            brand: true,
            model: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    res.json(schedules);
  } catch (error) {
    console.error('Erro ao listar escalas:', error);
    res.status(500).json({ error: 'Erro ao listar escalas' });
  }
});

// GET /api/schedules/:id - Obter escala específica
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId!;

    const schedule = await prisma.schedule.findFirst({
      where: { id, companyId },
      include: {
        driver: true,
        bus: true,
      },
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Escala não encontrada' });
    }

    res.json(schedule);
  } catch (error) {
    console.error('Erro ao obter escala:', error);
    res.status(500).json({ error: 'Erro ao obter escala' });
  }
});

// POST /api/schedules - Criar nova escala
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const companyId = req.companyId!;
    const validatedData = scheduleSchema.parse(req.body);

    const [bus, driver] = await Promise.all([
      prisma.bus.findFirst({ where: { id: validatedData.busId, companyId } }),
      prisma.driver.findFirst({ where: { id: validatedData.driverId, companyId } }),
    ]);

    if (!bus) {
      return res.status(404).json({ error: 'Autocarro não encontrado' });
    }
    if (!driver) {
      return res.status(404).json({ error: 'Condutor não encontrado' });
    }

    const schedule = await prisma.schedule.create({
      data: {
        ...validatedData,
        companyId,
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            licenseNumber: true,
          },
        },
        bus: {
          select: {
            id: true,
            matricula: true,
            brand: true,
            model: true,
          },
        },
      },
    });

    res.status(201).json(schedule);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('Erro ao criar escala:', error);
    res.status(500).json({ error: 'Erro ao criar escala' });
  }
});

// POST /api/schedules/bulk - Criar várias escalas de uma vez
router.post('/bulk', authenticate, async (req: AuthRequest, res) => {
  try {
    const companyId = req.companyId!;
    const { schedules } = req.body;

    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ error: 'Array de escalas inválido' });
    }

    const validatedSchedules = schedules.map((s: any) => {
      const parsed = scheduleSchema.parse(s);
      return {
        ...parsed,
        companyId,
      };
    });

    const [buses, drivers] = await Promise.all([
      prisma.bus.findMany({ where: { companyId } }),
      prisma.driver.findMany({ where: { companyId, isActive: true } }),
    ]);

    const busIds = new Set(buses.map((b) => b.id));
    const driverIds = new Set(drivers.map((d) => d.id));

    for (const s of validatedSchedules) {
      if (!busIds.has(s.busId)) {
        return res.status(404).json({ error: `Autocarro não encontrado: ${s.busId}` });
      }
      if (!driverIds.has(s.driverId)) {
        return res.status(404).json({ error: `Condutor não encontrado: ${s.driverId}` });
      }
    }

    const created = await prisma.schedule.createMany({
      data: validatedSchedules,
    });

    const firstDate = validatedSchedules[0]?.date;
    const schedules = await prisma.schedule.findMany({
      where: {
        companyId,
        date: {
          gte: new Date(firstDate.toISOString().split('T')[0] + 'T00:00:00'),
          lt: new Date(firstDate.toISOString().split('T')[0] + 'T23:59:59'),
        },
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            licenseNumber: true,
          },
        },
        bus: {
          select: {
            id: true,
            matricula: true,
            brand: true,
            model: true,
          },
        },
      },
    });

    res.status(201).json(schedules);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('Erro ao criar escalas:', error);
    res.status(500).json({ error: 'Erro ao criar escalas' });
  }
});

// PUT /api/schedules/:id - Atualizar escala
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId!;
    const validatedData = updateScheduleSchema.parse(req.body);

    const schedule = await prisma.schedule.findFirst({
      where: { id, companyId },
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Escala não encontrada' });
    }

    if (validatedData.busId) {
      const bus = await prisma.bus.findFirst({
        where: { id: validatedData.busId, companyId },
      });
      if (!bus) {
        return res.status(404).json({ error: 'Autocarro não encontrado' });
      }
    }

    if (validatedData.driverId) {
      const driver = await prisma.driver.findFirst({
        where: { id: validatedData.driverId, companyId },
      });
      if (!driver) {
        return res.status(404).json({ error: 'Condutor não encontrado' });
      }
    }

    const updated = await prisma.schedule.update({
      where: { id },
      data: validatedData,
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            licenseNumber: true,
          },
        },
        bus: {
          select: {
            id: true,
            matricula: true,
            brand: true,
            model: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('Erro ao atualizar escala:', error);
    res.status(500).json({ error: 'Erro ao atualizar escala' });
  }
});

// DELETE /api/schedules/:id - Eliminar escala
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId!;

    const schedule = await prisma.schedule.findFirst({
      where: { id, companyId },
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Escala não encontrada' });
    }

    await prisma.schedule.delete({
      where: { id },
    });

    res.json({ message: 'Escala eliminada com sucesso' });
  } catch (error) {
    console.error('Erro ao eliminar escala:', error);
    res.status(500).json({ error: 'Erro ao eliminar escala' });
  }
});

// DELETE /api/schedules/date/:date - Eliminar todas as escalas de uma data
router.delete('/date/:date', authenticate, async (req: AuthRequest, res) => {
  try {
    const { date } = req.params;
    const companyId = req.companyId!;

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await prisma.schedule.deleteMany({
      where: {
        companyId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    res.json({ message: `${result.count} escala(s) eliminada(s)` });
  } catch (error) {
    console.error('Erro ao eliminar escalas:', error);
    res.status(500).json({ error: 'Erro ao eliminar escalas' });
  }
});

export default router;