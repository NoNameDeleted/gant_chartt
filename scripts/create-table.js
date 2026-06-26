#!/usr/bin/env node

/**
 * Скрипт для создания таблицы events в YDB.
 *
 * Использование:
 *   node scripts/create-table.js
 *
 * Переменные окружения (можно задать в .env):
 *   YDB_ENDPOINT            — хост YDB (например, ydb.serverless.yandexcloud.net)
 *   YDB_DATABASE            — путь к БД (например, /ru-central1/b1gn.../etn4...)
 *   YDB_CONNECTION_STRING   — альтернатива: полная строка подключения
 *
 * Для аутентификации используется MetadataCredentialsProvider
 * (IAM-токен из metadata service Yandex Cloud).
 * При локальном запуске нужно предварительно выполнить:
 *   yc iam create-token
 * и установить переменную YDB_ACCESS_TOKEN_CREDENTIALS
 */

import { Driver } from '@ydbjs/core';
import { query } from '@ydbjs/query';
import { MetadataCredentialsProvider } from '@ydbjs/auth/metadata';
import { AccessTokenCredentialsProvider } from '@ydbjs/auth/access-token';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Загружаем .env если есть
try {
  const envPath = resolve(__dirname, '..', '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...rest] = trimmed.split('=');
      const value = rest.join('=').replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
} catch {
  // .env файла нет — используем переменные окружения
}

const YDB_ENDPOINT = process.env.YDB_ENDPOINT;
const YDB_DATABASE = process.env.YDB_DATABASE;
const YDB_CONNECTION_STRING = process.env.YDB_CONNECTION_STRING;

function buildConnectionString() {
  if (YDB_CONNECTION_STRING) return YDB_CONNECTION_STRING;
  if (YDB_ENDPOINT && YDB_DATABASE) {
    return `grpcs://${YDB_ENDPOINT}:2135/?database=${YDB_DATABASE}`;
  }
  throw new Error(
    'Задайте YDB_ENDPOINT и YDB_DATABASE (или YDB_CONNECTION_STRING)'
  );
}

function getCredentialsProvider(connectionString) {
  // Если задан явный IAM-токен — используем его
  if (process.env.YDB_ACCESS_TOKEN_CREDENTIALS) {
    return new AccessTokenCredentialsProvider({
      token: process.env.YDB_ACCESS_TOKEN_CREDENTIALS,
    });
  }
  // Иначе — metadata service (работает в Yandex Cloud)
  return new MetadataCredentialsProvider();
}

async function main() {
  const connectionString = buildConnectionString();
  console.log('Подключаюсь к YDB...');
  console.log(`  Эндпоинт: ${connectionString}`);

  const driver = new Driver(connectionString, {
    credentialsProvider: getCredentialsProvider(connectionString),
  });

  await driver.ready();
  console.log('  Подключение установлено.');

  const sql = query(driver);

  console.log('\nСоздаю таблицу events...');

  await sql`
    CREATE TABLE events (
      id       Uint64,
      category Utf8,
      text     Utf8,
      link     Utf8,
      start    Timestamp,
      "end"    Timestamp,
      deadline Timestamp,
      progress Double,
      PRIMARY KEY (id)
    )
  `;

  console.log('  Таблица events успешно создана!');
  console.log('\nСтруктура таблицы:');
  console.log('  id         Uint64     — уникальный ID ивента');
  console.log('  category   Utf8       — категория (dtiys, палитра, ...)');
  console.log('  text       Utf8       — название ивента');
  console.log('  link       Utf8       — ссылка на пост');
  console.log('  start      Timestamp  — начало набора');
  console.log('  end        Timestamp  — конец набора');
  console.log('  deadline   Timestamp  — дедлайн работ');
  console.log('  progress   Double     — прогресс (0.0)');
  console.log('  PRIMARY KEY (id)');

  await driver.close();
  console.log('\nГотово!');
}

main().catch((err) => {
  console.error('Ошибка:', err);
  process.exit(1);
});