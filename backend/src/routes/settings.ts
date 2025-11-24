import { Router, Response } from 'express';
import prisma from '../config/database';
import { z } from 'zod';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { auditLog } from '../services/auditService';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const router = Router();

// Chave de encriptação (em produção, usar variável de ambiente)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.warn('⚠️  ENCRYPTION_KEY não definida! As passwords não podem ser desencriptadas após reinício do servidor.');
  console.warn('⚠️  Defina ENCRYPTION_KEY no ficheiro .env com uma string de 64 caracteres hexadecimais.');
}
const ALGORITHM = 'aes-256-cbc';

function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY não está configurada. Defina-a no ficheiro .env');
  }
  const key = ENCRYPTION_KEY.length === 64 
    ? Buffer.from(ENCRYPTION_KEY, 'hex')
    : crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY não está configurada. Defina-a no ficheiro .env');
  }
  const key = ENCRYPTION_KEY.length === 64 
    ? Buffer.from(ENCRYPTION_KEY, 'hex')
    : crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const parts = text.split(':');
  if (parts.length !== 2) {
    throw new Error('Formato de password encriptada inválido');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

const emailConfigSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP Host é obrigatório'),
  smtpPort: z.number().int().min(1).max(65535),
  smtpSecure: z.boolean(),
  smtpUser: z.string().email('Email SMTP inválido'),
  smtpPassword: z.string().optional().transform(val => {
    // Transformar strings vazias em undefined
    return val && val.trim() !== '' ? val.trim() : undefined;
  }),
  emailFrom: z.string().email('Email de origem inválido'),
  emailTo: z.string().email('Email de destino inválido'),
  alertDaysBefore: z.number().int().min(1).max(365).default(30),
  isEnabled: z.boolean().default(true),
});

// GET /api/settings/email - Obter configuração de email
router.get('/email', authenticate, authorize(UserRole.ADMIN, UserRole.GESTOR), async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      console.error('❌ companyId não encontrado no request');
      console.error('Request user:', req.user);
      return res.status(400).json({ error: 'Company ID não encontrado' });
    }

    console.log('🔍 Buscando configuração de email para companyId:', companyId);

    try {
      const config = await prisma.emailConfig.findUnique({
        where: { companyId },
      });

      if (!config) {
        console.log('ℹ️  Nenhuma configuração encontrada para companyId:', companyId);
        return res.json(null);
      }

      console.log('✅ Configuração encontrada:', {
        id: config.id,
        smtpHost: config.smtpHost,
        isEnabled: config.isEnabled,
      });

      // Não retornar a password, apenas indicar se está configurada
      res.json({
        id: config.id,
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpSecure: config.smtpSecure,
        smtpUser: config.smtpUser,
        smtpPassword: config.smtpPassword ? '***' : null, // Não retornar password real
        emailFrom: config.emailFrom,
        emailTo: config.emailTo,
        alertDaysBefore: config.alertDaysBefore,
        isEnabled: config.isEnabled,
        testEmailSent: config.testEmailSent,
        lastTestDate: config.lastTestDate,
      });
    } catch (dbError: any) {
      console.error('❌ Erro na query do Prisma:', dbError);
      console.error('Stack:', dbError.stack);
      throw dbError;
    }
  } catch (error: any) {
    console.error('❌ Erro ao obter configuração de email:', error);
    console.error('Stack:', error.stack);
    console.error('CompanyId:', req.companyId);
    console.error('User:', req.user);
    res.status(500).json({ 
      error: 'Erro ao obter configuração de email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/settings/email - Criar ou atualizar configuração de email
router.post('/email', authenticate, authorize(UserRole.ADMIN, UserRole.GESTOR), async (req: AuthRequest, res: Response) => {
  try {
    console.log('📝 POST /api/settings/email - Iniciando...');
    const companyId = req.companyId!;
    const userId = req.user?.userId;
    
    console.log('📝 CompanyId:', companyId);
    console.log('📝 UserId:', userId);
    console.log('📝 Request body:', { ...req.body, smtpPassword: req.body.smtpPassword ? '***' : undefined });
    
    const validatedData = emailConfigSchema.parse(req.body);
    console.log('✅ Dados validados:', { ...validatedData, smtpPassword: validatedData.smtpPassword ? '***' : undefined });

    // Verificar se já existe configuração
    console.log('🔍 Verificando se já existe configuração...');
    const existing = await prisma.emailConfig.findUnique({
      where: { companyId },
    });
    console.log('🔍 Existing:', existing ? 'Sim' : 'Não');

    // Validar que password é obrigatória se não existe config
    if (!validatedData.smtpPassword && !existing) {
      console.log('❌ Password obrigatória mas não fornecida');
      return res.status(400).json({ error: 'Password SMTP é obrigatória ao criar uma nova configuração' });
    }

    // Se não há password e já existe config, manter a anterior
    const shouldUpdatePassword = validatedData.smtpPassword && validatedData.smtpPassword !== '***';
    console.log('🔐 Deve atualizar password?', shouldUpdatePassword);

    let config;
    if (existing) {
      console.log('📝 Atualizando configuração existente...');
      // Atualizar - se a password não for fornecida ou for '***', manter a anterior
      const passwordToSave = shouldUpdatePassword
        ? encrypt(validatedData.smtpPassword!)
        : existing.smtpPassword;

      try {
        config = await prisma.emailConfig.update({
          where: { companyId },
          data: {
            smtpHost: validatedData.smtpHost,
            smtpPort: validatedData.smtpPort,
            smtpSecure: validatedData.smtpSecure,
            smtpUser: validatedData.smtpUser,
            smtpPassword: passwordToSave,
            emailFrom: validatedData.emailFrom,
            emailTo: validatedData.emailTo,
            alertDaysBefore: validatedData.alertDaysBefore,
            isEnabled: validatedData.isEnabled,
          },
        });
        console.log('✅ Configuração atualizada com sucesso');
      } catch (updateError: any) {
        console.error('❌ Erro ao atualizar configuração:', updateError);
        throw updateError;
      }
    } else {
      console.log('📝 Criando nova configuração...');
      // Criar nova - password é obrigatória
      if (!validatedData.smtpPassword) {
        console.log('❌ Password obrigatória mas não fornecida');
        return res.status(400).json({ error: 'Password SMTP é obrigatória' });
      }

      try {
        config = await prisma.emailConfig.create({
          data: {
            companyId,
            smtpHost: validatedData.smtpHost,
            smtpPort: validatedData.smtpPort,
            smtpSecure: validatedData.smtpSecure,
            smtpUser: validatedData.smtpUser,
            smtpPassword: encrypt(validatedData.smtpPassword),
            emailFrom: validatedData.emailFrom,
            emailTo: validatedData.emailTo,
            alertDaysBefore: validatedData.alertDaysBefore,
            isEnabled: validatedData.isEnabled,
          },
        });
        console.log('✅ Configuração criada com sucesso');
      } catch (createError: any) {
        console.error('❌ Erro ao criar configuração:', createError);
        throw createError;
      }
    }

    if (userId) {
      try {
        // Preparar dados para audit log (sem password)
        const oldValue = existing ? {
          id: existing.id,
          smtpHost: existing.smtpHost,
          smtpPort: existing.smtpPort,
          smtpSecure: existing.smtpSecure,
          smtpUser: existing.smtpUser,
          emailFrom: existing.emailFrom,
          emailTo: existing.emailTo,
          alertDaysBefore: existing.alertDaysBefore,
          isEnabled: existing.isEnabled,
        } : null;
        
        const newValue = {
          id: config.id,
          smtpHost: config.smtpHost,
          smtpPort: config.smtpPort,
          smtpSecure: config.smtpSecure,
          smtpUser: config.smtpUser,
          emailFrom: config.emailFrom,
          emailTo: config.emailTo,
          alertDaysBefore: config.alertDaysBefore,
          isEnabled: config.isEnabled,
        };
        
        await auditLog(userId, companyId, existing ? 'UPDATE' : 'CREATE', 'EmailConfig', config.id, oldValue, newValue, req);
      } catch (auditError: any) {
        // Não falhar a operação principal se o log falhar
        console.error('Erro ao criar log de auditoria:', auditError);
      }
    }

    console.log('📤 Enviando resposta...');
    res.json({
      id: config.id,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpSecure: config.smtpSecure,
      smtpUser: config.smtpUser,
      smtpPassword: '***',
      emailFrom: config.emailFrom,
      emailTo: config.emailTo,
      alertDaysBefore: config.alertDaysBefore,
      isEnabled: config.isEnabled,
    });
    console.log('✅ Resposta enviada com sucesso');
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('Erro ao salvar configuração de email:', error);
    console.error('Stack:', error.stack);
    
    // Mensagem específica para erro de encriptação
    if (error.message?.includes('ENCRYPTION_KEY')) {
      return res.status(500).json({ 
        error: 'Erro de configuração: ENCRYPTION_KEY não está definida',
        details: 'Defina ENCRYPTION_KEY no ficheiro .env com uma string de 64 caracteres hexadecimais'
      });
    }
    
    res.status(500).json({ 
      error: 'Erro ao salvar configuração de email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/settings/email/test - Testar configuração de email
router.post('/email/test', authenticate, authorize(UserRole.ADMIN, UserRole.GESTOR), async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.companyId!;

    const config = await prisma.emailConfig.findUnique({
      where: { companyId },
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuração de email não encontrada' });
    }

    if (!config.isEnabled) {
      return res.status(400).json({ error: 'Configuração de email está desativada' });
    }

    // Desencriptar password
    const decryptedPassword = decrypt(config.smtpPassword);
    
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: decryptedPassword,
      },
    });

    // Enviar email de teste
    await transporter.sendMail({
      from: config.emailFrom,
      to: config.emailTo,
      subject: 'Teste de Configuração - Dashboard Autocarros',
      html: `
        <h2>Email de Teste</h2>
        <p>Este é um email de teste para verificar a configuração do sistema de notificações.</p>
        <p>Se recebeu este email, a configuração está correta!</p>
        <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-PT')}</p>
      `,
    });

    // Atualizar flag de teste
    await prisma.emailConfig.update({
      where: { companyId },
      data: {
        testEmailSent: true,
        lastTestDate: new Date(),
      },
    });

    res.json({ message: 'Email de teste enviado com sucesso!' });
  } catch (error: any) {
    console.error('Erro ao testar configuração de email:', error);
    res.status(500).json({ 
      error: 'Erro ao testar configuração de email',
      details: error.message 
    });
  }
});

export default router;

