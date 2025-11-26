import express from 'express';
import rateLimit from 'express-rate-limit';
import authRoutes from '../src/routes/auth';
import busesRoutes from '../src/routes/buses';
import inspectionsRoutes from '../src/routes/inspections';
import reportsRoutes from '../src/routes/reports';
import mileageRoutes from '../src/routes/mileage';
import driversRoutes from '../src/routes/drivers';
import settingsRoutes from '../src/routes/settings';

const app = express();

// ============================================
// CORS - DEVE SER O PRIMEIRO MIDDLEWARE!
// NADA pode ser executado antes disto!
// ============================================

// Handler GLOBAL para OPTIONS - captura TODOS os OPTIONS antes de QUALQUER outra coisa
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  return res.status(200).end();
});

// Middleware CORS - aplica headers a TODAS as respostas
// Responde a OPTIONS ANTES de qualquer outro middleware processar
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // CRÍTICO: Responder a OPTIONS ANTES de qualquer outro middleware
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// ============================================
// SÓ AGORA é que aplicamos outros middlewares
// ============================================

// express.json() - só processa pedidos que não sejam OPTIONS
app.use(express.json());

// Rate limiting - configurado para ignorar OPTIONS (mas já foram tratados acima)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Muitos pedidos deste IP, tente novamente mais tarde.',
  skip: (req) => req.method === 'OPTIONS',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Muitas tentativas de login, tente novamente mais tarde.',
  skipSuccessfulRequests: true,
  skip: (req) => req.method === 'OPTIONS',
});

// Rate limiting aplicado DEPOIS do CORS
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', platform: 'vercel' });
});

// Exportar para Vercel Serverless Functions
export default app;

