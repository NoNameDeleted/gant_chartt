/**
 * Утилита для открытия ссылок в Telegram Mini App.
 *
 * В Telegram Mini App:
 * - Для внутренних ссылок Telegram (t.me) использует Telegram.WebApp.openTelegramLink(url),
 *   который открывает ссылку прямо в Telegram, не закрывая Mini App.
 * - Для остальных ссылок использует Telegram.WebApp.openLink(url),
 *   который открывает во встроенном браузере Telegram.
 *
 * Вне Telegram использует обычный window.open(url, "_blank").
 */

/**
 * Проверяет, запущено ли приложение внутри Telegram Mini App.
 * @returns {boolean}
 */
export function isTelegramWebApp() {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp;
}

/**
 * Проверяет, является ли ссылка внутренней ссылкой Telegram.
 * @param {string} url
 * @returns {boolean}
 */
function isTelegramLink(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 't.me' || parsed.hostname.endsWith('.t.me');
  } catch {
    return false;
  }
}

/**
 * Безопасно открывает ссылку.
 * В Telegram Mini App:
 *   - t.me ссылки → Telegram.WebApp.openTelegramLink (открывается в Telegram, не закрывая Mini App)
 *   - остальные → Telegram.WebApp.openLink (во встроенном браузере Telegram)
 * Вне Telegram → window.open.
 *
 * @param {string} url - Ссылка для открытия
 */
export function openLink(url) {
  if (!url) return;

  try {
    if (isTelegramWebApp()) {
      if (isTelegramLink(url)) {
        // openTelegramLink открывает t.me ссылки прямо в Telegram,
        // не сворачивая и не закрывая Mini App
        window.Telegram.WebApp.openTelegramLink(url);
      } else {
        // openLink открывает обычные ссылки во встроенном браузере Telegram
        window.Telegram.WebApp.openLink(url);
      }
    } else {
      window.open(url, '_blank');
    }
  } catch (err) {
    console.error('Ошибка при открытии ссылки:', err);
    // Fallback на window.open при ошибке
    window.open(url, '_blank');
  }
}