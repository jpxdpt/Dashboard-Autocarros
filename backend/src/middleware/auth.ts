import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../services/authService';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  user?: TokenPayload;
  companyId?: string;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token de autenticação não fornecido' });
      return;
    }

    const token = authHeader.substring(7);
    
    try {
      const payload = verifyAccessToken(token);

      // Verificar se o utilizador ainda existe e está ativo
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: { company: true },
      });

      if (!user || !user.isActive) {
        res.status(401).json({ error: 'Utilizador não encontrado ou inativo' });
        return;
      }

      if (!user.company.isActive) {
        res.status(403).json({ error: 'Empresa inativa' });
        return;
      }

      req.user = payload;
      req.companyId = payload.companyId;

      next();
    } catch (tokenError: any) {
      console.error('Erro ao verificar token:', tokenError.message);
      res.status(401).json({ error: tokenError.message || 'Token inválido ou expirado' });
    }
  } catch (error: any) {
    console.error('Erro na autenticação:', error);
    res.status(401).json({ error: 'Erro na autenticação' });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        console.error('❌ authorize: req.user não encontrado');
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      if (!roles.includes(req.user.role)) {
        console.error('❌ authorize: Role insuficiente. Requerido:', roles, 'Atual:', req.user.role);
        res.status(403).json({ error: 'Acesso negado. Permissões insuficientes.' });
        return;
      }

      next();
    } catch (error: any) {
      console.error('❌ Erro no middleware authorize:', error);
      res.status(500).json({ error: 'Erro na autorização' });
    }
  };
}

