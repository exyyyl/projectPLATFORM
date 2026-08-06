# Домены, маршруты и две frontend-зоны

> Статус решения: **принято для дальнейшей реализации**. Поддомены платформы и
> dashboard остаются раздельными, backend и система пользователей — общими.

## Рекомендуемая схема

Обе frontend-зоны работают с одним NestJS API и одной базой пользователей:

| Зона | Development | Production | API |
| --- | --- | --- | --- |
| Платформа | `http://app.localhost` | `https://app.example.ru` | `/api/**` |
| Админ-панель | `http://dashboard.localhost` | `https://dashboard.example.ru` | `/api/admin/**` |

Поддомен выбирает frontend-приложение, а путь API и guards определяют права.
NestJS не должен доверять одному только имени `dashboard`: каждый контроллер
`/api/admin/**` дополнительно защищён `@Roles(UserRole.admin)`.

`*.localhost` поддерживается современными браузерами как loopback-адрес. Порты
тоже допустимы (`app.localhost:5173`, `dashboard.localhost:5174`), однако удобнее
поставить Nginx на порт 80 и проксировать оба имени.

## Локальная разработка сейчас

В репозитории пока существует одно frontend-приложение. Поэтому текущий Nginx
обслуживает `http://localhost`, а frontend отправляет относительные запросы на
`/api`. Когда появится отдельное приложение dashboard, в compose добавляется
второй frontend-сервис, а Nginx получает два `server`-блока:

```nginx
server {
    listen 80;
    server_name app.localhost;

    location /api/ { proxy_pass http://backend; }
    location / { proxy_pass http://frontend; }
}

server {
    listen 80;
    server_name dashboard.localhost;

    location /api/ { proxy_pass http://backend; }
    location / { proxy_pass http://dashboard; }
}
```

Оба frontend должны использовать `VITE_API_URL=/api`. Тогда при переносе на
реальные домены код запросов не меняется: меняются DNS, TLS-сертификаты и
`server_name` в Nginx.

## Авторизация

- Платформа входит через `POST /api/auth/login`.
- Админ-панель входит через `POST /api/auth/admin/login`.
- Оба маршрута используют один `AuthService`, одну таблицу пользователей и одну
  схему access/refresh-токенов.
- Admin login не выдаёт токены студенту или преподавателю.
- Даже токен администратора проверяется заново на каждом `/api/admin/**` запросе
  глобальными `JwtAuthGuard` и `RolesGuard`.

При запросах через `/api` refresh-cookie является host-only. Поэтому сессии
`app.example.ru` и `dashboard.example.ru` не смешиваются, хотя backend общий.
Это также причина использовать разные `*.localhost`, а не один `localhost` с
разными портами: cookie не разделяются по портам.
