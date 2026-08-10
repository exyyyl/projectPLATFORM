# API — как устроены маршруты

## Откуда берётся URL

```
http://localhost:3000  /  api  /  admin/users
        │                  │         │
   main.ts (порт)    глобальный   @Controller('admin/users')
                     префикс      + @Get() в контроллере
                     API_PREFIX
```

1. **`main.ts`** — префикс `api` для всех маршрутов (кроме `/health`).
2. **`*controller.ts`** — папка `src/modules/<имя>/` задаёт путь:
   - `@Controller('auth')` → `/api/auth/...`
   - `@Controller('admin/users')` → `/api/admin/users/...`
3. **Метод HTTP** — `@Get()`, `@Post()`, `@Put()`, `@Delete()`.

Файл с эндпоинтами = **контроллер** в `backend/src/modules/**/**.controller.ts`.  
Логика и БД = **сервис** `*.service.ts` (вызывает Prisma).

## Почему `/api/auth/login` даёт 404 в браузере

В браузере по умолчанию **GET**.  
`login` объявлен как **`@Post('login')`** → нужен **POST**:

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{"email":"admin@demo.local","password":"demo123"}
```

Auth уже реализован. Полное описание тела, ответа, cookie и вариантов ошибок:
[API_REFERENCE.md](./API_REFERENCE.md#auth).

## Две зоны API

| Зона          | Префикс URL              | Кто пользуется         | Примеры                                                              |
| ------------- | ------------------------ | ---------------------- | -------------------------------------------------------------------- |
| **Платформа** | `/api/...` (без `admin`) | студент, преподаватель | `/courses`, `/assignments`, `/users/me`                              |
| **Админка**   | `/api/admin/...`         | только admin           | `/admin/users`, `/admin/groups`, `/admin/disciplines`, `/admin/news` |

На фронте:

- **Общее приложение** (обучение) → запросы к `/api/courses`, `/api/auth/login`, …
- **Админ-раздел** → вход через `/api/auth/admin/login`, затем `/api/admin/...`

Один backend, разделение по URL и `@Roles(UserRole.admin)` на admin-контроллерах.

## Реализованные запросы (сейчас)

| Действие                      | Метод | URL                                         |
| ----------------------------- | ----- | ------------------------------------------- |
| Health                        | GET   | http://localhost:3000/health                |
| Вход                          | POST  | http://localhost:3000/api/auth/login        |
| Вход администратора           | POST  | http://localhost:3000/api/auth/admin/login  |
| Текущий профиль               | GET   | http://localhost:3000/api/users/me          |
| Обновление профиля            | PUT   | http://localhost:3000/api/users/me          |
| Обзор по текущей роли         | GET   | http://localhost:3000/api/academic/overview |
| Доступные курсы               | GET   | http://localhost:3000/api/courses           |
| Шаблоны курсов                | GET   | http://localhost:3000/api/course-templates  |
| Задания запуска               | GET   | http://localhost:3000/api/courses/1/assignments |
| Пользователи tenant           | GET   | http://localhost:3000/api/admin/users       |
| Группы tenant                 | GET   | http://localhost:3000/api/admin/groups      |
| Дисциплины и назначения       | GET   | http://localhost:3000/api/admin/disciplines |
| Лента опубликованных новостей | GET   | http://localhost:3000/api/news              |
| Управление новостями          | GET   | http://localhost:3000/api/admin/news        |
| Уведомления                   | GET   | http://localhost:3000/api/notifications     |

Все маршруты, кроме явно помеченных `@Public()`, защищены глобальным
`JwtAuthGuard`. Для `/api/admin/**` дополнительно требуется роль `admin`.
Полный каталог routes и статусов готовности —
[API_ROUTE_MATRIX.md](./API_ROUTE_MATRIX.md), подробные DTO, ответы и ошибки —
[API_REFERENCE.md](./API_REFERENCE.md).

## Демо-данные

```bash
cd backend
npx prisma db seed
```

Создаёт tenant, связанные учебные данные и шесть demo-пользователей. Полный
список email выводится командой seed; пароль всех demo-пользователей —
`demo123`.

Суперадминистратор намеренно не входит в demo-seed. Процедура безопасного
создания описана в [SUPERADMIN.md](./SUPERADMIN.md).

## Через Nginx (Docker)

Фронт ходит на `/api/...`, а прокси передаёт путь backend без изменения:

- http://localhost/api/admin/users

Подробная схема `app.localhost` / `dashboard.localhost` и последующего перехода
на production-домены описана в [ROUTING.md](./ROUTING.md).
