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

// CORS - Middleware que garante headers em TODAS as respostas
// DEVE ser o PRIMEIRO middleware para responder ao OPTIONS antes de qualquer outro processamento
app.use((req, res, next) => {
  // Permitir qualquer origem (ou configurar origem específica)
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  // Não definir Access-Control-Allow-Credentials se não usarmos cookies/sessões
  // Se precisares de credentials no futuro, descomentar e usar 'true' como string:
  // res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas
  
  // Responder imediatamente a pedidos OPTIONS (preflight) - CRÍTICO
  // Isto DEVE acontecer ANTES de qualquer outro middleware processar o pedido
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Removido app.use(cors()) - já está tratado pelo middleware manual acima

// express.json() só deve processar pedidos que não sejam OPTIONS
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next(); // Já foi tratado acima, mas garantir que não processa body
  }
  express.json()(req, res, next);
});

// Rate limiting - ignorar pedidos OPTIONS (preflight)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Muitos pedidos deste IP, tente novamente mais tarde.',
  skip: (req) => req.method === 'OPTIONS', // Ignorar preflight requests
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas de login
  message: 'Muitas tentativas de login, tente novamente mais tarde.',
  skipSuccessfulRequests: true,
  skip: (req) => req.method === 'OPTIONS', // Ignorar preflight requests
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', platform: 'vercel' });
});

// Exportar para Vercel Serverless Functions
export default app;

