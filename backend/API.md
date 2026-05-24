# API — как устроены маршруты

## Откуда берётся URL

```
http://localhost:3000  /  v1  /  admin/users
        │                  │         │
   main.ts (порт)    глобальный   @Controller('admin/users')
                     префикс      + @Get() в контроллере
                     API_PREFIX
```

1. **`main.ts`** — префикс `v1` для всех маршрутов (кроме `/health`).
2. **`*controller.ts`** — папка `src/modules/<имя>/` задаёт путь:
   - `@Controller('auth')` → `/v1/auth/...`
   - `@Controller('admin/users')` → `/v1/admin/users/...`
3. **Метод HTTP** — `@Get()`, `@Post()`, `@Put()`, `@Delete()`.

Файл с эндпоинтами = **контроллер** в `backend/src/modules/**/**.controller.ts`.  
Логика и БД = **сервис** `*.service.ts` (вызывает Prisma).

## Почему `/v1/auth/login` даёт 404 в браузере

В браузере по умолчанию **GET**.  
`login` объявлен как **`@Post('login')`** → нужен **POST**:

```http
POST http://localhost:3000/v1/auth/login
Content-Type: application/json

{"email":"admin@demo.local","password":"demo123"}
```

Пока auth — заглушка; реальный вход будет позже.

## Две зоны API

| Зона | Префикс URL | Кто пользуется | Примеры |
|------|-------------|----------------|---------|
| **Платформа** | `/v1/...` (без `admin`) | студент, преподаватель | `/courses`, `/assignments`, `/users/me` |
| **Админка** | `/v1/admin/...` | только admin | `/admin/users`, `/admin/groups`, `/admin/disciplines` |

На фронте:

- **Общее приложение** (обучение) → запросы к `/v1/courses`, `/v1/auth/login`, …
- **Админ-раздел** → только `/v1/admin/...`

Один backend, разделение по URL и `@Roles(UserRole.admin)` на admin-контроллерах.

## Тестовые запросы (сейчас)

| Действие | Метод | URL |
|----------|-------|-----|
| Health | GET | http://localhost:3000/health |
| Список пользователей (тест) | GET | http://localhost:3000/v1/admin/users |
| Заглушка login | POST | http://localhost:3000/v1/auth/login |

`GET /v1/admin/users` временно с `@Public()` — убрать, когда подключим JWT.

## Демо-данные

```bash
cd backend
npx prisma db seed
```

Создаёт tenant и пользователей `admin@demo.local`, `teacher@demo.local`, `student@demo.local` (пароль `demo123`).

## Через Nginx (Docker)

Фронт ходит на `/api/...` → прокси снимает `/api` → backend видит `/v1/...`:

- http://localhost/api/v1/admin/users
