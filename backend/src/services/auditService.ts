import prisma from '../config/database';

export interface AuditLogData {
  companyId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, { before?: any; after?: any }>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        companyId: data.companyId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        changes: data.changes ? JSON.stringify(data.changes) : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    // Não falhar a operação principal se o log falhar
    console.error('Erro ao criar log de auditoria:', error);
  }
}

export function getClientIp(req: any): string | undefined {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress
  );
}

export function getUserAgent(req: any): string | undefined {
  return req.headers['user-agent'];
}

/**
 * Função helper para criar logs de auditoria
 * @param userId ID do utilizador
 * @param companyId ID da empresa
 * @param action Ação realizada (CREATE, UPDATE, DELETE)
 * @param entityType Tipo de entidade (ex: 'Driver', 'Bus', 'EmailConfig')
 * @param entityId ID da entidade
 * @param oldValue Valor anterior (null para CREATE)
 * @param newValue Novo valor (null para DELETE)
 * @param req Request object para extrair IP e User-Agent
 */
export async function auditLog(
  userId: string,
  companyId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValue: any,
  newValue: any,
  req: any
): Promise<void> {
  try {
    // Preparar changes object
    const changes: Record<string, { before?: any; after?: any }> = {};
    
    if (oldValue && newValue) {
      // Para UPDATE, comparar campos
      const oldObj = typeof oldValue === 'object' ? oldValue : {};
      const newObj = typeof newValue === 'object' ? newValue : {};
      
      const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
      
      for (const key of allKeys) {
        // Não incluir passwords ou dados sensíveis
        if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
          continue;
        }
        
        if (oldObj[key] !== newObj[key]) {
          changes[key] = {
            before: oldObj[key],
            after: newObj[key],
          };
        }
      }
    } else if (newValue) {
      // Para CREATE, mostrar apenas os campos principais
      const newObj = typeof newValue === 'object' ? newValue : {};
      for (const key of Object.keys(newObj)) {
        if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
          continue;
        }
        changes[key] = { after: newObj[key] };
      }
    } else if (oldValue) {
      // Para DELETE, mostrar o que foi removido
      const oldObj = typeof oldValue === 'object' ? oldValue : {};
      for (const key of Object.keys(oldObj)) {
        if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
          continue;
        }
        changes[key] = { before: oldObj[key] };
      }
    }

    await createAuditLog({
      companyId,
      userId,
      action,
      entityType,
      entityId,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
  } catch (error) {
    // Não falhar a operação principal se o log falhar
    console.error('Erro ao criar log de auditoria:', error);
  }
}



