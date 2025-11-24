# 🚀 Guia de Deploy - Docker Stack

Este guia explica como fazer deploy da aplicação usando Docker e Docker Compose.

## 📋 Pré-requisitos

- Docker instalado (versão 20.10+)
- Docker Compose instalado (versão 2.0+)
- Git (para clonar o repositório)

## 🔧 Configuração Inicial

### 1. Clonar o Repositório

```bash
git clone <seu-repositorio>
cd DashboardAutocarros
```

### 2. Configurar Variáveis de Ambiente

Copie o ficheiro `env.example` para `.env`:

```bash
cp env.example .env
```

Edite o ficheiro `.env` e configure:

#### Variáveis Obrigatórias:

```env
# Database
POSTGRES_PASSWORD=sua_password_segura_aqui

# Backend - Gerar chaves seguras
JWT_SECRET=<gerar com: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))">
ENCRYPTION_KEY=<gerar com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Frontend - URL do backend em produção
VITE_API_URL=https://seu-dominio.com
```

### 3. Gerar Chaves de Segurança

Execute no terminal:

```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copie os valores gerados para o ficheiro `.env`.

## 🐳 Deploy Local

### Construir e Iniciar

```bash
docker-compose up -d --build
```

Este comando irá:
1. Construir as imagens Docker do backend e frontend
2. Criar e iniciar os containers (PostgreSQL, Backend, Frontend)
3. Executar migrations automaticamente
4. Iniciar todos os serviços

### Verificar Status

```bash
docker-compose ps
```

Deve ver 3 containers a correr:
- `autocarros-db` (PostgreSQL)
- `autocarros-backend` (API)
- `autocarros-frontend` (React App)

### Ver Logs

```bash
# Todos os serviços
docker-compose logs -f

# Apenas backend
docker-compose logs -f backend

# Apenas frontend
docker-compose logs -f frontend
```

### Aceder à Aplicação

- **Frontend**: http://localhost
- **Backend API**: http://localhost:6000
- **Health Check**: http://localhost:6000/api/health

## 🌐 Deploy em Produção

### Opção 1: Servidor VPS (DigitalOcean, AWS EC2, etc.)

1. **Conectar ao servidor via SSH**

```bash
ssh user@seu-servidor.com
```

2. **Instalar Docker e Docker Compose**

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

3. **Clonar o repositório**

```bash
git clone <seu-repositorio>
cd DashboardAutocarros
```

4. **Configurar `.env`**

```bash
cp env.example .env
nano .env  # ou vim .env
```

Configure todas as variáveis, especialmente:
- `POSTGRES_PASSWORD`: Password forte
- `JWT_SECRET`: Chave gerada
- `ENCRYPTION_KEY`: Chave gerada
- `VITE_API_URL`: URL pública do backend (ex: `https://api.seudominio.com`)

5. **Iniciar os serviços**

```bash
docker-compose up -d --build
```

6. **Configurar Nginx como Reverse Proxy (Opcional mas Recomendado)**

Crie `/etc/nginx/sites-available/autocarros`:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:6000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ativar:

```bash
sudo ln -s /etc/nginx/sites-available/autocarros /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

7. **Configurar SSL com Let's Encrypt**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

### Opção 2: Docker Swarm (Para Alta Disponibilidade)

```bash
# Inicializar swarm
docker swarm init

# Deploy do stack
docker stack deploy -c docker-compose.yml autocarros

# Ver serviços
docker service ls
```

### Opção 3: Portainer (Interface Web)

1. Instalar Portainer:
```bash
docker volume create portainer_data
docker run -d -p 9000:9000 --name=portainer --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer-ce
```

2. Aceder a http://seu-servidor:9000
3. Criar stack usando o ficheiro `docker-compose.yml`

## 🔄 Atualizações

### Atualizar Código

```bash
# Pull do repositório
git pull

# Reconstruir e reiniciar
docker-compose up -d --build
```

### Apenas Reconstruir um Serviço

```bash
docker-compose build backend
docker-compose up -d backend
```

## 🛠️ Comandos Úteis

### Parar Serviços

```bash
docker-compose down
```

### Parar e Remover Volumes (⚠️ Apaga Dados)

```bash
docker-compose down -v
```

### Executar Comandos nos Containers

```bash
# Backend
docker-compose exec backend sh

# PostgreSQL
docker-compose exec postgres psql -U autocarros -d dashboard_autocarros

# Executar migration manualmente
docker-compose exec backend npx prisma migrate deploy
```

### Ver Utilização de Recursos

```bash
docker stats
```

### Backup da Base de Dados

```bash
docker-compose exec postgres pg_dump -U autocarros dashboard_autocarros > backup.sql
```

### Restaurar Base de Dados

```bash
docker-compose exec -T postgres psql -U autocarros dashboard_autocarros < backup.sql
```

## 🐛 Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker-compose logs backend

# Verificar se a porta está em uso
netstat -tulpn | grep 6000
```

### Erro de conexão à base de dados

```bash
# Verificar se PostgreSQL está a correr
docker-compose ps postgres

# Ver logs do PostgreSQL
docker-compose logs postgres
```

### Reconstruir tudo do zero

```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Limpar imagens não utilizadas

```bash
docker system prune -a
```

## 📊 Monitorização

### Health Checks

Os containers têm health checks configurados. Verificar:

```bash
docker-compose ps
```

Status `healthy` indica que o serviço está a funcionar corretamente.

### Logs Centralizados

Para produção, considere usar:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana Loki**
- **Datadog**

## 🔐 Segurança em Produção

1. ✅ Altere todas as passwords padrão
2. ✅ Use HTTPS (SSL/TLS)
3. ✅ Configure firewall (apenas portas necessárias)
4. ✅ Mantenha Docker e imagens atualizados
5. ✅ Configure backups automáticos da base de dados
6. ✅ Use secrets management (Docker Secrets, Vault, etc.)
7. ✅ Configure rate limiting no Nginx
8. ✅ Monitore logs regularmente

## 📝 Notas Importantes

- As migrations são executadas automaticamente no startup do backend
- O frontend é buildado com a variável `VITE_API_URL` no momento da construção
- Para alterar `VITE_API_URL`, reconstrua o frontend: `docker-compose build frontend`
- A base de dados é persistida num volume Docker (`postgres_data`)

