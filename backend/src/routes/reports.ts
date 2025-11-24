import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generatePDFReport, generateExcelReport, getInspectionStats } from '../services/reportService';
import { InspectionType } from '@prisma/client';

const router = Router();

const reportFiltersSchema = z.object({
  startDate: z.string().optional().transform((str) => (str ? new Date(str) : undefined)),
  endDate: z.string().optional().transform((str) => (str ? new Date(str) : undefined)),
  busIds: z.array(z.string().uuid()).optional(),
  inspectionTypes: z.array(z.nativeEnum(InspectionType)).optional(),
});

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/reports/stats - Obter estatísticas
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.companyId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const filters = reportFiltersSchema.parse(req.query);
    const stats = await getInspectionStats(req.companyId, filters);

    res.json(stats);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Filtros inválidos', details: error.errors });
    }
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ error: 'Erro ao obter estatísticas' });
  }
});

// GET /api/reports/pdf - Gerar relatório PDF
router.get('/pdf', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.companyId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const filters = reportFiltersSchema.parse(req.query);
    const pdfBuffer = await generatePDFReport(req.companyId, filters);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-inspecoes-${new Date().toISOString().split('T')[0]}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Filtros inválidos', details: error.errors });
    }
    console.error('Erro ao gerar PDF:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório PDF' });
  }
});

// GET /api/reports/excel - Gerar relatório Excel
router.get('/excel', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.companyId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const filters = reportFiltersSchema.parse(req.query);
    const excelBuffer = await generateExcelReport(req.companyId, filters);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-inspecoes-${new Date().toISOString().split('T')[0]}.xlsx"`
    );
    res.send(excelBuffer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Filtros inválidos', details: error.errors });
    }
    console.error('Erro ao gerar Excel:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório Excel' });
  }
});

export default router;



