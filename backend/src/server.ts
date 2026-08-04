import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import busesRoutes from './routes/buses';
import inspectionsRoutes from './routes/inspections';
import reportsRoutes from './routes/reports';
import mileageRoutes from './routes/mileage';
import driversRoutes from './routes/drivers';
import schedulesRoutes from './routes/schedules';
import { checkAndSendAlerts } from './services/alertService';
import { verifyEmailConfig } from './services/emailService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // máximo 500 requests por IP
  message: 'Recebemos demasiados pedidos de uma vez. Aguarda alguns minutos e tenta novamente.',
});

// Nota: o rate limit de login/forgot-password é aplicado em routes/auth.ts
// (aplicá-lo aqui em duplicado fazia com que o contador avançasse 2x por pedido)
app.use('/api/', limiter);

// Rotas públicas
app.use('/api/auth', authRoutes);

// Rotas protegidas (requerem autenticação)
app.use('/api/buses', busesRoutes);
app.use('/api/inspections', inspectionsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/mileage', mileageRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/schedules', schedulesRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Verificar configuração de email ao iniciar
verifyEmailConfig().catch(console.error);

// Agendar verificação de alertas diariamente às 9:00
cron.schedule('0 9 * * *', () => {
  console.log('Executando verificação agendada de alertas...');
  checkAndSendAlerts().catch(console.error);
});

// Opcional: verificar a cada hora (para testes, pode ser removido em produção)
if (process.env.NODE_ENV === 'development') {
  cron.schedule('0 * * * *', () => {
    console.log('Executando verificação de alertas (modo desenvolvimento)...');
    checkAndSendAlerts().catch(console.error);
  });
}

app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
  console.log('Sistema de alertas agendado (verificação diária às 9:00)');
});

