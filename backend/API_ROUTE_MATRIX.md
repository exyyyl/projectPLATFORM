# Матрица маршрутов API

Актуально на 2026-08-10. Это быстрый каталог для frontend. Поля запросов,
примеры ответов и таблицы ошибок находятся в `API_REFERENCE.md` и Swagger.

Обозначения:

- **ready** — реализован с DTO и проверками доступа; основные жизненные сценарии
  покрыты E2E, но отметка не означает отдельный тест на каждую строку таблицы;
- **TODO stub** — route существует технически, но возвращает заглушку и не
  должен использоваться frontend;
- `superadmin` проходит RBAC, но для admin CRUD до реализации tenant-context
  работает в домашнем tenant.

## Public и auth

| Метод и route | Статус | Доступ / вход | Результат |
| --- | --- | --- | --- |
| `GET /health` | ready | public | `{status,timestamp}` |
| `GET /api` | ready | public | служебный plain text |
| `POST /api/auth/register` | ready | только гость; JSON | access JWT + refresh cookie |
| `POST /api/auth/login` | ready | только гость; JSON | access JWT + refresh cookie |
| `POST /api/auth/admin/login` | ready | гость с ролью admin/superadmin; JSON | access JWT + refresh cookie |
| `POST /api/auth/refresh` | ready | refresh cookie | новая пара токенов |
| `POST /api/auth/logout` | ready | refresh cookie | отзыв refresh и очистка cookie |

## Профиль и учебный обзор

| Метод и route | Статус | Роли | Результат |
| --- | --- | --- | --- |
| `GET /api/users/me` | ready | все авторизованные | профиль текущего пользователя |
| `PUT /api/users/me` | ready | все авторизованные | обновлённый профиль |
| `GET /api/academic/overview` | ready | все авторизованные | role-specific группы/дисциплины/курсы/tenant summary |

## Admin: пользователи

| Метод и route | Статус | Вход | Результат |
| --- | --- | --- | --- |
| `GET /api/admin/users` | ready | admin; query page/limit/search/role/isActive | пагинированный список |
| `POST /api/admin/users` | ready | admin; JSON | созданный пользователь |
| `POST /api/admin/users/import` | TODO stub | admin | пока только TODO-message |
| `GET /api/admin/users/:id` | ready | admin | пользователь tenant |
| `PUT /api/admin/users/:id` | ready | admin; JSON | обновлённый пользователь |
| `DELETE /api/admin/users/:id` | ready | admin | деактивированный пользователь |

## Admin: группы

| Метод и route | Статус | Вход | Результат |
| --- | --- | --- | --- |
| `GET /api/admin/groups` | ready | admin; query | пагинированный список |
| `POST /api/admin/groups` | ready | admin; JSON | созданная группа |
| `GET /api/admin/groups/:id` | ready | admin | группа со студентами |
| `PUT /api/admin/groups/:id` | ready | admin; JSON | обновлённая группа |
| `DELETE /api/admin/groups/:id` | ready | admin | удалённая группа |
| `POST /api/admin/groups/:id/students` | ready | admin; `{studentIds}` | группа с обновлённым составом |
| `DELETE /api/admin/groups/:id/students/:studentId` | ready | admin | группа с обновлённым составом |

## Admin: дисциплины и назначения

| Метод и route | Статус | Вход | Результат |
| --- | --- | --- | --- |
| `GET /api/admin/disciplines` | ready | admin; query | пагинированный список |
| `POST /api/admin/disciplines` | ready | admin; JSON | созданная дисциплина |
| `GET /api/admin/disciplines/:id` | ready | admin | дисциплина со связями |
| `PUT /api/admin/disciplines/:id` | ready | admin; JSON | обновлённая дисциплина |
| `DELETE /api/admin/disciplines/:id` | ready | admin | удалённая дисциплина |
| `POST /api/admin/disciplines/:id/teachers` | ready | admin; `{teacherIds}` | обновлённые связи |
| `DELETE /api/admin/disciplines/:id/teachers/:teacherId` | ready | admin | обновлённые связи |
| `POST /api/admin/disciplines/:id/groups` | ready | admin; `{groupIds}` | обновлённые связи |
| `DELETE /api/admin/disciplines/:id/groups/:groupId` | ready | admin | обновлённые связи |
| `POST /api/admin/disciplines/:id/teaching-assignments` | ready | admin; `{teacherId,groupId}` | тройное назначение |
| `DELETE /api/admin/disciplines/:id/teaching-assignments/:assignmentId` | ready | admin | удалённое назначение |

## Шаблоны курса

Все изменения: владелец-teacher, admin tenant или superadmin.

| Метод и route | Статус | Вход | Результат |
| --- | --- | --- | --- |
| `GET /api/course-templates` | ready | — | доступные шаблоны и счётчики |
| `POST /api/course-templates` | ready | template JSON | созданный шаблон |
| `GET /api/course-templates/:id` | ready | — | шаблон, блоки, задания, запуски |
| `PUT /api/course-templates/:id` | ready | partial JSON | обновлённый шаблон, новая version |
| `DELETE /api/course-templates/:id` | ready | — | деактивированный шаблон; запуски сохранены |
| `POST /api/course-templates/:id/runs` | ready | год, семестр, даты, группы | независимый draft-запуск-снимок |
| `GET /api/course-templates/:id/blocks` | ready | — | блоки шаблона |
| `POST /api/course-templates/:id/blocks` | ready | block JSON | созданный блок |
| `PUT /api/course-templates/:id/blocks/:blockId` | ready | partial JSON | обновлённый блок |
| `DELETE /api/course-templates/:id/blocks/:blockId` | ready | — | удалённый блок |
| `GET /api/course-templates/:id/assignments` | ready | — | задания шаблона |
| `POST /api/course-templates/:id/assignments` | ready | assignment template JSON | созданное задание шаблона |
| `PUT /api/course-templates/:id/assignments/:assignmentId` | ready | partial JSON | обновлённое задание |
| `DELETE /api/course-templates/:id/assignments/:assignmentId` | ready | — | удалённое задание |

## Запуски курса, блоки и материалы

| Метод и route | Статус | Роли / вход | Результат |
| --- | --- | --- | --- |
| `GET /api/courses` | ready | student/teacher/admin/superadmin | role-scoped запуски |
| `POST /api/courses` | ready | teacher/admin; legacy direct JSON | ручной draft без шаблона |
| `GET /api/courses/:id` | ready | доступ к курсу/группе | содержимое с фильтрацией студента |
| `PUT /api/courses/:id` | ready | teacher-владелец/admin | обновлённый запуск |
| `POST /api/courses/:id/publish` | ready | teacher-владелец/admin | опубликованный запуск |
| `POST /api/courses/:id/unpublish` | ready | teacher-владелец/admin | draft-запуск |
| `POST /api/courses/:id/archive` | ready | teacher-владелец/admin | read-only архив |
| `GET /api/courses/:id/blocks` | ready | доступ к запуску | блоки запуска |
| `POST /api/courses/:id/blocks` | ready | teacher-владелец/admin; JSON | созданный блок |
| `PUT /api/courses/:id/blocks/:blockId` | ready | teacher-владелец/admin; JSON | обновлённый блок |
| `DELETE /api/courses/:id/blocks/:blockId` | ready | teacher-владелец/admin | удалённый блок |
| `POST /api/courses/:id/groups` | ready | teacher-владелец/admin; IDs | подключённые назначения |
| `DELETE /api/courses/:id/groups/:courseGroupId` | ready | teacher-владелец/admin | отключённая группа |
| `GET /api/courses/:id/groups/:courseGroupId/progress` | ready | teacher-владелец/admin | прогресс студентов |
| `POST /api/courses/:id/materials` | ready | teacher-владелец/admin; JSON metadata | созданный материал и releases |
| `PUT /api/courses/:id/materials/:materialId` | ready | teacher-владелец/admin; JSON | обновлённый материал |
| `PUT /api/courses/:id/materials/:materialId/groups/:courseGroupId/release` | ready | teacher-владелец/admin; action JSON | групповой выпуск |

## Задания запуска

| Метод и route | Статус | Роли / вход | Результат |
| --- | --- | --- | --- |
| `GET /api/courses/:courseId/assignments` | ready | доступ к курсу | teacher/admin: все; student: published/closed |
| `POST /api/courses/:courseId/assignments` | ready | teacher-владелец/admin; JSON | draft-задание |
| `GET /api/assignments/:id` | ready | доступ к курсу | задание; draft скрыт от student |
| `PUT /api/assignments/:id` | ready | teacher-владелец/admin; partial JSON | обновлённое задание |
| `POST /api/assignments/:id/publish` | ready | teacher-владелец/admin | published-задание |
| `POST /api/assignments/:id/close` | ready | teacher-владелец/admin | closed-задание |
| `DELETE /api/assignments/:id` | ready | teacher-владелец/admin | удаляется только draft без сдач |

## Сдачи и приватные файлы

| Метод и route | Статус | Роли / вход | Результат |
| --- | --- | --- | --- |
| `POST /api/assignments/:assignmentId/submissions` | ready | student; multipart `files[]`, `studentComment` | новая попытка и метаданные файлов |
| `GET /api/assignments/:assignmentId/submissions` | ready | teacher-владелец/admin | попытки студентов с файлами и оценками |
| `GET /api/files/:id/download` | ready | владелец сдачи, teacher-владелец курса, admin | presigned URL на приватный объект MinIO |

## Новости и уведомления

| Метод и route | Статус | Роли / вход | Результат |
| --- | --- | --- | --- |
| `GET /api/news` | ready | все авторизованные; query | опубликованные новости роли |
| `GET /api/news/:id` | ready | все авторизованные | доступная новость с Markdown |
| `GET /api/admin/news` | ready | admin | черновики и опубликованные |
| `POST /api/admin/news` | ready | admin; JSON | draft-новость |
| `GET /api/admin/news/:id` | ready | admin | детальная новость |
| `PUT /api/admin/news/:id` | ready | admin; partial JSON | обновлённая новость |
| `POST /api/admin/news/:id/publish` | ready | admin | опубликованная новость |
| `POST /api/admin/news/:id/unpublish` | ready | admin | draft-новость |
| `DELETE /api/admin/news/:id` | ready | admin | удалённая новость |
| `GET /api/notifications` | ready | текущий пользователь | до 100 уведомлений + unreadCount |
| `PATCH /api/notifications/:id/read` | ready | владелец уведомления | прочитанное уведомление |

## Существующие заглушки — frontend не подключать

| Метод и route | Статус | Задуманная роль |
| --- | --- | --- |
| `POST /api/admin/users/import` | TODO stub | admin |
| `POST /api/submissions/:id/grade` | TODO stub | teacher/admin |
| `GET /api/assignments/:assignmentId/chat` | TODO stub | доступ к заданию |
| `POST /api/assignments/:assignmentId/chat` | TODO stub | доступ к заданию |
| `GET /api/materials` | TODO stub | авторизованный |
| `POST /api/materials` | TODO stub | авторизованный |
