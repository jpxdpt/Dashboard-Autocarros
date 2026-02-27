# 🚀 Deploy no Vercel - Guia Completo

## ⚠️ Importante

O **frontend** pode ser deployado no Vercel, mas o **backend** precisa de estar noutro serviço porque:
- O Vercel é otimizado para sites estáticos e serverless functions
- O backend Express precisa de correr continuamente (não é serverless)
- Recomendação: **Frontend no Vercel** + **Backend no Railway/Render**

## 📋 Pré-requisitos

1. ✅ Vercel CLI instalado e autenticado
2. ✅ Backend deployado noutro serviço (Railway, Render, etc.)
3. ✅ URL do backend disponível

## 🎯 Passo 1: Deploy do Backend (Railway ou Render)

### Opção A: Railway (Recomendado)

1. Aceder a [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Selecionar o repositório e pasta `backend`
4. Adicionar PostgreSQL database
5. Configurar variáveis de ambiente:
   ```
   DATABASE_URL=<da base de dados>
   PORT=6000
   JWT_SECRET=<sua chave>
   ENCRYPTION_KEY=<sua chave>
   NODE_ENV=production
   ```
6. Copiar a URL do backend (ex: `https://seu-backend.railway.app`)

### Opção B: Render

1. Aceder a [render.com](https://render.com)
2. New → Web Service
3. Conectar repositório GitHub
4. Configurar:
   - Build: `cd backend && npm install && npm run build && npx prisma generate && npx prisma migrate deploy`
   - Start: `cd backend && npm start`
5. Adicionar PostgreSQL
6. Configurar variáveis de ambiente
7. Copiar URL do backend

## 🎯 Passo 2: Deploy do Frontend no Vercel

### Via CLI (Atual)

```bash
cd frontend
vercel
```

Seguir as instruções:
- Set up and deploy? **Y**
- Which scope? (escolher a sua conta)
- Link to existing project? **N** (primeira vez) ou **Y** (atualizações)
- Project name: `dashboard-autocarros` (ou outro nome)
- Directory: `./` (já está na pasta frontend)
- Override settings? **N**

### Configurar Variável de Ambiente

Após o primeiro deploy, configurar a URL do backend:

```bash
vercel env add VITE_API_URL
```

Quando perguntar:
- Value: `https://seu-backend.railway.app` (ou URL do seu backend)
- Environment: Production, Preview, Development (escolher todos)

Ou via dashboard do Vercel:
1. Aceder ao projeto no Vercel
2. Settings → Environment Variables
3. Adicionar:
   - Name: `VITE_API_URL`
   - Value: `https://seu-backend.railway.app`
   - Environments: Production, Preview, Development

### Redeploy após adicionar variável

```bash
cd frontend
vercel --prod
```

## 🔄 Atualizações Futuras

### Atualizar Frontend

```bash
cd frontend
git pull  # ou fazer alterações
vercel --prod
```

### Atualizar Backend

O backend atualiza automaticamente se estiver ligado ao GitHub (Railway/Render).

## 🌐 Domínio Personalizado (Opcional)

No dashboard do Vercel:
1. Settings → Domains
2. Adicionar domínio personalizado
3. Configurar DNS conforme instruções

## 🔍 Verificar Deploy

1. Frontend: Aceder à URL fornecida pelo Vercel
2. Backend: Testar `https://seu-backend.railway.app/api/health`
3. Verificar se o frontend consegue comunicar com o backend

## 🐛 Troubleshooting

### Frontend não consegue comunicar com backend

1. Verificar se `VITE_API_URL` está configurada no Vercel
2. Verificar CORS no backend (deve permitir o domínio do Vercel)
3. Verificar se o backend está acessível publicamente

### Erro de build no Vercel

1. Verificar logs: `vercel logs`
2. Verificar se todas as dependências estão no `package.json`
3. Verificar se o `vercel.json` está correto

### CORS Errors

No backend (`backend/src/server.ts`), garantir que CORS permite o domínio do Vercel:

```typescript
app.use(cors({
  origin: [
    'http://localhost:8081',
    'https://seu-projeto.vercel.app',
    'https://guidedportugal.tech'
  ],
  credentials: true
}));
```

## 📝 Estrutura Final

```
Frontend (Vercel)
  └─ https://dashboard-autocarros.vercel.app
       │
       └─ API Calls → Backend (Railway/Render)
                        └─ https://backend.railway.app
                             │
                             └─ Database (PostgreSQL)
```

## ✅ Checklist de Deploy

- [ ] Backend deployado (Railway/Render)
- [ ] Backend acessível publicamente
- [ ] CORS configurado no backend
- [ ] Frontend deployado no Vercel
- [ ] Variável `VITE_API_URL` configurada
- [ ] Testar login/registro
- [ ] Testar todas as funcionalidades
- [ ] Configurar domínio personalizado (opcional)

