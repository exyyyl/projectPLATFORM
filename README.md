# projectPLATFORM

Fullstack-платформа: NestJS + Prisma + PostgreSQL, React + Vite + Tailwind + shadcn/ui, MinIO, Nginx, Docker Compose.

## Стек

| Слой | Технологии |
|------|------------|
| Backend | Node.js 22, TypeScript, NestJS 11 |
| ORM | Prisma 7 + Prisma Migrate |
| БД | PostgreSQL 15 (Docker) |
| Аутентификация | JWT (access + refresh), Passport, bcrypt |
| Файлы | MinIO (S3-совместимое хранилище) |
| Frontend | React 19, TypeScript, Vite |
| UI | Tailwind CSS 4, shadcn/ui |
| Роутинг | React Router 7 |
| Состояние | TanStack Query |
| Таблицы | TanStack Table |
| Формы | React Hook Form + Zod |
| Редактор | TipTap |
| PDF | react-pdf (PDF.js) |
| Прокси | Nginx (Docker) |
| Контейнеры | Docker + Docker Compose |

## Требования

- Node.js 22+
- Docker и Docker Compose
- npm

## Быстрый старт

```bash
# 1. Клонировать и настроить переменные окружения
git clone <repo-url> && cd projectPLATFORM
cp .env.example .env
cp backend/.env.example backend/.env

# 2. Установить все зависимости (root + backend + frontend)
npm run setup

# 3. Поднять БД и запустить миграции
npm run docker:up
npm run db:migrate

# 4. Запустить проект (БД + backend + frontend одной командой)
npm run dev
```

- UI: http://localhost:5173
- API: http://localhost:3000
- Health check: http://localhost:3000/health

## Команды

Все команды запускаются из корня проекта.

### Разработка

| Команда | Описание |
|---------|----------|
| `npm run setup` | Установить зависимости (root, backend, frontend) |
| `npm run dev` | Запустить БД + backend + frontend параллельно |
| `npm run dev:backend` | Только backend (NestJS с hot reload) |
| `npm run dev:frontend` | Только frontend (Vite dev server) |

### Сборка

| Команда | Описание |
|---------|----------|
| `npm run build` | Собрать backend и frontend |
| `npm run build:backend` | Собрать только backend |
| `npm run build:frontend` | Собрать только frontend |

### Тесты и линтинг

| Команда | Описание |
|---------|----------|
| `npm run test` | Тесты backend и frontend |
| `npm run test:backend` | Jest (backend) |
| `npm run test:frontend` | Vitest (frontend) |
| `npm run lint` | Линтинг backend и frontend |
| `npm run lint:backend` | ESLint (backend) |
| `npm run lint:frontend` | ESLint (frontend) |

### База данных

| Команда | Описание |
|---------|----------|
| `npm run db:migrate` | Применить миграции Prisma |
| `npm run db:generate` | Сгенерировать Prisma Client |
| `npm run db:studio` | Открыть Prisma Studio |

### Docker

| Команда | Описание |
|---------|----------|
| `npm run docker:up` | Поднять PostgreSQL + MinIO |
| `npm run docker:down` | Остановить все контейнеры |
| `npm run docker:all` | Поднять весь стек (включая backend, frontend, nginx) |

## Docker (полный стек)

```bash
cp .env.example .env
docker compose up -d
```

| Сервис | URL |
|--------|-----|
| Nginx (проксирует всё) | http://localhost |
| MinIO Console | http://localhost:9001 |
| PostgreSQL | localhost:5432 |

## Структура проекта

```
├── backend/              # NestJS + Prisma
│   ├── src/
│   │   ├── modules/      # Модули по фичам
│   │   ├── common/       # Guards, decorators, interceptors
│   │   ├── prisma/       # PrismaService
│   │   └── health/       # Health check
│   └── prisma/
│       ├── schema.prisma # Схема БД
│       └── migrations/   # Миграции
├── frontend/             # React + Vite
│   └── src/
│       ├── components/   # UI-компоненты (ui/, layout/, shared/)
│       ├── pages/        # Страницы
│       ├── features/     # Фичи (components, hooks, types)
│       ├── hooks/        # Глобальные хуки
│       ├── lib/          # Утилиты (api, utils, constants)
│       ├── providers/    # React Context (Query, Theme)
│       └── router.tsx    # Конфигурация роутинга
├── nginx/                # Конфиг reverse proxy
├── docker-compose.yml
├── .env.example
└── package.json          # Корневые скрипты для всего проекта
```

## Переменные окружения

Скопируйте `.env.example` → `.env` и `backend/.env.example` → `backend/.env`. Основные переменные:

| Переменная | По умолчанию | Описание |
|-----------|-------------|----------|
| `POSTGRES_USER` | `platform` | Пользователь PostgreSQL |
| `POSTGRES_PASSWORD` | `platform` | Пароль PostgreSQL |
| `POSTGRES_DB` | `platform` | Имя базы данных |
| `JWT_SECRET` | — | Секрет для access-токенов (мин. 32 символа) |
| `JWT_REFRESH_SECRET` | — | Секрет для refresh-токенов (мин. 32 символа) |
| `MINIO_ROOT_USER` | `minioadmin` | Логин MinIO |
| `MINIO_ROOT_PASSWORD` | `minioadmin` | Пароль MinIO |
