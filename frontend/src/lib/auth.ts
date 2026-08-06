/**
 * Access-токен живёт только в памяти модуля: после перезагрузки страницы он
 * теряется и восстанавливается силентным refresh'ем по HttpOnly-куке.
 * Так его не достать через XSS, в отличие от localStorage.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}
