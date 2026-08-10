# EduPlatform Backend

NestJS + Prisma + PostgreSQL + MinIO.

Подробное описание модулей — в [ARCHITECTURE.md](./ARCHITECTURE.md).  
Как читать URL и разделение платформа / admin — в [API.md](./API.md).
Точные контракты реализованных запросов и ответов — в
[API_REFERENCE.md](./API_REFERENCE.md).
Полная матрица routes и отметки `ready` / `TODO stub` — в
[API_ROUTE_MATRIX.md](./API_ROUTE_MATRIX.md).

## Быстрый старт

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev
```

- Health: http://localhost:3000/health
- API: http://localhost:3000/api/...
- Через Nginx: http://localhost/api/...

## Структура `src/modules`

| Папка           | За что отвечает                           |
| --------------- | ----------------------------------------- |
| `auth`          | Вход, JWT, logout                         |
| `users`         | Профиль `/users/me`                       |
| `admin`         | Админка: пользователи, группы, дисциплины |
| `groups`        | Логика групп (используется admin)         |
| `disciplines`   | Логика дисциплин (используется admin)     |
| `courses`       | Курсы и блоки контента                    |
| `course-templates` | Шаблоны и запуски по учебным годам     |
| `assignments`   | Задания                                   |
| `submissions`   | Сдача работ студентами                    |
| `grades`        | Выставление оценок                        |
| `chat`          | Чат по заданию                            |
| `notifications` | Уведомления                               |
| `files`         | MinIO, presigned URL                      |
| `materials`     | Учебные материалы                         |
| `news`          | Новости ВУЗа                              |

Auth, глобальная защита и `/users/me` уже реализованы. Остальные предметные
контроллеры постепенно заменяются с `TODO` на рабочие вертикальные срезы по
[roadmap](./ROADMAP.md).
