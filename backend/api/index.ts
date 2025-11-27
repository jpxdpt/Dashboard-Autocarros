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
// CORS - PRIMEIRO MIDDLEWARE ABSOLUTO
// ============================================
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // CRÍTICO: Responder OPTIONS IMEDIATAMENTE, sem passar por rate limiting
  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // 204 No Content é mais correto para OPTIONS
  }
  
  next();
});

// Body parsing
app.use(express.json());

// ============================================
// Rate Limiting - DEPOIS de CORS e apenas para não-OPTIONS
// ============================================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Muitos pedidos deste IP, tente novamente mais tarde.',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Muitas tentativas de login, tente novamente mais tarde.',
  skipSuccessfulRequests: true,
});

// Aplicar rate limiting APENAS às rotas específicas (não globalmente)
// E garantir que OPTIONS nunca chega aqui (já foi tratado acima)
app.use('/api/', (req, res, next) => {
  if (req.method === 'OPTIONS') return next(); // Extra safety
  limiter(req, res, next);
});

// Rate limiter de auth aplicado SÓ aos endpoints POST (não OPTIONS)
app.post('/api/auth/login', authLimiter);
app.post('/api/auth/forgot-password', authLimiter);

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

