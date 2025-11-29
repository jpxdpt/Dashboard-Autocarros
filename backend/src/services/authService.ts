import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../config/database';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-key-change-in-production';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

// Validar que os secrets estão configurados
if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
  console.warn('⚠️  AVISO: JWT_SECRET não está configurado corretamente. Use uma chave segura em produção!');
}

if (!REFRESH_TOKEN_SECRET || REFRESH_TOKEN_SECRET === 'your-refresh-secret-key-change-in-production') {
  console.warn('⚠️  AVISO: REFRESH_TOKEN_SECRET não está configurado corretamente. Use uma chave segura em produção!');
}

export interface TokenPayload {
  userId: string;
  companyId: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    if (!password || !hashedPassword) {
      console.error('comparePassword: password ou hashedPassword vazio');
      return false;
    }
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('Erro ao comparar password:', error);
    throw error;
  }
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as string,
  } as SignOptions);
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN as string,
  } as SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
      throw new Error('JWT_SECRET não configurado corretamente');
    }
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error: any) {
    if (error.message) {
      throw new Error(error.message);
    }
    throw new Error('Token inválido ou expirado');
  }
}

export function verifyRefreshToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error('Refresh token inválido ou expirado');
  }
}

export async function createAuthTokens(user: {
  id: string;
  companyId: string;
  email: string;
  role: UserRole;
}): Promise<AuthTokens> {
  const payload: TokenPayload = {
    userId: user.id,
    companyId: user.companyId,
    email: user.email,
    role: user.role,
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

export async function updateLastLogin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLogin: new Date() },
  });
}

export function generatePasswordResetToken(): string {
  return jwt.sign({ type: 'password-reset' }, JWT_SECRET, {
    expiresIn: '1h',
  });
}

export function verifyPasswordResetToken(token: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { type?: string };
    return decoded.type === 'password-reset';
  } catch {
    return false;
  }
}

