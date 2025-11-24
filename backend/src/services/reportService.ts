import prisma from '../config/database';
import { InspectionType } from '@prisma/client';
import { Response } from 'express';

// Importações dinâmicas para evitar problemas de inicialização
// Estas bibliotecas só são carregadas quando necessário
const loadPDFKit = () => {
  try {
    return require('pdfkit');
  } catch (error) {
    console.error('Erro ao carregar PDFKit:', error);
    throw new Error('PDFKit não está disponível');
  }
};

const loadExcelJS = () => {
  try {
    return require('exceljs');
  } catch (error) {
    console.error('Erro ao carregar ExcelJS:', error);
    throw new Error('ExcelJS não está disponível');
  }
};

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  busIds?: string[];
  inspectionTypes?: InspectionType[];
}

export interface InspectionStats {
  total: number;
  ok: number;
  warning: number;
  expired: number;
  byType: Record<InspectionType, { total: number; ok: number; warning: number; expired: number }>;
}

export async function getInspectionStats(
  companyId: string,
  filters?: ReportFilters
): Promise<InspectionStats> {
  const where: any = {
    bus: {
      companyId,
    },
  };

  if (filters?.busIds && filters.busIds.length > 0) {
    where.busId = { in: filters.busIds };
  }

  if (filters?.inspectionTypes && filters.inspectionTypes.length > 0) {
    where.type = { in: filters.inspectionTypes };
  }

  const inspections = await prisma.inspection.findMany({
    where,
    include: {
      bus: {
        select: {
          id: true,
          matricula: true,
        },
      },
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats: InspectionStats = {
    total: inspections.length,
    ok: 0,
    warning: 0,
    expired: 0,
    byType: {
      EXTINTORES: { total: 0, ok: 0, warning: 0, expired: 0 },
      PNEUS: { total: 0, ok: 0, warning: 0, expired: 0 },
      REVISOES: { total: 0, ok: 0, warning: 0, expired: 0 },
      LICENCAS_TCC: { total: 0, ok: 0, warning: 0, expired: 0 },
      LICENCAS_COMUNITARIAS: { total: 0, ok: 0, warning: 0, expired: 0 },
      INSPECOES: { total: 0, ok: 0, warning: 0, expired: 0 },
    },
  };

  inspections.forEach((inspection) => {
    const typeStats = stats.byType[inspection.type];
    typeStats.total++;

    if (!inspection.nextInspectionDate) {
      stats.ok++;
      typeStats.ok++;
      return;
    }

    const nextDate = new Date(inspection.nextInspectionDate);
    nextDate.setHours(0, 0, 0, 0);

    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      stats.expired++;
      typeStats.expired++;
    } else if (diffDays <= 30) {
      stats.warning++;
      typeStats.warning++;
    } else {
      stats.ok++;
      typeStats.ok++;
    }
  });

  return stats;
}

export async function generatePDFReport(
  companyId: string,
  filters?: ReportFilters,
  res?: Response
): Promise<Buffer> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  const buses = await prisma.bus.findMany({
    where: {
      companyId,
      ...(filters?.busIds && filters.busIds.length > 0
        ? { id: { in: filters.busIds } }
        : {}),
    },
    include: {
      inspections: {
        orderBy: { type: 'asc' },
        ...(filters?.inspectionTypes && filters.inspectionTypes.length > 0
          ? { where: { type: { in: filters.inspectionTypes } } }
          : {}),
      },
    },
    orderBy: { matricula: 'asc' },
  });

  const stats = await getInspectionStats(companyId, filters);

  return new Promise((resolve, reject) => {
    try {
      const PDFDocument = loadPDFKit();
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        info: {
          Title: 'Relatório de Inspeções',
          Author: company?.name || 'Dashboard Autocarros',
          Subject: 'Relatório de Inspeções de Autocarros',
        }
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Função auxiliar para desenhar caixa colorida
      const drawBox = (x: number, y: number, width: number, height: number, color: string) => {
        doc.rect(x, y, width, height).fill(color);
      };

      // Função auxiliar para texto em caixa
      const drawTextInBox = (text: string, x: number, y: number, width: number, options: any = {}) => {
        const { fontSize = 12, color = '#000000', align = 'left', bold = false } = options;
        doc.fontSize(fontSize);
        if (bold) doc.font('Helvetica-Bold');
        doc.fillColor(color);
        doc.text(text, x, y, { width, align });
        doc.font('Helvetica');
        doc.fillColor('#000000');
      };

      // Cabeçalho com fundo colorido
      const headerHeight = 80;
      const pageWidth = doc.page.width;
      const margin = 50;
      const contentWidth = pageWidth - (margin * 2);

      // Fundo do cabeçalho
      doc.rect(margin, margin, contentWidth, headerHeight)
        .fill('#1e40af'); // Azul escuro

      // Título principal
      doc.fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text('RELATÓRIO DE INSPEÇÕES', margin + 20, margin + 15, {
          width: contentWidth - 40,
          align: 'center'
        });

      // Informações da empresa
      doc.fontSize(14)
        .font('Helvetica')
        .text(company?.name || 'N/A', margin + 20, margin + 45, {
          width: contentWidth - 40,
          align: 'center'
        });

      // Data de geração
      doc.fontSize(10)
        .text(`Gerado em: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT')}`, 
          margin + 20, margin + 65, {
          width: contentWidth - 40,
          align: 'center'
        });

      doc.fillColor('#000000');
      let yPosition = margin + headerHeight + 30;

      // Seção de Estatísticas Gerais
      doc.fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#1e40af')
        .text('ESTATÍSTICAS GERAIS', margin, yPosition);
      
      yPosition += 30;

      // Caixas de estatísticas
      const boxWidth = (contentWidth - 20) / 4;
      const boxHeight = 60;
      const boxSpacing = 10;

      // Total
      drawBox(margin, yPosition, boxWidth, boxHeight, '#e0e7ff');
      drawTextInBox('Total', margin + 10, yPosition + 10, boxWidth - 20, { fontSize: 10, color: '#64748b' });
      drawTextInBox(stats.total.toString(), margin + 10, yPosition + 25, boxWidth - 20, { fontSize: 20, bold: true, color: '#1e40af' });

      // OK
      drawBox(margin + boxWidth + boxSpacing, yPosition, boxWidth, boxHeight, '#d1fae5');
      drawTextInBox('OK', margin + boxWidth + boxSpacing + 10, yPosition + 10, boxWidth - 20, { fontSize: 10, color: '#64748b' });
      drawTextInBox(stats.ok.toString(), margin + boxWidth + boxSpacing + 10, yPosition + 25, boxWidth - 20, { fontSize: 20, bold: true, color: '#059669' });

      // Warning
      drawBox(margin + (boxWidth + boxSpacing) * 2, yPosition, boxWidth, boxHeight, '#fef3c7');
      drawTextInBox('Próximas', margin + (boxWidth + boxSpacing) * 2 + 10, yPosition + 10, boxWidth - 20, { fontSize: 10, color: '#64748b' });
      drawTextInBox(stats.warning.toString(), margin + (boxWidth + boxSpacing) * 2 + 10, yPosition + 25, boxWidth - 20, { fontSize: 20, bold: true, color: '#d97706' });

      // Expired
      drawBox(margin + (boxWidth + boxSpacing) * 3, yPosition, boxWidth, boxHeight, '#fee2e2');
      drawTextInBox('Expiradas', margin + (boxWidth + boxSpacing) * 3 + 10, yPosition + 10, boxWidth - 20, { fontSize: 10, color: '#64748b' });
      drawTextInBox(stats.expired.toString(), margin + (boxWidth + boxSpacing) * 3 + 10, yPosition + 25, boxWidth - 20, { fontSize: 20, bold: true, color: '#dc2626' });

      yPosition += boxHeight + 30;

      // Verificar se precisa de nova página
      if (yPosition > doc.page.height - 200) {
        doc.addPage();
        yPosition = margin;
      }

      // Detalhes por Autocarro
      doc.fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#1e40af')
        .text('DETALHES POR AUTOCARRO', margin, yPosition);
      
      yPosition += 25;

      const typeLabels: Record<InspectionType, string> = {
        EXTINTORES: 'Extintores',
        PNEUS: 'Pneus',
        REVISOES: 'Revisões',
        LICENCAS_TCC: 'Licenças TCC',
        LICENCAS_COMUNITARIAS: 'Licenças Comunitárias',
        INSPECOES: 'Inspeções',
      };

      buses.forEach((bus, busIndex) => {
        // Verificar se precisa de nova página
        if (yPosition > doc.page.height - 250) {
          doc.addPage();
          yPosition = margin;
        }

        // Cabeçalho do autocarro
        const busHeaderHeight = 30;
        doc.rect(margin, yPosition, contentWidth, busHeaderHeight)
          .fill('#f1f5f9');
        
        doc.fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('#1e40af')
          .text(`Matrícula: ${bus.matricula}`, margin + 15, yPosition + 8);
        
        yPosition += busHeaderHeight + 10;

        if (bus.inspections.length === 0) {
          doc.fontSize(11)
            .fillColor('#64748b')
            .text('Nenhuma inspeção registada', margin + 20, yPosition);
          yPosition += 20;
        } else {
          // Tabela de inspeções
          const tableTop = yPosition;
          const rowHeight = 25;
          const colWidths = [contentWidth * 0.25, contentWidth * 0.25, contentWidth * 0.25, contentWidth * 0.25];
          let currentY = tableTop;

          // Cabeçalho da tabela
          doc.rect(margin, currentY, contentWidth, rowHeight)
            .fill('#1e40af');
          
          doc.fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#ffffff');
          
          doc.text('Tipo', margin + 10, currentY + 8, { width: colWidths[0] - 20 });
          doc.text('Última Inspeção', margin + colWidths[0] + 10, currentY + 8, { width: colWidths[1] - 20 });
          doc.text('Próxima Inspeção', margin + colWidths[0] + colWidths[1] + 10, currentY + 8, { width: colWidths[2] - 20 });
          doc.text('Status', margin + colWidths[0] + colWidths[1] + colWidths[2] + 10, currentY + 8, { width: colWidths[3] - 20 });
          
          currentY += rowHeight;

          // Linhas da tabela
          bus.inspections.forEach((inspection, inspIndex) => {
            // Verificar se precisa de nova página
            if (currentY > doc.page.height - 100) {
              doc.addPage();
              currentY = margin;
              // Redesenhar cabeçalho da tabela
              doc.rect(margin, currentY, contentWidth, rowHeight)
                .fill('#1e40af');
              doc.fontSize(10)
                .font('Helvetica-Bold')
                .fillColor('#ffffff');
              doc.text('Tipo', margin + 10, currentY + 8, { width: colWidths[0] - 20 });
              doc.text('Última Inspeção', margin + colWidths[0] + 10, currentY + 8, { width: colWidths[1] - 20 });
              doc.text('Próxima Inspeção', margin + colWidths[0] + colWidths[1] + 10, currentY + 8, { width: colWidths[2] - 20 });
              doc.text('Status', margin + colWidths[0] + colWidths[1] + colWidths[2] + 10, currentY + 8, { width: colWidths[3] - 20 });
              currentY += rowHeight;
            }

            // Fundo alternado para linhas
            if (inspIndex % 2 === 0) {
              doc.rect(margin, currentY, contentWidth, rowHeight)
                .fill('#f8fafc');
            }

            const lastDate = new Date(inspection.lastInspectionDate).toLocaleDateString('pt-PT');
            const nextDate = inspection.nextInspectionDate
              ? new Date(inspection.nextInspectionDate).toLocaleDateString('pt-PT')
              : 'N/A';

            let status = 'OK';
            let statusColor = '#059669';
            if (inspection.nextInspectionDate) {
              const next = new Date(inspection.nextInspectionDate);
              next.setHours(0, 0, 0, 0);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const diffDays = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays < 0) {
                status = 'EXPIRADA';
                statusColor = '#dc2626';
              } else if (diffDays <= 30) {
                status = 'PRÓXIMA';
                statusColor = '#d97706';
              }
            }

            doc.fontSize(10)
              .font('Helvetica')
              .fillColor('#000000')
              .text(typeLabels[inspection.type], margin + 10, currentY + 8, { width: colWidths[0] - 20 });
            doc.text(lastDate, margin + colWidths[0] + 10, currentY + 8, { width: colWidths[1] - 20 });
            doc.text(nextDate, margin + colWidths[0] + colWidths[1] + 10, currentY + 8, { width: colWidths[2] - 20 });
            doc.fillColor(statusColor)
              .font('Helvetica-Bold')
              .text(status, margin + colWidths[0] + colWidths[1] + colWidths[2] + 10, currentY + 8, { width: colWidths[3] - 20 });
            doc.fillColor('#000000');

            currentY += rowHeight;
          });

          yPosition = currentY + 15;
        }

        // Espaço entre autocarros
        if (busIndex < buses.length - 1) {
          yPosition += 10;
        }
      });

      // Rodapé em todas as páginas
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8)
          .fillColor('#64748b')
          .text(
            `Página ${i + 1} de ${pageCount} | Dashboard Autocarros - Sistema de Gestão de Inspeções`,
            margin,
            doc.page.height - 30,
            { width: contentWidth, align: 'center' }
          );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateExcelReport(
  companyId: string,
  filters?: ReportFilters
): Promise<Buffer> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  const buses = await prisma.bus.findMany({
    where: {
      companyId,
      ...(filters?.busIds && filters.busIds.length > 0
        ? { id: { in: filters.busIds } }
        : {}),
    },
    include: {
      inspections: {
        orderBy: { type: 'asc' },
        ...(filters?.inspectionTypes && filters.inspectionTypes.length > 0
          ? { where: { type: { in: filters.inspectionTypes } } }
          : {}),
      },
    },
    orderBy: { matricula: 'asc' },
  });

  const stats = await getInspectionStats(companyId, filters);

  const ExcelJS = loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Relatório de Inspeções');

  // Cabeçalho principal
  worksheet.mergeCells('A1:F1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'RELATÓRIO DE INSPEÇÕES';
  titleCell.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1e40af' }, // Azul escuro
  };
  worksheet.getRow(1).height = 30;

  // Informações da empresa
  worksheet.mergeCells('A2:F2');
  const companyCell = worksheet.getCell('A2');
  companyCell.value = company?.name || 'N/A';
  companyCell.font = { size: 14, bold: true };
  companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 25;

  worksheet.mergeCells('A3:F3');
  const dateCell = worksheet.getCell('A3');
  dateCell.value = `Gerado em: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT')}`;
  dateCell.font = { size: 10, color: { argb: 'FF64748b' } };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(3).height = 20;

  // Espaçamento
  worksheet.getRow(4).height = 10;

  // Estatísticas Gerais
  worksheet.mergeCells('A5:F5');
  const statsTitleCell = worksheet.getCell('A5');
  statsTitleCell.value = 'ESTATÍSTICAS GERAIS';
  statsTitleCell.font = { size: 14, bold: true, color: { argb: 'FF1e40af' } };
  statsTitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(5).height = 25;

  // Caixas de estatísticas
  const statRow = 6;
  const statCols = ['A', 'B', 'C', 'D'];
  const statLabels = ['Total', 'OK', 'Próximas', 'Expiradas'];
  const statValues = [stats.total, stats.ok, stats.warning, stats.expired];
  const statColors = ['FFe0e7ff', 'FFd1fae5', 'FFfef3c7', 'FFfee2e2']; // Azul, Verde, Amarelo, Vermelho
  const statTextColors = ['FF1e40af', 'FF059669', 'FFd97706', 'FFdc2626'];

  statLabels.forEach((label, index) => {
    const col = statCols[index];
    const labelCell = worksheet.getCell(`${col}${statRow}`);
    const valueCell = worksheet.getCell(`${col}${statRow + 1}`);

    labelCell.value = label;
    labelCell.font = { size: 10, color: { argb: 'FF64748b' } };
    labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    labelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: statColors[index] },
    };
    labelCell.border = {
      top: { style: 'thin', color: { argb: 'FFcbd5e1' } },
      left: { style: 'thin', color: { argb: 'FFcbd5e1' } },
      bottom: { style: 'thin', color: { argb: 'FFcbd5e1' } },
      right: { style: 'thin', color: { argb: 'FFcbd5e1' } },
    };

    valueCell.value = statValues[index];
    valueCell.font = { size: 18, bold: true, color: { argb: statTextColors[index] } };
    valueCell.alignment = { horizontal: 'center', vertical: 'middle' };
    valueCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: statColors[index] },
    };
    valueCell.border = {
      top: { style: 'thin', color: { argb: 'FFcbd5e1' } },
      left: { style: 'thin', color: { argb: 'FFcbd5e1' } },
      bottom: { style: 'thin', color: { argb: 'FFcbd5e1' } },
      right: { style: 'thin', color: { argb: 'FFcbd5e1' } },
    };

    worksheet.getColumn(col).width = 15;
  });

  worksheet.getRow(statRow).height = 25;
  worksheet.getRow(statRow + 1).height = 40;

  // Espaçamento
  worksheet.getRow(statRow + 2).height = 15;

  // Cabeçalho da tabela de detalhes
  let row = statRow + 3;
  worksheet.mergeCells(`A${row}:F${row}`);
  const detailsTitleCell = worksheet.getCell(`A${row}`);
  detailsTitleCell.value = 'DETALHES POR AUTOCARRO';
  detailsTitleCell.font = { size: 14, bold: true, color: { argb: 'FF1e40af' } };
  detailsTitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(row).height = 25;
  row++;

  // Cabeçalho da tabela
  const headerCells = [
    { col: 'A', value: 'Matrícula' },
    { col: 'B', value: 'Tipo de Inspeção' },
    { col: 'C', value: 'Última Inspeção' },
    { col: 'D', value: 'Próxima Inspeção' },
    { col: 'E', value: 'Dias Restantes' },
    { col: 'F', value: 'Status' },
  ];

  headerCells.forEach(({ col, value }) => {
    const cell = worksheet.getCell(`${col}${row}`);
    cell.value = value;
    cell.font = { size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1e40af' },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });

  worksheet.getRow(row).height = 30;
  row++;

  const typeLabels: Record<InspectionType, string> = {
    EXTINTORES: 'Extintores',
    PNEUS: 'Pneus',
    REVISOES: 'Revisões',
    LICENCAS_TCC: 'Licenças TCC',
    LICENCAS_COMUNITARIAS: 'Licenças Comunitárias',
    INSPECOES: 'Inspeções',
  };

  buses.forEach((bus, busIndex) => {
    if (bus.inspections.length === 0) {
      // Autocarro sem inspeções
      worksheet.mergeCells(`A${row}:F${row}`);
      const noInspCell = worksheet.getCell(`A${row}`);
      noInspCell.value = `${bus.matricula} - Nenhuma inspeção registada`;
      noInspCell.font = { size: 10, italic: true, color: { argb: 'FF64748b' } };
      noInspCell.alignment = { horizontal: 'center', vertical: 'middle' };
      noInspCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFf8fafc' },
      };
      noInspCell.border = {
        top: { style: 'thin', color: { argb: 'FFcbd5e1' } },
        left: { style: 'thin', color: { argb: 'FFcbd5e1' } },
        bottom: { style: 'thin', color: { argb: 'FFcbd5e1' } },
        right: { style: 'thin', color: { argb: 'FFcbd5e1' } },
      };
      worksheet.getRow(row).height = 25;
      row++;
    } else {
      bus.inspections.forEach((inspection, inspIndex) => {
        const lastDate = new Date(inspection.lastInspectionDate).toLocaleDateString('pt-PT');
        const nextDate = inspection.nextInspectionDate
          ? new Date(inspection.nextInspectionDate).toLocaleDateString('pt-PT')
          : 'N/A';

        let status = 'OK';
        let statusColor = 'FF059669'; // Verde
        let fillColor = 'FFd1fae5'; // Verde claro
        let daysRemaining: number | string = 'N/A';

        if (inspection.nextInspectionDate) {
          const next = new Date(inspection.nextInspectionDate);
          next.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          daysRemaining = diffDays;

          if (diffDays < 0) {
            status = 'EXPIRADA';
            statusColor = 'FFdc2626'; // Vermelho
            fillColor = 'FFfee2e2'; // Vermelho claro
          } else if (diffDays <= 30) {
            status = 'PRÓXIMA';
            statusColor = 'FFd97706'; // Laranja
            fillColor = 'FFfef3c7'; // Amarelo claro
          }
        }

        const cells = [
          { col: 'A', value: bus.matricula },
          { col: 'B', value: typeLabels[inspection.type] },
          { col: 'C', value: lastDate },
          { col: 'D', value: nextDate },
          { col: 'E', value: daysRemaining },
          { col: 'F', value: status },
        ];

        cells.forEach(({ col, value }) => {
          const cell = worksheet.getCell(`${col}${row}`);
          cell.value = value;
          cell.font = { size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFcbd5e1' } },
            left: { style: 'thin', color: { argb: 'FFcbd5e1' } },
            bottom: { style: 'thin', color: { argb: 'FFcbd5e1' } },
            right: { style: 'thin', color: { argb: 'FFcbd5e1' } },
          };

          // Colorir linha alternada
          if (inspIndex % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFf8fafc' },
            };
          }

          // Colorir célula de status
          if (col === 'F') {
            cell.font = { size: 10, bold: true, color: { argb: statusColor } };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: fillColor },
            };
          }

          // Colorir célula de dias restantes
          if (col === 'E' && typeof daysRemaining === 'number') {
            if (daysRemaining < 0) {
              cell.font = { size: 10, bold: true, color: { argb: 'FFdc2626' } };
            } else if (daysRemaining <= 30) {
              cell.font = { size: 10, bold: true, color: { argb: 'FFd97706' } };
            }
          }
        });

        worksheet.getRow(row).height = 25;
        row++;
      });
    }

    // Adicionar linha separadora entre autocarros (exceto no último)
    if (busIndex < buses.length - 1) {
      worksheet.getRow(row).height = 5;
      row++;
    }
  });

  // Ajustar largura das colunas
  worksheet.columns = [
    { width: 18 }, // Matrícula
    { width: 22 }, // Tipo
    { width: 18 }, // Última
    { width: 18 }, // Próxima
    { width: 15 }, // Dias Restantes
    { width: 15 }, // Status
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

