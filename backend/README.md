# EduPlatform Backend

NestJS + Prisma + PostgreSQL + MinIO.

Подробное описание модулей — в [ARCHITECTURE.md](./ARCHITECTURE.md).  
Как читать URL и разделение платформа / admin — в [API.md](./API.md).

## Быстрый старт

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev
```

- Health: http://localhost:3000/health  
- API: http://localhost:3000/v1/...  
- Через Nginx: http://localhost/api/v1/...

## Структура `src/modules`

| Папка | За что отвечает |
|-------|----------------|
| `auth` | Вход, JWT, logout |
| `users` | Профиль `/users/me` |
| `admin` | Админка: пользователи, группы, дисциплины |
| `groups` | Логика групп (используется admin) |
| `disciplines` | Логика дисциплин (используется admin) |
| `courses` | Курсы и блоки контента |
| `assignments` | Задания |
| `submissions` | Сдача работ студентами |
| `grades` | Выставление оценок |
| `chat` | Чат по заданию |
| `notifications` | Уведомления |
| `files` | MinIO, presigned URL |
| `materials` | Учебные материалы |
| `news` | Новости ВУЗа |

Сейчас контроллеры возвращают заглушки `TODO` — каркас для поэтапной реализации по ТЗ.
