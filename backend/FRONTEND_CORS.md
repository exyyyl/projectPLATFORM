# Frontend, поддомены и CORS

Этот документ предназначен для совместного обсуждения backend и frontend.

## Что защищает CORS

CORS — правило браузера: с какого **origin** JavaScript может обращаться к API.
Origin включает протокол, host и порт. Например,
`https://platform.example.ru` и `https://dashboard.example.ru` — разные origin,
хотя принадлежат одному сайту.

CORS не является авторизацией. Даже разрешённый origin обязан прислать JWT, а
backend всё равно проверяет пользователя, роль, tenant и владение ресурсом.

## Локальная разработка

Frontend работает на `http://localhost:5173` и обращается к относительному
`/api`. Vite проксирует `/api/*` на `http://localhost:3000`, поэтому frontend не
обязан знать адрес production API.

Backend без `CORS_ORIGIN` в development разрешает:

- `http://localhost:5173`;
- `http://localhost`;
- `http://app.localhost`;
- `http://dashboard.localhost`.

Если используется другой порт или host, его нужно явно добавить через
`CORS_ORIGIN`. Порт является частью origin.

## Production

Финальное доменное имя **не требуется сейчас и не мешает development**. Оно
понадобится только при запуске с `NODE_ENV=production`.

Пример переменной окружения:

```env
CORS_ORIGIN=https://platform.example.ru,https://dashboard.example.ru
```

Production намеренно не запускается без непустого allowlist. Это fail-closed:
ошибка конфигурации обнаруживается при деплое, а не превращается в API, доступный
из JavaScript любого сайта. После указания реальных доменов проект запускается
обычно.

Предпочтительная схема — на каждом поддомене reverse proxy принимает
одноимённый `/api/*` и передаёт его одному backend. Для браузера запрос остаётся
same-origin:

```text
https://platform.example.ru/api/*  -> backend
https://dashboard.example.ru/api/* -> тот же backend
```

Отдельный `https://api.example.ru` тоже возможен, но тогда запросы действительно
cross-origin и оба frontend-origin обязательно входят в `CORS_ORIGIN`.

## Что должен сделать frontend

- Использовать относительный base URL `/api`, если API проксируется на том же
  поддомене.
- Для refresh/logout, использующих HttpOnly cookie, отправлять
  `credentials: "include"`.
- При `401` один раз выполнить refresh и повторить исходный запрос; если refresh
  неуспешен — очистить состояние пользователя и открыть login.
- Не считать CORS заменой проверок ролей: скрытие кнопки не ограничивает API.

## Что надо согласовать перед production

- итоговые platform/dashboard hostnames;
- используется ли отдельный API hostname;
- HTTPS и cookie `Secure`/`SameSite`/domain;
- список preview/staging origins;
- Nginx-конфигурацию для обоих поддоменов.
