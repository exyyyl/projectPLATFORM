# projectPLATFORM

Платформа на финальном стеке: NestJS + Prisma + PostgreSQL, React + Vite + Tailwind + shadcn/ui, MinIO, Nginx, Docker Compose.

## Стек

| Слой | Технологии |
|------|------------|
| Backend | Node.js 20 LTS, TypeScript, NestJS |
| ORM | Prisma + Prisma Migrate |
| БД | PostgreSQL 15 (Docker) |
| Файлы | MinIO (Docker) |
| Frontend | React 18+, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui |
| Состояние | TanStack Query |
| Таблицы | TanStack Table |
| Формы | React Hook Form + Zod |
| Редактор | TipTap |
| PDF | react-pdf (PDF.js) |
| Прокси | Nginx (Docker) |
| Контейнеры | Docker + Docker Compose |

## Быстрый старт (локально)

### 1. Инфраструктура

```bash
cp .env.example .env
docker compose up -d postgres minio minio-init
```

### 2. Backend

```bash
cp backend/.env.example backend/.env
cd backend
npm install
npx prisma migrate dev --name init
npm run start:dev
```

API: http://localhost:3000/health

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: http://localhost:5173 (прокси `/api` → backend)

## Docker (полный стек)

```bash
cp .env.example .env
docker compose up -d
```

- Nginx: http://localhost
- MinIO Console: http://localhost:9001
- PostgreSQL: localhost:5432

## Структура

```
├── backend/          # NestJS + Prisma
├── frontend/         # React + Vite
├── nginx/            # Reverse proxy
├── docker-compose.yml
└── .env.example
```

## Post-MVP

- PWA: `vite-plugin-pwa` + `web-push` (VAPID)
- Деплой: Coolify на Oracle Cloud (dev) / Hetzner CX21 (MVP)
