import { Driver } from '@ydbjs/core';
import { query } from '@ydbjs/query';
import { MetadataCredentialsProvider } from '@ydbjs/auth/metadata';
import { AccessTokenCredentialsProvider } from '@ydbjs/auth/access-token';

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
 * Если задан YDB_ACCESS_TOKEN_CREDENTIALS — используем его (локальная разработка / Vercel).
 * Иначе — MetadataCredentialsProvider (для Yandex Cloud Functions / VM).
 */
function getCredentialsProvider() {
  if (env.YDB_ACCESS_TOKEN_CREDENTIALS) {
    return new AccessTokenCredentialsProvider({
      token: env.YDB_ACCESS_TOKEN_CREDENTIALS,
    });
  }
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
  if (!connectionString) {
    throw new Error(
      'YDB не настроен. Задайте YDB_ENDPOINT и YDB_DATABASE ' +
      '(или YDB_CONNECTION_STRING) в .env файле.'
    );
  }

  driver = new Driver(connectionString, {
    credentialsProvider: getCredentialsProvider(),
  });

  await driver.ready();
  sql = query(driver);
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
  const ydb = await getYdb();

  const resultSets = await ydb`
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

  const rows = resultSets[0] || [];

  return rows.map((row) => ({
    id: Number(row.id),
    category: row.category,
    text: row.text,
    link: row.link || '',
    start: new Date(row.start),
    end: new Date(row.end),
    deadline: new Date(row.deadline),
    progress: row.progress ?? 0,
  }));
}

/**
 * Сохраняет ивент в YDB (UPSERT).
 * @param {Object} event
 */
export async function saveEvent(event) {
  const ydb = await getYdb();

  await ydb`
    UPSERT INTO events (id, category, text, link, start, \`end\`, deadline, progress)
    VALUES (
      ${BigInt(event.id)},
      ${event.category},
      ${event.text},
      ${event.link || ''},
      ${dateToTs(event.start)},
      ${dateToTs(event.end)},
      ${dateToTs(event.deadline)},
      ${event.progress ?? 0}
    )
  `;
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
 * Сначала удаляет все, потом вставляет текущие.
 * @param {Array} events
 */
export async function saveAllEvents(events) {
  const ydb = await getYdb();

  await ydb.begin(async (tx) => {
    await tx`DELETE FROM events`;

    for (const event of events) {
      await tx`
        UPSERT INTO events (id, category, text, link, start, \`end\`, deadline, progress)
        VALUES (
          ${BigInt(event.id)},
          ${event.category},
          ${event.text},
          ${event.link || ''},
          ${dateToTs(event.start)},
          ${dateToTs(event.end)},
          ${dateToTs(event.deadline)},
          ${event.progress ?? 0}
        )
      `;
    }
  });
}