# Dashboard Autocarros

Sistema de gestão de manutenção e inspeções de autocarros com autenticação multi-tenant, relatórios e notificações por email.

## 🚀 Tecnologias

- **Backend**: Node.js, Express, TypeScript, Prisma, PostgreSQL
- **Frontend**: React, Vite, TypeScript, TailwindCSS
- **Autenticação**: JWT com refresh tokens
- **Base de Dados**: PostgreSQL
- **Containerização**: Docker & Docker Compose

## 📋 Pré-requisitos

- Docker e Docker Compose instalados
- Git (para clonar o repositório)

## 🐳 Deploy com Docker

### 1. Clonar o repositório

```bash
git clone <seu-repositorio>
cd DashboardAutocarros
```

### 2. Configurar variáveis de ambiente

Copie o ficheiro `.env.example` para `.env` e configure as variáveis:

```bash
cp .env.example .env
```

Edite o ficheiro `.env` e configure:

- `POSTGRES_PASSWORD`: Password segura para a base de dados
- `JWT_SECRET`: Chave secreta para JWT (gerar com: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)
- `ENCRYPTION_KEY`: Chave de encriptação de 64 caracteres hex (gerar com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `VITE_API_URL`: URL do backend (em produção, use o domínio real)

### 3. Construir e iniciar os containers

```bash
docker-compose up -d --build
```

### 4. Verificar os logs

```bash
# Ver todos os logs
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 5. Aceder à aplicação

- **Frontend**: http://localhost
- **Backend API**: http://localhost:6000
- **Health Check**: http://localhost:6000/api/health

## 🔧 Comandos Úteis

### Parar os containers

```bash
docker-compose down
```

### Parar e remover volumes (⚠️ apaga dados)

```bash
docker-compose down -v
```

### Reconstruir apenas um serviço

```bash
docker-compose build backend
docker-compose up -d backend
```

### Executar migrations manualmente

```bash
docker-compose exec backend npx prisma migrate deploy
```

### Aceder à base de dados

```bash
docker-compose exec postgres psql -U autocarros -d dashboard_autocarros
```

### Ver logs em tempo real

```bash
docker-compose logs -f --tail=100
```

## 📁 Estrutura do Projeto

```
DashboardAutocarros/
├── backend/          # API Node.js/Express
│   ├── src/
│   ├── prisma/
│   └── Dockerfile
├── frontend/         # Aplicação React
│   ├── src/
│   └── Dockerfile
├── docker-compose.yml
└── .env
```

## 🔐 Segurança

- ✅ Passwords encriptadas com bcrypt
- ✅ JWT tokens com expiração
- ✅ Rate limiting nas APIs
- ✅ CORS configurado
- ✅ Passwords SMTP encriptadas (reversível)
- ⚠️ **IMPORTANTE**: Altere todas as passwords padrão em produção!

## 📧 Configuração de Email

Após o primeiro login, configure as notificações por email em:
- Dashboard → Configurações → Notificações por Email

## 🛠️ Desenvolvimento Local

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📝 Migrations

As migrations são executadas automaticamente no startup do backend. Para executar manualmente:

```bash
cd backend
npx prisma migrate deploy
```

## 🐛 Troubleshooting

### Erro de conexão à base de dados

Verifique se o container do PostgreSQL está a correr:
```bash
docker-compose ps
```

### Erro de permissões

Se tiver problemas de permissões no Linux/Mac:
```bash
sudo chown -R $USER:$USER .
```

### Limpar tudo e recomeçar

```bash
docker-compose down -v
docker-compose up -d --build
```

## 📄 Licença

ISC
