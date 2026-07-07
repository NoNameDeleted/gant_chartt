/**
 * Декларация типов для Telegram Web App SDK.
 * Добавляет глобальный объект Telegram.WebApp.
 */

interface TelegramWebApp {
  /**
   * Открывает ссылку во встроенном браузере Telegram.
   * Не закрывает и не сворачивает Mini App.
   */
  openLink(url: string): void;

  /**
   * Закрывает Mini App.
   */
  close(): void;

  /**
   * Показывает всплывающее окно с подтверждением.
   */
  showConfirm(message: string): Promise<boolean>;

  /**
   * Показывает всплывающее окно с предупреждением.
   */
  showAlert(message: string): Promise<void>;

  /**
   * Показывает всплывающее окно с вводом текста.
   */
  showPopup(params: {
    title?: string;
    message: string;
    buttons: Array<{
      type: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text: string;
      id?: string;
    }>;
  }): Promise<string>;

  /**
   * Данные о пользователе Telegram.
   */
  initDataUnsafe?: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    start_param?: string;
  };

  /**
   * Текущая цветовая схема.
   */
  colorScheme: 'light' | 'dark';

  /**
   * Тема оформления.
   */
  themeParams: Record<string, string>;

  /**
   * Версия Telegram Web App.
   */
  version: string;

  /**
   * Платформа, на которой запущено приложение.
   */
  platform: string;

  /**
   * Вызывается, когда Mini App готов к отображению.
   */
  ready(): void;

  /**
   * Расширяет Mini App на всю высоту.
   */
  expand(): void;

  /**
   * Устанавливает цвет фона.
   */
  setBackgroundColor(color: string): void;

  /**
   * Устанавливает цвет заголовка.
   */
  setHeaderColor(color: string): void;

  /**
   * Показывает или скрывает кнопку "Назад".
   */
  BackButton: {
    show(): void;
    hide(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
  };

  /**
   * Показывает или скрывает основную кнопку.
   */
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show(): void;
    hide(): void;
    enable(): void;
    disable(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    setText(text: string): void;
    setParams(params: Record<string, string>): void;
  };

  /**
   * Отслеживает событие закрытия Mini App.
   */
  onEvent(eventType: 'viewportChanged' | 'themeChanged', callback: () => void): void;

  /**
   * Удаляет обработчик события.
   */
  offEvent(eventType: 'viewportChanged' | 'themeChanged', callback: () => void): void;

  /**
   * Отправляет данные в бота.
   */
  sendData(data: string): void;

  /**
   * Переключает Haptic Feedback (только на мобильных устройствах).
   */
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}