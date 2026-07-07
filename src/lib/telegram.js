/**
 * Утилита для открытия ссылок в Telegram Mini App.
 *
 * В Telegram Mini App использует Telegram.WebApp.openLink(url),
 * который открывает ссылку во встроенном браузере Telegram,
 * не сворачивая и не закрывая Mini App.
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
 * Безопасно открывает ссылку.
 * В Telegram Mini App — через Telegram.WebApp.openLink (не закрывает приложение).
 * Вне Telegram — через window.open.
 *
 * @param {string} url - Ссылка для открытия
 */
export function openLink(url) {
  if (!url) return;

  try {
    if (isTelegramWebApp()) {
      // Telegram.WebApp.openLink открывает ссылку во встроенном браузере Telegram,
      // не сворачивая Mini App
      window.Telegram.WebApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  } catch (err) {
    console.error('Ошибка при открытии ссылки:', err);
    // Fallback на window.open при ошибке
    window.open(url, '_blank');
  }
}