import { Router } from 'express';
import prisma from '../config/database';
import { z } from 'zod';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { auditLog } from '../services/auditService';

const router = Router();

const driverSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  licenseNumber: z.string().min(1, 'Número da carta é obrigatório'),
  licenseCategory: z.string().min(1, 'Categoria é obrigatória'),
  phone: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable(),
  address: z.string().optional().nullable(),
  hireDate: z.string().transform((str) => new Date(str)).optional().nullable(),
});

const driverLicenseSchema = z.object({
  driverId: z.string().uuid('ID do condutor inválido'),
  licenseNumber: z.string().min(1, 'Número da carta é obrigatório'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  issueDate: z.string().transform((str) => new Date(str)),
  expiryDate: z.string().transform((str) => new Date(str)),
  issuingAuthority: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const driverAssignmentSchema = z.object({
  busId: z.string().uuid('ID do autocarro inválido'),
  driverId: z.string().uuid('ID do condutor inválido'),
  notes: z.string().optional().nullable(),
});

// GET /api/drivers - Listar todos os condutores
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const companyId = req.companyId!;
    const { active } = req.query;

    const where: any = { companyId };
    if (active === 'true') {
      where.isActive = true;
    } else if (active === 'false') {
      where.isActive = false;
    }

    const drivers = await prisma.driver.findMany({
      where,
      include: {
        licenses: {
          orderBy: { expiryDate: 'asc' },
        },
        assignments: {
          where: { unassignedAt: null },
          include: {
            bus: {
              select: {
                id: true,
                matricula: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(drivers);
  } catch (error) {
    console.error('Erro ao listar condutores:', error);
    res.status(500).json({ error: 'Erro ao listar condutores' });
  }
});

// GET /api/drivers/:id - Obter condutor específico
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId!;

    const driver = await prisma.driver.findFirst({
      where: { id, companyId },
      include: {
        licenses: {
          orderBy: { expiryDate: 'asc' },
        },
        assignments: {
          include: {
            bus: {
              select: {
                id: true,
                matricula: true,
              },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Condutor não encontrado' });
    }

    res.json(driver);
  } catch (error) {
    console.error('Erro ao obter condutor:', error);
    res.status(500).json({ error: 'Erro ao obter condutor' });
  }
});

// POST /api/drivers - Criar novo condutor
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.GESTOR), async (req: AuthRequest, res) => {
  try {
    const companyId = req.companyId!;
    const userId = req.user?.userId;
    const validatedData = driverSchema.parse(req.body);

    console.log('Criando condutor:', { companyId, licenseNumber: validatedData.licenseNumber });

    // Verificar se já existe condutor com o mesmo número de carta na empresa
    const existing = await prisma.driver.findFirst({
      where: {
        companyId,
        licenseNumber: validatedData.licenseNumber,
      },
    });

    if (existing) {
      console.log('Condutor já existe:', existing.id, existing.name);
      return res.status(409).json({ 
        error: 'Já existe um condutor com este número de carta nesta empresa',
        details: `O condutor "${existing.name}" já possui o número de carta "${validatedData.licenseNumber}"`
      });
    }

    const driver = await prisma.driver.create({
      data: {
        ...validatedData,
        companyId,
      },
      include: {
        licenses: true,
        assignments: true,
      },
    });

    if (userId) {
      await auditLog(userId, companyId, 'CREATE', 'Driver', driver.id, null, driver, req);
    }

    res.status(201).json(driver);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    
    // Verificar se é erro de constraint único do Prisma
    if (error.code === 'P2002') {
      const field = error.meta?.target;
      if (Array.isArray(field) && field.includes('licenseNumber')) {
        return res.status(409).json({ 
          error: 'Já existe um condutor com este número de carta nesta empresa',
          details: 'O número de carta deve ser único por empresa'
        });
      }
    }
    
    console.error('Erro ao criar condutor:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Erro ao criar condutor',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/drivers/:id - Atualizar condutor
router.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.GESTOR), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId!;
    const userId = req.user?.userId;
    const validatedData = driverSchema.partial().parse(req.body);

    const driver = await prisma.driver.findFirst({
      where: { id, companyId },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Condutor não encontrado' });
    }

    const oldValue = driver;
    const updated = await prisma.driver.update({
      where: { id },
      data: validatedData,
    });

    if (userId) {
      await auditLog(userId, companyId, 'UPDATE', 'Driver', id, oldValue, updated, req);
    }

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('Erro ao atualizar condutor:', error);
    res.status(500).json({ error: 'Erro ao atualizar condutor' });
  }
});

// DELETE /api/drivers/:id - Desativar condutor
router.delete('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.GESTOR), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId!;
    const userId = req.user?.userId;

    const driver = await prisma.driver.findFirst({
      where: { id, companyId },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Condutor não encontrado' });
    }

    const oldValue = driver;
    const updated = await prisma.driver.update({
      where: { id },
      data: { isActive: false },
    });

    // Desativar todas as atribuições ativas
    await prisma.driverAssignment.updateMany({
      where: {
        driverId: id,
        unassignedAt: null,
      },
      data: {
        unassignedAt: new Date(),
      },
    });

    if (userId) {
      await auditLog(userId, companyId, 'DELETE', 'Driver', id, oldValue, updated, req);
    }

    res.json({ message: 'Condutor desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar condutor:', error);
    res.status(500).json({ error: 'Erro ao desativar condutor' });
  }
});

// POST /api/drivers/:id/licenses - Adicionar licença ao condutor
router.post('/:id/licenses', authenticate, authorize(UserRole.ADMIN, UserRole.GESTOR), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId!;
    const userId = req.user?.userId;
    const validatedData = driverLicenseSchema.parse({ ...req.body, driverId: id });

    const driver = await prisma.driver.findFirst({
      where: { id, companyId },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Condutor não encontrado' });
    }

    const license = await prisma.driverLicense.create({
      data: validatedData,
    });

    if (userId) {
      await auditLog(userId, companyId, 'CREATE', 'DriverLicense', license.id, null, license, req);
    }

    res.status(201).json(license);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('Erro ao adicionar licença:', error);
    res.status(500).json({ error: 'Erro ao adicionar licença' });
  }
});

// POST /api/drivers/assignments - Atribuir condutor a autocarro
router.post('/assignments', authenticate, authorize(UserRole.ADMIN, UserRole.GESTOR), async (req: AuthRequest, res) => {
  try {
    const companyId = req.companyId!;
    const userId = req.user?.userId;
    const validatedData = driverAssignmentSchema.parse(req.body);

    // Verificar se autocarro e condutor pertencem à empresa
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

    // Desativar atribuições anteriores do condutor a este autocarro
    await prisma.driverAssignment.updateMany({
      where: {
        busId: validatedData.busId,
        driverId: validatedData.driverId,
        unassignedAt: null,
      },
      data: {
        unassignedAt: new Date(),
      },
    });

    const assignment = await prisma.driverAssignment.create({
      data: validatedData,
      include: {
        bus: {
          select: {
            id: true,
            matricula: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            licenseNumber: true,
          },
        },
      },
    });

    if (userId) {
      await auditLog(userId, companyId, 'CREATE', 'DriverAssignment', assignment.id, null, assignment, req);
    }

    res.status(201).json(assignment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('Erro ao atribuir condutor:', error);
    res.status(500).json({ error: 'Erro ao atribuir condutor' });
  }
});

// DELETE /api/drivers/assignments/:id - Remover atribuição
router.delete('/assignments/:id', authenticate, authorize(UserRole.ADMIN, UserRole.GESTOR), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId!;
    const userId = req.user?.userId;

    const assignment = await prisma.driverAssignment.findFirst({
      where: { id },
      include: {
        bus: true,
      },
    });

    if (!assignment || assignment.bus.companyId !== companyId) {
      return res.status(404).json({ error: 'Atribuição não encontrada' });
    }

    const oldValue = assignment;
    const updated = await prisma.driverAssignment.update({
      where: { id },
      data: { unassignedAt: new Date() },
    });

    if (userId) {
      await auditLog(userId, companyId, 'UPDATE', 'DriverAssignment', id, oldValue, updated, req);
    }

    res.json({ message: 'Atribuição removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover atribuição:', error);
    res.status(500).json({ error: 'Erro ao remover atribuição' });
  }
});

export default router;

