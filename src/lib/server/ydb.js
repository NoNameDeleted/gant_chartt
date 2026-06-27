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
 * 1. YDB_API_KEY — статический API-ключ сервисного аккаунта (не протухает).
 *    Используется IamTokenProvider, который автоматически обменивает
 *    API-ключ на IAM-токен и обновляет его при истечении.
 *    Рекомендуемый способ для Vercel и любого продакшена.
 *
 * 2. YDB_ACCESS_TOKEN_CREDENTIALS — IAM-токен (живёт 12 часов).
 *    Требует регулярного обновления. Подходит для локальной разработки.
 *
 * 3. MetadataCredentialsProvider — для Yandex Cloud Functions / VM.
 *    Работает только внутри Yandex Cloud.
 */
function getCredentialsProvider() {
  console.log('[ydb] Доступные переменные:',
    'YDB_API_KEY=', env.YDB_API_KEY ? 'есть (длина: ' + env.YDB_API_KEY.length + ')' : 'нет',
    'YDB_ACCESS_TOKEN_CREDENTIALS=', env.YDB_ACCESS_TOKEN_CREDENTIALS ? 'есть' : 'нет',
    'YDB_ENDPOINT=', env.YDB_ENDPOINT || 'нет',
    'YDB_DATABASE=', env.YDB_DATABASE ? 'есть' : 'нет'
  );

  // Приоритет 1: API-ключ сервисного аккаунта (перманентное решение)
  if (env.YDB_API_KEY) {
    console.log('[ydb] Выбран IamTokenProvider (API-ключ)');
    return new IamTokenProvider(env.YDB_API_KEY);
  }

  // Приоритет 2: IAM-токен (требует обновления каждые 12 часов)
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

  // Пробуем прочитать has_set. Если колонки нет — YDB вернёт ошибку,
  // ловим её и делаем SELECT без has_set.
  let resultSets;
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
        progress,
        has_set
      FROM events
      ORDER BY id
    `;
  } catch {
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
  }

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
    hasSet: row.has_set ?? true,
  }));
}

/**
 * Добавляет колонку has_set в таблицу events, если её ещё нет.
 * Вызывается перед первым UPSERT-ом с has_set.
 */
let hasSetColumnEnsured = false;

async function ensureHasSetColumn() {
  if (hasSetColumnEnsured) return;
  const ydb = await getYdb();
  try {
    await ydb`ALTER TABLE events ADD COLUMN has_set Bool`;
  } catch {
    // колонка уже существует — игнорируем
  }
  hasSetColumnEnsured = true;
}

/**
 * Сохраняет ивент в YDB (UPSERT).
 * @param {Object} event
 */
export async function saveEvent(event) {
  const ydb = await getYdb();

  await ensureHasSetColumn();

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

  await ensureHasSetColumn();

  await ydb.begin(async (tx) => {
    await tx`DELETE FROM events`;

    for (const event of events) {
      await tx`
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
  });
}