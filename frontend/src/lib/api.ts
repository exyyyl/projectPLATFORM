import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/auth'

/**
 * И Vite-прокси, и nginx срезают `/api` перед бэкендом, а тот вешает свои
 * роуты на префикс `/v1` (см. API_PREFIX). Поэтому пути начинаются с `/v1/...`
 * — кроме `/health`, он из префикса исключён.
 */
const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export type ApiFetchOptions = RequestInit & {
  /** Не обновлять токен и не повторять запрос при 401. */
  skipRefresh?: boolean
}

/**
 * Общий на всё приложение запрос обновления токена. Бэкенд ротирует refresh
 * при каждом вызове, поэтому параллельные 401 должны ждать один и тот же
 * запрос, а не запускать ротацию каждый по разу.
 */
let refreshRequest: Promise<string> | null = null

async function toApiError(res: Response): Promise<ApiError> {
  let message = `API error: ${res.status}`

  try {
    const body = (await res.json()) as { message?: string | string[] }
    if (Array.isArray(body.message)) {
      message = body.message.join(', ')
    } else if (body.message) {
      message = body.message
    }
  } catch {
    // тело не JSON — оставляем сообщение по умолчанию
  }

  return new ApiError(res.status, message)
}

function request(
  path: string,
  init: ApiFetchOptions | undefined,
  token: string | null,
) {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    // без этого браузер не отправит и не примет HttpOnly-куку с refresh-токеном
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      // пустой или кривой Authorization бэкенд считает ошибкой, поэтому
      // заголовок добавляется только когда токен реально есть
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
}

/** Меняет refresh-куку на новый access-токен и кладёт его в память. */
export async function refreshAccessToken(): Promise<string> {
  refreshRequest ??= (async () => {
    const res = await request('/v1/auth/refresh', { method: 'POST' }, null)
    if (!res.ok) {
      throw await toApiError(res)
    }

    const { accessToken } = (await res.json()) as { accessToken: string }
    setAccessToken(accessToken)
    return accessToken
  })()

  try {
    return await refreshRequest
  } finally {
    refreshRequest = null
  }
}

export async function apiFetch<T>(
  path: string,
  init?: ApiFetchOptions,
): Promise<T> {
  let res = await request(path, init, getAccessToken())

  // access-токен живёт 15 минут: на первом 401 пробуем обновить его и повторить
  if (res.status === 401 && !init?.skipRefresh) {
    try {
      res = await request(path, init, await refreshAccessToken())
    } catch {
      clearAccessToken()
    }
  }

  if (!res.ok) {
    throw await toApiError(res)
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}
