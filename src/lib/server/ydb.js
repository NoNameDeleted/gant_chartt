import { Driver } from '@ydbjs/core';
import { query } from '@ydbjs/query';
import { MetadataCredentialsProvider } from '@ydbjs/auth/metadata';
import { AccessTokenCredentialsProvider } from '@ydbjs/auth/access-token';
import { IamTokenProvider } from './iam-token-provider.js';

// Используем динамические переменные окружения, чтобы сборка не падала
// на Vercel, где YDB-переменные не заданы.
// SvelteKit автоматически подхватывает переменные из .env
// и делает их доступными через $env/dynamic/private
import { env } from '$env/dynamic/private';

/**
 * Собирает connection string из переменных окружения.
 * Приоритет: YDB_CONNECTION_STRING > YDB_ENDPOINT + YDB_DATABASE
 */
function buildConnectionString() {
  if (env.YDB_CONNECTION_STRING) {
    return env.YDB_CONNECTION_STRING;
  }
  if (env.YDB_ENDPOINT && env.YDB_DATABASE) {
    return `grpcs://${env.YDB_ENDPOINT}:2135/?database=${env.YDB_DATABASE}`;
  }
  return '';
}

/**
 * Выбирает провайдер аутентификации.
 *
 * Приоритет (от наиболее приоритетного):
 * 1. YDB_SA_KEY_JSON — авторизованный ключ сервисного аккаунта Yandex Cloud
 *    (JSON с приватным ключом RSA). НЕ ПРОТУХАЕТ.
 *    Используется IamTokenProvider, который подписывает JWT и обменивает
 *    на IAM-токен. Рекомендуемый способ для Vercel.
 *
 * 2. YDB_ACCESS_TOKEN_CREDENTIALS — IAM-токен (живёт 12 часов).
 *    Требует регулярного обновления. Подходит для локальной разработки.
 *
 * 3. MetadataCredentialsProvider — для Yandex Cloud Functions / VM.
 *    Работает только внутри Yandex Cloud.
 */
function getCredentialsProvider() {
  console.log('[ydb] Доступные переменные:',
    'YDB_SA_KEY_JSON=', env.YDB_SA_KEY_JSON ? 'есть (длина: ' + env.YDB_SA_KEY_JSON.length + ')' : 'нет',
    'YDB_ACCESS_TOKEN_CREDENTIALS=', env.YDB_ACCESS_TOKEN_CREDENTIALS ? 'есть' : 'нет',
    'YDB_ENDPOINT=', env.YDB_ENDPOINT || 'нет',
    'YDB_DATABASE=', env.YDB_DATABASE ? 'есть' : 'нет'
  );

  // Приоритет 1: авторизованный ключ сервисного аккаунта (ПЕРМАНЕНТНОЕ РЕШЕНИЕ)
  // Ключ НЕ ПРОТУХАЕТ. IamTokenProvider подписывает JWT и обменивает на IAM-токен.
  // Требует доступа к iam.api.cloud.yandex.net (должен быть доступен на Vercel).
  if (env.YDB_SA_KEY_JSON) {
    console.log('[ydb] Выбран IamTokenProvider (авторизованный ключ)');
    return new IamTokenProvider(env.YDB_SA_KEY_JSON);
  }

  // Приоритет 2: IAM-токен (живёт 12 часов, требует регулярного обновления)
  // Используется только если нет авторизованного ключа.
  if (env.YDB_ACCESS_TOKEN_CREDENTIALS) {
    console.log('[ydb] Выбран AccessTokenCredentialsProvider (IAM-токен)');
    return new AccessTokenCredentialsProvider({
      token: env.YDB_ACCESS_TOKEN_CREDENTIALS,
    });
  }

  // Приоритет 3: Metadata service (только внутри Yandex Cloud)
  console.log('[ydb] Выбран MetadataCredentialsProvider (Yandex Cloud)');
  return new MetadataCredentialsProvider();
}

let driver = null;
let sql = null;

/**
 * Инициализирует подключение к YDB (singleton).
 */
export async function getYdb() {
  if (sql) return sql;

  const connectionString = buildConnectionString();
  console.log('[ydb] connectionString:', connectionString ? connectionString.slice(0, 80) + '...' : 'ПУСТО');
  if (!connectionString) {
    throw new Error(
      'YDB не настроен. Задайте YDB_ENDPOINT и YDB_DATABASE ' +
      '(или YDB_CONNECTION_STRING) в .env файле.'
    );
  }

  console.log('[ydb] Создаю Driver...');
  driver = new Driver(connectionString, {
    credentialsProvider: getCredentialsProvider(),
  });

  console.log('[ydb] Вызываю driver.ready()...');
  try {
    await driver.ready();
    console.log('[ydb] driver.ready() успешно завершён');
  } catch (err) {
    console.error('[ydb] driver.ready() ОШИБКА:', err);
    // Не пробрасываем ошибку дальше — даём шанс работать с fallback-данными
    // throw err;
    // Не кешируем null — при следующем вызове попробуем снова
    driver = null;
    return null;
  }

  console.log('[ydb] Создаю query...');
  sql = query(driver);
  console.log('[ydb] YDB инициализирован успешно');
  return sql;
}

/**
 * Закрывает подключение к YDB.
 */
export async function closeYdb() {
  if (driver) {
    await driver.close();
    driver = null;
    sql = null;
  }
}

// ─── Работа с ивентами ─────────────────────────────────────────

/**
 * Преобразует значение в Timestamp для YDB.
 */
function dateToTs(value) {
  if (!value) return new Date('1970-01-01T00:00:00Z');
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return new Date('1970-01-01T00:00:00Z');
  return d;
}

/**
 * Загружает все ивенты из YDB.
 * @returns {Promise<Array>}
 */
export async function loadEvents() {
  console.log('[ydb] loadEvents() вызван');
  let ydb;
  try {
    ydb = await getYdb();
    console.log('[ydb] getYdb() успешно');
  } catch (err) {
    console.error('[ydb] getYdb() ОШИБКА:', err);
    throw err;
  }

  // Пробуем прочитать has_set. Если колонки нет — YDB вернёт ошибку,
  // ловим её и делаем SELECT без has_set.
  let resultSets;
  try {
    console.log('[ydb] Выполняю SELECT с has_set...');
    resultSets = await ydb`
      SELECT
        id,
        category,
        text,
        link,
        start,
        \`end\`,
        deadline,
        progress,
        has_set
      FROM events
      ORDER BY id
    `;
    console.log('[ydb] SELECT с has_set успешно');
  } catch (err) {
    console.log('[ydb] SELECT с has_set упал, пробую без has_set:', err.message);
    try {
      resultSets = await ydb`
        SELECT
          id,
          category,
          text,
          link,
          start,
          \`end\`,
          deadline,
          progress
        FROM events
        ORDER BY id
      `;
      console.log('[ydb] SELECT без has_set успешно');
    } catch (err2) {
      console.error('[ydb] SELECT без has_set тоже упал:', err2);
      throw err2;
    }
  }

  const rows = resultSets[0] || [];
  console.log('[ydb] Загружено строк:', rows.length);

  return rows.map((row) => ({
    id: Number(row.id),
    category: row.category,
    text: row.text,
    link: row.link || '',
    start: new Date(row.start),
    end: new Date(row.end),
    deadline: new Date(row.deadline),
    progress: row.progress ?? 0,
    hasSet: row.has_set ?? true,
  }));
}

/**
 * Сохраняет ивент в YDB (UPSERT).
 * @param {Object} event
 */
export async function saveEvent(event) {
  const startTime = Date.now();
  const ydb = await getYdb();

  try {
    await ydb`
      UPSERT INTO events (id, category, text, link, start, \`end\`, deadline, progress, has_set)
      VALUES (
        ${BigInt(event.id)},
        ${event.category},
        ${event.text},
        ${event.link || ''},
        ${dateToTs(event.start)},
        ${dateToTs(event.end)},
        ${dateToTs(event.deadline)},
        ${event.progress ?? 0},
        ${event.hasSet ?? true}
      )
    `;
    console.log('[ydb] saveEvent() успешно за', Date.now() - startTime, 'мс, id:', event.id);
  } catch (err) {
    console.error('[ydb] saveEvent() ОШИБКА за', Date.now() - startTime, 'мс, id:', event.id, err.message);
    throw err;
  }
}

/**
 * Удаляет ивент из YDB по id.
 * @param {number} id
 */
export async function deleteEvent(id) {
  const ydb = await getYdb();

  await ydb`
    DELETE FROM events
    WHERE id = ${BigInt(id)}
  `;
}

/**
 * Сохраняет массив ивентов (полная синхронизация).
 * UPSERT всех ивентов по одному (без транзакции).
 * @param {Array} events
 */
export async function saveAllEvents(events) {
  const startTime = Date.now();
  console.log('[ydb] saveAllEvents() начало, ивентов:', events.length);
  const ydb = await getYdb();

  try {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      await ydb`
        UPSERT INTO events (id, category, text, link, start, \`end\`, deadline, progress, has_set)
        VALUES (
          ${BigInt(event.id)},
          ${event.category},
          ${event.text},
          ${event.link || ''},
          ${dateToTs(event.start)},
          ${dateToTs(event.end)},
          ${dateToTs(event.deadline)},
          ${event.progress ?? 0},
          ${event.hasSet ?? true}
        )
      `;
    }
    console.log('[ydb] saveAllEvents() успешно за', Date.now() - startTime, 'мс, ивентов:', events.length);
  } catch (err) {
    console.error('[ydb] saveAllEvents() ОШИБКА за', Date.now() - startTime, 'мс:', err.message);
    throw err;
  }
}