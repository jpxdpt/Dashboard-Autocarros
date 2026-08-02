import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import prisma from '../config/database';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function hasSmtpConfiguration(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function getAlertRecipients(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { email: true },
  });

  return [...new Set(users.map(({ email }) => email.trim().toLowerCase()).filter(Boolean))];
}

export interface EmailAlertData {
  matricula: string;
  inspectionType: string;
  lastInspectionDate: Date;
  nextInspectionDate: Date;
  daysUntilDue: number;
}

export async function sendInspectionAlert(data: EmailAlertData): Promise<boolean> {
  try {
    if (!hasSmtpConfiguration()) {
      console.error('SMTP não configurado; alerta não enviado');
      return false;
    }
    const emailFrom = process.env.EMAIL_FROM || 'noreply@guidedportugal.tech';
    const recipients = await getAlertRecipients();

    if (recipients.length === 0) {
      console.error('Não existem contas ativas com email para receber alertas');
      return false;
    }

    const subject = `⚠️ Alerta: Inspeção próxima do vencimento - ${data.matricula}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f39c12; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .alert-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
            .info-row { margin: 10px 0; }
            .label { font-weight: bold; color: #555; }
            .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>⚠️ Alerta de Inspeção</h2>
            </div>
            <div class="content">
              <div class="alert-box">
                <strong>Atenção!</strong> A inspeção do autocarro <strong>${data.matricula}</strong> está próxima do vencimento.
              </div>
              
              <div class="info-row">
                <span class="label">Matrícula:</span> ${data.matricula}
              </div>
              <div class="info-row">
                <span class="label">Tipo de Inspeção:</span> ${data.inspectionType}
              </div>
              <div class="info-row">
                <span class="label">Última Inspeção:</span> ${data.lastInspectionDate.toLocaleDateString('pt-PT')}
              </div>
              <div class="info-row">
                <span class="label">Próxima Inspeção:</span> ${data.nextInspectionDate.toLocaleDateString('pt-PT')}
              </div>
              <div class="info-row">
                <span class="label">Dias até ao vencimento:</span> <strong>${data.daysUntilDue} dias</strong>
              </div>
            </div>
            <div class="footer">
              <p>Este é um email automático do sistema de gestão de manutenção de autocarros.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Alerta de Inspeção

Atenção! A inspeção do autocarro ${data.matricula} está próxima do vencimento.

Matrícula: ${data.matricula}
Tipo de Inspeção: ${data.inspectionType}
Última Inspeção: ${data.lastInspectionDate.toLocaleDateString('pt-PT')}
Próxima Inspeção: ${data.nextInspectionDate.toLocaleDateString('pt-PT')}
Dias até ao vencimento: ${data.daysUntilDue} dias
    `;

    await transporter.sendMail({
      from: emailFrom,
      to: recipients,
      subject,
      text,
      html,
    });

    console.log(`Email de alerta enviado para ${recipients.length} contas sobre ${data.matricula} - ${data.inspectionType}`);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email de alerta:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<boolean> {
  try {
    const emailFrom = process.env.EMAIL_FROM || 'noreply@guidedportugal.tech';
    const resetUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
      : `https://guidedportugal.tech/reset-password?token=${resetToken}`;

    const subject = 'Redefinição de Password - Dashboard Autocarros';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
            .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Redefinição de Password</h2>
            </div>
            <div class="content">
              <p>Olá ${name},</p>
              <p>Recebemos um pedido para redefinir a password da sua conta.</p>
              <p>Clique no botão abaixo para redefinir a sua password:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Redefinir Password</a>
              </div>
              <p>Ou copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
              <div class="warning">
                <strong>⚠️ Atenção:</strong> Este link expira em 1 hora. Se não solicitou esta redefinição, ignore este email.
              </div>
            </div>
            <div class="footer">
              <p>Este é um email automático do sistema de gestão de manutenção de autocarros.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Redefinição de Password

Olá ${name},

Recebemos um pedido para redefinir a password da sua conta.

Aceda ao seguinte link para redefinir a sua password:
${resetUrl}

⚠️ Atenção: Este link expira em 1 hora. Se não solicitou esta redefinição, ignore este email.
    `;

    await transporter.sendMail({
      from: emailFrom,
      to: email,
      subject,
      text,
      html,
    });

    console.log(`Email de reset de password enviado para ${email}`);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email de reset de password:', error);
    return false;
  }
}

export async function verifyEmailConfig(): Promise<boolean> {
  try {
    if (!hasSmtpConfiguration()) {
      console.error('SMTP não configurado: defina SMTP_HOST, SMTP_USER, SMTP_PASS e EMAIL_FROM');
      return false;
    }
    await transporter.verify();
    console.log('Configuração de email verificada com sucesso');
    return true;
  } catch (error) {
    console.error('Erro na configuração de email:', error);
    return false;
  }
}

