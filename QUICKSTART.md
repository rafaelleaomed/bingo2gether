# 🚀 Quick Start Guide - Bingo2Gether

Guia rápido para começar o desenvolvimento.

## ⚡ Setup Rápido (5 minutos)

### 1. Instalar Docker Desktop

- Windows/Mac: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- Ou instale PostgreSQL e Redis manualmente

### 2. Iniciar Banco de Dados

```bash
# Na raiz do projeto
docker-compose up -d
```

### 3. Gerar Secrets

```bash
# Gerar JWT_SECRET e SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Execute 2 vezes e salve os resultados.

### 4. Gerar VAPID Keys

```bash
npm install -g web-push
web-push generate-vapid-keys
```

### 5. Configurar .env Files

**backend/.env:**

```bash
cp backend/.env.example backend/.env
```

Edite `backend/.env` e preencha:

- `JWT_SECRET` (do passo 3)
- `SESSION_SECRET` (do passo 3)
- `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` (do passo 4)
- `VAPID_SUBJECT=mailto:seu-email@example.com`

**frontend/.env:**

```bash
cp .env.example frontend/.env
```

Edite `frontend/.env` e preencha:

- `VITE_VAPID_PUBLIC_KEY` (mesmo do backend)

### 6. Instalar Dependências

```bash
# Root
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 7. Executar Migrations

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 8. Iniciar Desenvolvimento

```bash
# Na raiz do projeto
npm run dev
```

Acesse:

- Frontend: <http://localhost:5173>
- Backend API: <http://localhost:3001>

---

## 📝 Próximos Passos

### Para Desenvolvimento Local (Sem Pagamentos)

Você já pode desenvolver! Os recursos PRO estarão mockados.

### Para Testar Pagamentos

Siga o guia completo em `docs/setup-services.md` para configurar:

1. Stripe (modo test)
2. Mercado Pago (sandbox)
3. Google OAuth
4. Facebook OAuth

---

## 🔧 Comandos Úteis

```bash
# Ver banco de dados
cd backend && npx prisma studio

# Resetar banco de dados
cd backend && npx prisma migrate reset

# Rodar testes
npm test

# Build para produção
npm run build
```

---

## ❓ Problemas Comuns

### Erro: "Port 5432 already in use"

PostgreSQL já está rodando. Pare o serviço ou use Docker.

### Erro: "Cannot connect to database"

Verifique se o Docker está rodando: `docker ps`

### Erro: "Module not found"

Execute `npm install` em cada pasta (root, frontend, backend)

---

## 📚 Documentação Completa

- [Setup de Serviços](docs/setup-services.md) - Configuração detalhada
- [Arquitetura](docs/architecture.md) - Visão geral do sistema
- [API Reference](docs/api.md) - Documentação da API

---

## 🎯 Status Atual

✅ Estrutura do monorepo criada
✅ Docker Compose configurado
✅ Prisma schema definido
✅ Environment templates criados
⏳ Aguardando configuração de serviços externos
⏳ Aguardando implementação do backend
⏳ Aguardando migração do frontend

**Você está na Fase 0: Setup Inicial**

Próxima fase: Backend Core (autenticação + game state)
