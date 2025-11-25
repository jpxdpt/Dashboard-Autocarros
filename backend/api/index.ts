import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from '../src/routes/auth';
import busesRoutes from '../src/routes/buses';
import inspectionsRoutes from '../src/routes/inspections';
import reportsRoutes from '../src/routes/reports';
import mileageRoutes from '../src/routes/mileage';
import driversRoutes from '../src/routes/drivers';
import settingsRoutes from '../src/routes/settings';

const app = express();

// CORS - configurar antes de qualquer middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'false');
  
  // Responder imediatamente a pedidos OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Também usar o middleware cors como backup
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', platform: 'vercel' });
});

// Exportar para Vercel Serverless Functions
export default app;

