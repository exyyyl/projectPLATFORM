# EduPlatform — архитектура Backend (API)

Документ согласован с **EduPlatform_TZ_v1.1** и **EduPlatform_Stack_Guide**.  
Цель: модульный NestJS API с чётким разделением ответственности перед реализацией спринтов 1.x.

## Поток запроса

```
Браузер → Nginx (/api/...) → NestJS (префикс api)
  → JwtAuthGuard (JWT access-token)
  → RolesGuard (student | teacher | admin)
  → Controller
  → Service (бизнес-логика)
      → Prisma → PostgreSQL
      → FilesService → MinIO
      → NotificationsService → notifications
  ← JSON
```

- **Локально** (порт 3000): `http://localhost:3000/api/...`
- **Через Nginx**: `http://localhost/api/...` (путь передаётся без изменения)

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
| **auth** | `AuthService` | `POST /auth/login`, `/auth/admin/login`, `/refresh`, `/logout` | Общая проверка email/пароля; admin-вход проверяет роль до выдачи токенов; JWT access + refresh в httpOnly cookie |
| **users** | `UsersService` | `GET/PUT /users/me` | Профиль текущего пользователя, смена пароля |
| **admin** | делегирует в Users/Groups/Disciplines/News | `GET/POST/PUT/DELETE /admin/users`, `/groups`, `/disciplines`, `/news` | CRUD пользователей, групп, дисциплин и новостей. Только `admin` |
| **groups** | `GroupsService` | (через admin API) | Группы студентов, `user_groups` |
| **disciplines** | `DisciplinesService` | (через admin API) | Справочник дисциплин, `discipline_teachers`, `discipline_groups`, конкретные тройки `teaching_assignments` |
| **courses** | `CoursesService` | `GET /courses`, `GET/POST/PUT/DELETE /courses/:id/blocks` | Курс = дисциплина + преподаватель (+ группа). Блоки контента (JSON), скрытие курса (`hidden_courses`) |
| **assignments** | `AssignmentsService` | `GET/POST/PUT/DELETE /assignments` | Задания: `grading_type`, дедлайн, статус draft/published/closed |
| **submissions** | `SubmissionsService` | `POST /assignments/:id/submissions`, `GET .../submissions` | Сдача работ (multipart), попытки, `student_comment`, файлы → MinIO |
| **grades** | `GradesService` | `POST /submissions/:id/grade` | Оценка: зачёт/незачёт или баллы, комментарий, уведомление студенту |
| **chat** | `ChatService` | `GET/POST /assignments/:id/chat` | Чат по заданию (только создание сообщений) |
| **notifications** | `NotificationsService` | `GET/PATCH /notifications` | In-app уведомления, отметка прочитанными |
| **files** | `FilesService` | `GET /files/:token` | MIME + magic bytes, загрузка в MinIO, presigned URL (TTL ~5 мин), без web-root |
| **materials** | `MaterialsService` | `GET/POST /materials` | Учебные материалы (файл или ссылка), связь с курсом/блоком |
| **news** | `NewsService` | `GET /news`, admin CRUD и publish/unpublish | Markdown-новости, черновики, публикация, фильтрация по tenant и роли |
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
                                              → teaching_assignments ← teacher + group
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

**Важно (из ТЗ):** `disciplines` — справочник предмета;
`teaching_assignments` фиксирует административную тройку
«дисциплина + преподаватель + группа» только после создания обеих парных связей
с дисциплиной. Текущая модель `courses` пока хранит
дисциплину и преподавателя; привязка курса к тройному назначению будет выполнена
в вертикальном срезе учебной структуры. Материалы и задания всегда находятся на
уровне **course**, а не discipline.

Планируемый role-scoped read API строится на `teaching_assignments`:

- студент → его `user_groups` → назначения групп → дисциплины и преподаватели;
- преподаватель → назначения по `teacher_id` → дисциплины и группы;
- администратор → все назначения текущего `tenantId`;
- доступ к курсам → совпадение дисциплины и преподавателя курса с разрешённым
  назначением пользователя/группы.

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

Проверка: `GET http://localhost:3000/health`, `GET http://localhost:3000/api/auth/login` (заглушка).

Пакеты для спринта 1.4–1.5 (ещё не установлены): `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`, `class-validator`, `class-transformer`, `@nestjs/swagger`, `minio`, `file-type`, `isomorphic-dompurify`.
