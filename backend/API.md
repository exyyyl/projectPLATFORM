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

Auth уже реализован. Полное описание тела, ответа, cookie и вариантов ошибок:
[API_REFERENCE.md](./API_REFERENCE.md#auth).

## Две зоны API

| Зона          | Префикс URL             | Кто пользуется         | Примеры                                               |
| ------------- | ----------------------- | ---------------------- | ----------------------------------------------------- |
| **Платформа** | `/v1/...` (без `admin`) | студент, преподаватель | `/courses`, `/assignments`, `/users/me`               |
| **Админка**   | `/v1/admin/...`         | только admin           | `/admin/users`, `/admin/groups`, `/admin/disciplines` |

На фронте:

- **Общее приложение** (обучение) → запросы к `/v1/courses`, `/v1/auth/login`, …
- **Админ-раздел** → только `/v1/admin/...`

Один backend, разделение по URL и `@Roles(UserRole.admin)` на admin-контроллерах.

## Реализованные запросы (сейчас)

| Действие                    | Метод | URL                                  |
| --------------------------- | ----- | ------------------------------------ |
| Health                      | GET   | http://localhost:3000/health         |
| Вход                        | POST  | http://localhost:3000/v1/auth/login  |
| Текущий профиль             | GET   | http://localhost:3000/v1/users/me    |
| Обновление профиля          | PUT   | http://localhost:3000/v1/users/me    |
| Список пользователей tenant | GET   | http://localhost:3000/v1/admin/users |

Все маршруты, кроме явно помеченных `@Public()`, защищены глобальным
`JwtAuthGuard`. Для `/v1/admin/**` дополнительно требуется роль `admin`.

## Демо-данные

```bash
cd backend
npx prisma db seed
```

Создаёт tenant, связанные учебные данные и шесть demo-пользователей. Полный
список email выводится командой seed; пароль всех demo-пользователей —
`demo123`.

## Через Nginx (Docker)

Фронт ходит на `/api/...` → прокси снимает `/api` → backend видит `/v1/...`:

- http://localhost/api/v1/admin/users
