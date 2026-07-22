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
import settingsRoutes from './routes/settings';
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
  max: 100, // máximo 100 requests por IP
  message: 'Muitos pedidos deste IP, tente novamente mais tarde.',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas de login
  message: 'Muitas tentativas de login, tente novamente mais tarde.',
  skipSuccessfulRequests: true,
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Rotas públicas
app.use('/api/auth', authRoutes);

// Rotas protegidas (requerem autenticação)
app.use('/api/buses', busesRoutes);
app.use('/api/inspections', inspectionsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/mileage', mileageRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/settings', settingsRoutes);
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

