import { Router, Request, Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import prisma from '../config/database';
import {
  hashPassword,
  comparePassword,
  createAuthTokens,
  updateLastLogin,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} from '../services/authService';
import { sendPasswordResetEmail } from '../services/emailService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Rate limiter para autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas
  message: 'Muitas tentativas de login, tente novamente mais tarde.',
  skipSuccessfulRequests: true,
});

// OPTIONS já é tratado globalmente no index.ts antes de chegar aqui
// Não precisamos de handler OPTIONS duplicado neste router

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Password deve ter pelo menos 8 caracteres'),
  companyName: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
  role: z.nativeEnum(UserRole).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password é obrigatória'),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email('Email inválido'),
});

const passwordResetSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8, 'Password deve ter pelo menos 8 caracteres'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password atual é obrigatória'),
  newPassword: z.string().min(8, 'Nova password deve ter pelo menos 8 caracteres'),
});

// POST /api/auth/register - Registar novo utilizador e empresa
router.post('/register', async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email já registado' });
    }

    // Criar empresa
    const company = await prisma.company.create({
      data: {
        name: validatedData.companyName,
        email: validatedData.email,
        subscriptionPlan: 'FREE',
      },
    });

    // Criar utilizador admin
    let hashedPassword: string;
    try {
      hashedPassword = await hashPassword(validatedData.password);
    } catch (hashError: any) {
      console.error('Erro ao fazer hash da password:', hashError);
      return res.status(500).json({ error: 'Erro ao processar password' });
    }

    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: validatedData.role || UserRole.ADMIN,
        companyId: company.id,
        emailVerified: true, // Em produção, enviar email de verificação
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
      },
    });

    const tokens = await createAuthTokens({
      id: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
    });

    const response = {
      user,
      company: {
        id: company.id,
        name: company.name,
        subscriptionPlan: company.subscriptionPlan,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };

    res.status(201).json(response);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('Erro ao registar:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Erro ao registar utilizador',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/auth/login - Login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
      include: { company: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Conta desativada' });
    }

    if (!user.company) {
      console.error('Utilizador sem empresa associada:', user.id);
      return res.status(500).json({ error: 'Erro: empresa não encontrada' });
    }

    if (!user.company.isActive) {
      return res.status(403).json({ error: 'Empresa inativa' });
    }

    try {
      const isPasswordValid = await comparePassword(validatedData.password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }
    } catch (passwordError) {
      console.error('Erro ao comparar password:', passwordError);
      return res.status(500).json({ error: 'Erro ao verificar credenciais' });
    }

    await updateLastLogin(user.id);

    const tokens = await createAuthTokens({
      id: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
    });

    const response = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
      },
      company: {
        id: user.company.id,
        name: user.company.name,
        subscriptionPlan: user.company.subscriptionPlan,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };

    res.json(response);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('Erro ao fazer login:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Erro ao fazer login',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/auth/refresh - Renovar token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token não fornecido' });
    }

    const { verifyRefreshToken } = await import('../services/authService');
    const payload = verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { company: true },
    });

    if (!user || !user.isActive || !user.company.isActive) {
      return res.status(401).json({ error: 'Utilizador não encontrado ou inativo' });
    }

    const tokens = await createAuthTokens({
      id: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
    });

    res.json(tokens);
  } catch (error) {
    res.status(401).json({ error: 'Refresh token inválido' });
  }
});

// POST /api/auth/forgot-password - Solicitar reset de password
router.post('/forgot-password', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = passwordResetRequestSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Por segurança, não revelar se o email existe ou não
    if (user) {
      const resetToken = generatePasswordResetToken();
      const resetExpires = new Date(Date.now() + 3600000); // 1 hora

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
        },
      });

      await sendPasswordResetEmail(user.email, user.name, resetToken);
    }

    res.json({
      message: 'Se o email existir, será enviado um link para redefinir a password',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('Erro ao solicitar reset de password:', error);
    res.status(500).json({ error: 'Erro ao processar pedido' });
  }
});

// POST /api/auth/reset-password - Redefinir password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = passwordResetSchema.parse(req.body);

    if (!verifyPasswordResetToken(token)) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    res.json({ message: 'Password redefinida com sucesso' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('Erro ao redefinir password:', error);
    res.status(500).json({ error: 'Erro ao redefinir password' });
  }
});

// POST /api/auth/change-password - Alterar password (requer autenticação)
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado' });
    }

    const isPasswordValid = await comparePassword(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Password atual incorreta' });
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password alterada com sucesso' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('Erro ao alterar password:', error);
    res.status(500).json({ error: 'Erro ao alterar password' });
  }
});

// GET /api/auth/me - Obter utilizador atual
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        isActive: true,
        emailVerified: true,
        lastLogin: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
            email: true,
            subscriptionPlan: true,
            maxBuses: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado' });
    }

    res.json({ user, company: user.company });
  } catch (error) {
    console.error('Erro ao obter utilizador:', error);
    res.status(500).json({ error: 'Erro ao obter utilizador' });
  }
});

export default router;

