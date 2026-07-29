# EduPlatform — архитектура Backend (API)

Документ согласован с **EduPlatform_TZ_v1.1** и **EduPlatform_Stack_Guide**.  
Цель: модульный NestJS API с чётким разделением ответственности перед реализацией спринтов 1.x.

## Поток запроса

```
Браузер → Nginx (/api/...) → NestJS (префикс v1)
  → JwtAuthGuard (JWT access-token)
  → RolesGuard (student | teacher | admin)
  → Controller
  → Service (бизнес-логика)
      → Prisma → PostgreSQL
      → FilesService → MinIO
      → NotificationsService → notifications
  ← JSON
```

- **Локально** (порт 3000): `http://localhost:3000/v1/...`
- **Через Nginx**: `http://localhost/api/v1/...` (префикс `/api` снимается прокси)

Служебный эндпоинт без версии: `GET /health`.

## Структура каталогов

```
backend/
├── prisma/
│   ├── schema.prisma      # доменная модель БД
│   ├── migrations/
│   └── seed.ts            # демо-данные (dev)
├── src/
│   ├── main.ts            # bootstrap, ValidationPipe, CORS
│   ├── app.module.ts      # сборка модулей
│   ├── common/            # guards, decorators, константы
│   ├── prisma/            # PrismaService (DI)
│   ├── health/            # healthcheck
│   └── modules/           # доменные модули (см. ниже)
└── ARCHITECTURE.md
```

## Модули и зоны ответственности

| Модуль | Сервис | HTTP (префикс `v1`) | Ответственность |
|--------|--------|---------------------|-----------------|
| **auth** | `AuthService` | `POST /auth/login`, `/refresh`, `/logout` | Вход по email/паролю, bcrypt (≥12 rounds), JWT access (15 мин) + refresh (7 дней, httpOnly cookie), инвалидация refresh при logout |
| **users** | `UsersService` | `GET/PUT /users/me` | Профиль текущего пользователя, смена пароля |
| **admin** | делегирует в Users/Groups/Disciplines | `GET/POST/PUT/DELETE /admin/users`, `/groups`, `/disciplines`; `POST /admin/users/import` | CRUD пользователей, импорт CSV/Excel, группы, дисциплины, привязки преподавателей и групп. Только `admin` |
| **groups** | `GroupsService` | (через admin API) | Группы студентов, `user_groups` |
| **disciplines** | `DisciplinesService` | (через admin API) | Справочник дисциплин, `discipline_teachers`, `discipline_groups` |
| **courses** | `CoursesService` | `GET /courses`, `GET/POST/PUT/DELETE /courses/:id/blocks` | Курс = дисциплина + преподаватель (+ группа). Блоки контента (JSON), скрытие курса (`hidden_courses`) |
| **assignments** | `AssignmentsService` | `GET/POST/PUT/DELETE /assignments` | Задания: `grading_type`, дедлайн, статус draft/published/closed |
| **submissions** | `SubmissionsService` | `POST /assignments/:id/submissions`, `GET .../submissions` | Сдача работ (multipart), попытки, `student_comment`, файлы → MinIO |
| **grades** | `GradesService` | `POST /submissions/:id/grade` | Оценка: зачёт/незачёт или баллы, комментарий, уведомление студенту |
| **chat** | `ChatService` | `GET/POST /assignments/:id/chat` | Чат по заданию (только создание сообщений) |
| **notifications** | `NotificationsService` | `GET/PATCH /notifications` | In-app уведомления, отметка прочитанными |
| **files** | `FilesService` | `GET /files/:token` | MIME + magic bytes, загрузка в MinIO, presigned URL (TTL ~5 мин), без web-root |
| **materials** | `MaterialsService` | `GET/POST /materials` | Учебные материалы (файл или ссылка), связь с курсом/блоком |
| **news** | `NewsService` | `GET/POST /news` | Объявления администратора (`target_role` опционально) |
| **health** | — | `GET /health` | Проверка живости API |

### Cross-cutting (`src/common`)

| Компонент | Назначение |
|-----------|------------|
| `JwtAuthGuard` | Проверка access JWT, заполнение `request.user` |
| `RolesGuard` | RBAC по декоратору `@Roles()` |
| `@Public()` | Маршруты без авторизации (login, refresh, files token) |
| `@CurrentUser()` | Доступ к payload JWT в контроллере |
| `ValidationPipe` | Глобальная валидация DTO (class-validator — следующий шаг) |

## Модель данных (кратко)

**Multi-tenant:** все ключевые сущности привязаны к `tenant_id`.

```
tenants → users
            ├─ [student] → user_groups → groups
            └─ [teacher] → discipline_teachers → disciplines
                                              → discipline_groups → groups
                                              → courses
                                                    → course_blocks, materials
                                                    → assignments
                                                          → submissions → submission_files, grades
                                                          → chat_messages
users → notifications
tenants → news
users + courses → hidden_courses
audit_logs (сквозной аудит)
```

**Важно (из ТЗ):** `disciplines` — справочник предмета; `courses` — конкретное ведение (предмет + преподаватель + группа). Материалы и задания всегда на уровне **course**, не discipline.

Схема: `prisma/schema.prisma`.

## Безопасность (план реализации)

| Требование | Где реализуется |
|------------|-----------------|
| HTTPS | Nginx + Coolify (prod) |
| JWT + refresh | `AuthModule` |
| RBAC | `RolesGuard` + `@Roles()` |
| Bcrypt пароли | `AuthService` |
| Файлы: MIME + magic bytes | `FilesService` + `file-type` |
| XSS rich-text | DOMPurify в сервисах перед сохранением |
| Rate limit 10 req/min на login | middleware / `@nestjs/throttler` |
| Audit | запись в `audit_logs` из interceptors |

## Зависимости между модулями (логика)

```
SubmissionsService → FilesService, NotificationsService
GradesService      → NotificationsService
MaterialsService   → FilesService
ChatService        → NotificationsService (опционально)
Admin import       → UsersService, GroupsService
CoursesService     → DisciplinesService (проверка доступа)
```

## Roadmap по спринтам (из ТЗ)

1. **Фундамент** — Docker, Prisma migrate, Auth + RBAC, guards (текущий скелет ✓)
2. **Администрирование** — admin/users, groups, disciplines, импорт CSV
3. **Учебный контент** — assignments, materials, MinIO upload
4. **Сдача и оценка** — submissions, grades, chat
5. **Коммуникации** — notifications, news, главная лента
6. **Стабилизация** — Swagger, нагрузочные тесты, audit_logs

## Следующие шаги разработчика

```bash
cd backend
npm install
npx prisma migrate dev --name edu_platform_domain
npm run start:dev
```

Проверка: `GET http://localhost:3000/health`, `GET http://localhost:3000/v1/auth/login` (заглушка).

Пакеты для спринта 1.4–1.5 (ещё не установлены): `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`, `class-validator`, `class-transformer`, `@nestjs/swagger`, `minio`, `file-type`, `isomorphic-dompurify`.
