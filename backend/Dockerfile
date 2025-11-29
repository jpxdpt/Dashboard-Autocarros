FROM node:20-alpine AS builder

WORKDIR /app

# Instalar OpenSSL e outras dependências necessárias para Prisma
RUN apk add --no-cache openssl1.1-compat libc6-compat

# Copiar ficheiros de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm ci

# Gerar Prisma Client
RUN npx prisma generate

# Copiar código fonte
COPY . .

# Compilar TypeScript
RUN npm run build

# Imagem de produção
FROM node:20-alpine

WORKDIR /app

# Instalar OpenSSL e outras dependências necessárias para Prisma
RUN apk add --no-cache openssl1.1-compat libc6-compat

# Copiar apenas ficheiros necessários
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Gerar Prisma Client na imagem final
RUN npx prisma generate

EXPOSE 6000

# Comando para executar migrations e iniciar servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]

