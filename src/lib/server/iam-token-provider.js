/**
 * IamTokenProvider — провайдер аутентификации для YDB,
 * который автоматически обновляет IAM-токен через JWT-аутентификацию
 * сервисного аккаунта Yandex Cloud.
 *
 * Как это работает:
 *   1. Вы создаёте авторизованный ключ для сервисного аккаунта
 *   2. Ключ (JSON с приватным ключом RSA) сохраняете в переменную YDB_SA_KEY_JSON
 *   3. Провайдер подписывает JWT этим ключом и обменивает на IAM-токен
 *   4. Токен автоматически обновляется раз в ~11 часов
 *
 * Авторизованный ключ НЕ ПРОТУХАЕТ — это перманентное решение.
 *
 * Как получить ключ:
 *   yc iam key create --service-account-name <имя> --output sa-key.json
 *   cat sa-key.json | pbcopy  # или clip, или вручную
 *   Установите содержимое в YDB_SA_KEY_JSON на Vercel
 */

import { CredentialsProvider } from '@ydbjs/auth';
import jwt from 'jsonwebtoken';
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
 * Создаёт JWT для аутентификации сервисного аккаунта.
 *
 * @param {Object} saKey — авторизованный ключ сервисного аккаунта
 * @param {string} saKey.id — идентификатор ключа
 * @param {string} saKey.service_account_id — ID сервисного аккаунта
 * @param {string} saKey.private_key — приватный ключ RSA
 * @returns {string} — подписанный JWT
 */
function createJwt(saKey) {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    aud: 'https://iam.api.cloud.yandex.net/iam/v1/tokens',
    iss: saKey.service_account_id,
    iat: now,
    exp: now + 3600, // JWT живёт 1 час
  };

  const options = {
    algorithm: 'PS256',
    keyid: saKey.id,
  };

  return jwt.sign(payload, saKey.private_key, /** @type {import('jsonwebtoken').SignOptions} */ (options));
}

/**
 * Обменивает JWT на IAM-токен через Yandex Cloud IAM API.
 *
 * @param {Object} saKey — авторизованный ключ сервисного аккаунта
 * @returns {Promise<CachedToken>}
 */
/**
 * @param {any} saKey
 */
async function exchangeJwt(saKey) {
  const assertion = createJwt(saKey);

  const response = await fetch(IAM_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jwt: assertion }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Ошибка обмена JWT на IAM-токен: ${response.status} ${response.statusText}\n${text}`
    );
  }

  const data = await response.json();

  // IAM-токен живёт 12 часов, обновляемся за 10 минут до истечения
  const expiresAt = Date.now() + 11 * 60 * 60 * 1000;

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
  return Date.now() >= cached.expiresAt - 10 * 60 * 1000;
}

/**
 * Провайдер аутентификации для YDB, использующий JWT-аутентификацию
 * сервисного аккаунта Yandex Cloud.
 *
 * Наследуется от CredentialsProvider из @ydbjs/auth, полностью
 * совместим с Driver из @ydbjs/core.
 *
 * @extends {CredentialsProvider}
 */
export class IamTokenProvider extends CredentialsProvider {
  /**
   * @param {any | string} [saKey] авторизованный ключ сервисного аккаунта
   *   (объект или JSON-строка). Если не передан, берётся из YDB_SA_KEY_JSON.
   */
  constructor(saKey) {
    super();

    if (saKey && typeof saKey === 'object') {
      this.saKey = saKey;
    } else if (saKey && typeof saKey === 'string') {
      try {
        this.saKey = JSON.parse(saKey);
      } catch {
        this.saKey = null;
      }
    } else if (env.YDB_SA_KEY_JSON) {
      try {
        this.saKey = JSON.parse(env.YDB_SA_KEY_JSON);
      } catch {
        this.saKey = null;
      }
    } else {
      this.saKey = null;
    }

    if (!this.saKey) {
      console.warn(
        '[IamTokenProvider] Авторизованный ключ не задан. ' +
        'Установите YDB_SA_KEY_JSON в переменных окружения.'
      );
    } else {
      console.log('[IamTokenProvider] Авторизованный ключ загружен, SA:',
        this.saKey.service_account_id);
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
    if (!this.saKey) {
      throw new Error(
        'YDB_SA_KEY_JSON не задан. ' +
        'Создайте авторизованный ключ сервисного аккаунта: ' +
        'yc iam key create --service-account-name <имя> --output sa-key.json\n' +
        'И установите содержимое в переменную YDB_SA_KEY_JSON.'
      );
    }

    if (force || needsRefresh(cachedToken)) {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      console.log('[IamTokenProvider] Обмениваю JWT на IAM-токен...');
      cachedToken = await exchangeJwt(this.saKey);
      console.log('[IamTokenProvider] IAM-токен получен, expiresAt:',
        new Date(cachedToken.expiresAt).toISOString());
    }

    return /** @type {CachedToken} */ (cachedToken).token;
  }
}