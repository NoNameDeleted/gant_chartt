/**
 * IamTokenProvider — провайдер аутентификации для YDB,
 * который автоматически обновляет IAM-токен через API-ключ сервисного аккаунта.
 *
 * API-ключ сервисного аккаунта Yandex Cloud — статический и не протухает.
 * Это перманентное решение, не требующее регулярного обновления токена.
 *
 * Как получить API-ключ:
 *   1. Создайте сервисный аккаунт в Yandex Cloud
 *   2. Выдайте ему роль ydb.editor на нужную БД
 *   3. Создайте API-ключ: yc iam api-key create --service-account-name <имя>
 *   4. Скопируйте secret из вывода команды
 *   5. Установите переменную окружения YDB_API_KEY
 *
 * Альтернатива (если нет API-ключа):
 *   Используйте YDB_ACCESS_TOKEN_CREDENTIALS с IAM-токеном,
 *   полученным через yc iam create-token (живёт 12 часов, требует обновления)
 */

import { CredentialsProvider } from '@ydbjs/auth';
import { env } from '$env/dynamic/private';

const IAM_TOKEN_URL = 'https://iam.api.cloud.yandex.net/iam/v1/tokens';

/**
 * @typedef {Object} CachedToken
 * @property {string} token
 * @property {number} expiresAt — timestamp в миллисекундах
 */

/** @type {CachedToken | null} */
let cachedToken = null;

/**
 * Обменивает API-ключ на IAM-токен через Yandex Cloud IAM API.
 * @param {string} apiKey
 * @returns {Promise<CachedToken>}
 */
async function exchangeApiKey(apiKey) {
  const response = await fetch(IAM_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ yandexPassportOauthToken: apiKey }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Ошибка обмена API-ключа на IAM-токен: ${response.status} ${response.statusText}\n${text}`
    );
  }

  const data = await response.json();

  // IAM-токен живёт 12 часов, но обновляемся за 10 минут до истечения
  const expiresAt = Date.now() + 11 * 60 * 60 * 1000; // 11 часов

  return {
    token: data.iamToken,
    expiresAt,
  };
}

/**
 * Проверяет, нужно ли обновить токен.
 * @param {CachedToken | null} cached
 * @returns {boolean}
 */
function needsRefresh(cached) {
  if (!cached) return true;
  // Обновляем за 10 минут до истечения
  return Date.now() >= cached.expiresAt - 10 * 60 * 1000;
}

/**
 * Провайдер аутентификации для YDB, использующий статический API-ключ
 * сервисного аккаунта Yandex Cloud.
 *
 * Наследуется от CredentialsProvider из @ydbjs/auth, поэтому полностью
 * совместим с Driver из @ydbjs/core.
 *
 * Токен автоматически обновляется при истечении (раз в ~11 часов).
 * API-ключ при этом остаётся статическим и не требует обновления.
 *
 * @extends {CredentialsProvider}
 */
export class IamTokenProvider extends CredentialsProvider {
  /**
   * @param {string} [apiKey] API-ключ сервисного аккаунта.
   *   Если не передан, берётся из YDB_API_KEY.
   */
  constructor(apiKey) {
    super();
    this.apiKey = apiKey || env.YDB_API_KEY || '';
    if (!this.apiKey) {
      console.warn(
        '[IamTokenProvider] API-ключ не задан. ' +
        'Установите YDB_API_KEY в переменных окружения.'
      );
    } else {
      console.log('[IamTokenProvider] API-ключ найден, длина:', this.apiKey.length);
    }
  }

  /**
   * Возвращает IAM-токен, автоматически обновляя его при необходимости.
   *
   * @param {boolean} [force] Принудительно обновить токен
   * @param {AbortSignal} [signal] Сигнал отмены
   * @returns {Promise<string>}
   */
  async getToken(force, signal) {
    if (!this.apiKey) {
      console.error('[IamTokenProvider] YDB_API_KEY не задан!');
      throw new Error(
        'YDB_API_KEY не задан. ' +
        'Создайте API-ключ сервисного аккаунта и установите переменную YDB_API_KEY.'
      );
    }

    if (force || needsRefresh(cachedToken)) {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      console.log('[IamTokenProvider] Обмениваю API-ключ на IAM-токен...');
      try {
        cachedToken = await exchangeApiKey(this.apiKey);
        console.log('[IamTokenProvider] IAM-токен получен, expiresAt:',
          new Date(cachedToken.expiresAt).toISOString());
      } catch (err) {
        console.error('[IamTokenProvider] Ошибка обмена API-ключа:', err.message);
        throw err;
      }
    }

    return /** @type {CachedToken} */ (cachedToken).token;
  }
}