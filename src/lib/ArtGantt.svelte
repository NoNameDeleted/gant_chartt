<script>
  import { onMount } from "svelte";
  import EventCard from "./EventCard.svelte";
  import EventEditor from "./EventEditor.svelte";

  // ─── Категории ───────────────────────────────────────────────
  const categories = [
    { id: "open коллаб",    label: "Open коллаб",      color: "#0ea5e9" },
    { id: "dtiys",          label: "DTIYS",            color: "#6366f1" },
    { id: "палитра",        label: "Палитра",          color: "#ec4899" },
    { id: "мудборд",        label: "Мудборд",          color: "#f59e0b" },
    { id: "сломанный планшет", label: "Слом. планшет", color: "#ef4444" },
    { id: "хуманизация",    label: "Хуманизация",      color: "#d946ef" },
    { id: "один арт",       label: "Один арт",         color: "#10b981" },
    { id: "фейк коллаб",    label: "Фейк коллаб",      color: "#8b5cf6" },
  ];

  // ─── Ивенты ──────────────────────────────────────────────────
  let events = $state([]);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state(null);

  // ─── Загрузка ивентов из YDB ─────────────────────────────────
  async function fetchEvents() {
    loading = true;
    error = null;
    try {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error(`Ошибка загрузки: ${res.status}`);
      const data = await res.json();
      // Преобразуем строки дат обратно в Date
      events = data.map((e) => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
        deadline: new Date(e.deadline),
      }));
    } catch (err) {
      console.error("Ошибка загрузки ивентов:", err);
      error = err.message;
      // Если YDB недоступен — используем тестовые данные
      events = getFallbackEvents();
    } finally {
      loading = false;
    }
  }

  // ─── Тестовые данные (если YDB недоступен) ───────────────────
  function getFallbackEvents() {
    return [
      { id: 1,  category: "dtiys",          text: "Море иллюстраций",     start: new Date(2026, 5, 1),  end: new Date(2026, 5, 7),  deadline: new Date(2026, 5, 10), link: "https://example.com/dtiys",          progress: 0, hasSet: true },
      { id: 2,  category: "dtiys",          text: "Космический пейзаж",   start: new Date(2026, 5, 10), end: new Date(2026, 5, 17), deadline: new Date(2026, 5, 20), link: "https://example.com/dtiys2",         progress: 0, hasSet: true },
      { id: 3,  category: "палитра",        text: "Розовый неон",         start: new Date(2026, 5, 4),  end: new Date(2026, 5, 11), deadline: new Date(2026, 5, 14), link: "https://example.com/palette",        progress: 0, hasSet: true },
      { id: 4,  category: "палитра",        text: "Закатные тона",        start: new Date(2026, 5, 15), end: new Date(2026, 5, 22), deadline: new Date(2026, 5, 25), link: "https://example.com/palette2",       progress: 0, hasSet: true },
      { id: 5,  category: "мудборд",        text: "Киберпанк лето",       start: new Date(2026, 5, 2),  end: new Date(2026, 5, 6),  deadline: new Date(2026, 5, 8),  link: "https://example.com/moodboard",      progress: 0, hasSet: true },
      { id: 6,  category: "один арт",       text: "Утро в лесу",          start: new Date(2026, 5, 5),  end: new Date(2026, 5, 12), deadline: new Date(2026, 5, 15), link: "https://example.com/art",            progress: 0, hasSet: true },
      { id: 7,  category: "один арт",       text: "Горный пейзаж",        start: new Date(2026, 5, 18), end: new Date(2026, 5, 25), deadline: new Date(2026, 5, 28), link: "https://example.com/art2",           progress: 0, hasSet: true },
      { id: 8,  category: "сломанный планшет", text: "Перезагрузка",      start: new Date(2026, 5, 6),  end: new Date(2026, 5, 9),  deadline: new Date(2026, 5, 12), link: "https://example.com/broken-tablet",  progress: 0, hasSet: true },
      { id: 9,  category: "фейк коллаб",    text: "Дикий эксперимент",    start: new Date(2026, 5, 8),  end: new Date(2026, 5, 13), deadline: new Date(2026, 5, 16), link: "https://example.com/fake-collab",    progress: 0, hasSet: true },
      { id: 10, category: "open коллаб",    text: "Свободная тема",       start: new Date(2026, 5, 10), end: new Date(2026, 5, 17), deadline: new Date(2026, 5, 20), link: "https://example.com/open-collab",    progress: 0, hasSet: true },
      { id: 11, category: "open коллаб",    text: "Стимпанк",             start: new Date(2026, 5, 22), end: new Date(2026, 5, 29), deadline: new Date(2026, 5, 30), link: "https://example.com/open-collab2",   progress: 0, hasSet: true },
      { id: 12, category: "dtiys",          text: "Пересекающийся DTIYS", start: new Date(2026, 5, 3),  end: new Date(2026, 5, 13), deadline: new Date(2026, 5, 16), link: "", progress: 0, hasSet: true },
      { id: 13, category: "палитра",        text: "Пересекающаяся палитра", start: new Date(2026, 5, 6), end: new Date(2026, 5, 16), deadline: new Date(2026, 5, 19), link: "", progress: 0, hasSet: true },
    ];
  }

  // ─── Сохранение всех ивентов в YDB ───────────────────────────
  async function syncEvents() {
    saving = true;
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });
      if (!res.ok) throw new Error(`Ошибка сохранения: ${res.status}`);
    } catch (err) {
      console.error("Ошибка синхронизации с YDB:", err);
    } finally {
      saving = false;
    }
  }

  // ─── Временная шкала ─────────────────────────────────────────
  const DAY_MS = 86400000;
  const DAY_WIDTH = 40;
  const LANE_HEIGHT = 52; // высота одной подстроки

  // Русские названия месяцев
  const MONTH_NAMES = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ];

  // Текущая дата для расчёта диапазона
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Начало: 3 месяца назад от текущего месяца (первое число)
  const VIEW_START = new Date(currentYear, currentMonth - 3, 1);
  // Конец: текущий месяц + 6 месяцев вперёд (последнее число)
  const VIEW_END = new Date(currentYear, currentMonth + 7, 0); // день 0 = последний день предыдущего месяца
  const TOTAL_DAYS = Math.round((VIEW_END - VIEW_START) / DAY_MS) + 1;

  // Смещение в пикселях от VIEW_START до начала текущего месяца
  let scrollToCurrentMonth = $derived.by(() => {
    const monthStart = new Date(currentYear, currentMonth, 1);
    const diff = monthStart - VIEW_START;
    return Math.max(0, (diff / DAY_MS) * DAY_WIDTH);
  });

  // Позиция линии "сегодня" в пикселях от левого края временной шкалы
  let todayPosition = $derived.by(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = today - VIEW_START;
    return (diff / DAY_MS) * DAY_WIDTH;
  });

  let days = $derived.by(() => {
    const arr = [];
    for (let i = 0; i < TOTAL_DAYS; i++) {
      const d = new Date(VIEW_START);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  });

  // Месяцы для отображения в шапке
  let months = $derived.by(() => {
    const arr = [];
    let currentMonthStart = null;
    for (const d of days) {
      const monthKey = d.getFullYear() * 12 + d.getMonth();
      if (!currentMonthStart || currentMonthStart.monthKey !== monthKey) {
        if (currentMonthStart) arr.push(currentMonthStart);
        currentMonthStart = { monthKey, days: [], label: MONTH_NAMES[d.getMonth()] };
      }
      currentMonthStart.days.push(d);
    }
    if (currentMonthStart) arr.push(currentMonthStart);
    return arr;
  });

  let weeks = $derived.by(() => {
    const arr = [];
    let currentWeek = { days: [], label: "" };
    for (const d of days) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 1 && currentWeek.days.length > 0) {
        arr.push(currentWeek);
        currentWeek = { days: [], label: "" };
      }
      currentWeek.days.push(d);
      if (!currentWeek.label) {
        currentWeek.label = `${d.getDate()}.${d.getMonth() + 1}`;
      }
    }
    if (currentWeek.days.length > 0) arr.push(currentWeek);
    return arr;
  });

  // ─── Позиционирование ивента ─────────────────────────────────
  function getEventLeft(event) {
    const diff = event.start - VIEW_START;
    return (diff / DAY_MS) * DAY_WIDTH;
  }

  function getEventWidth(event) {
    // Ширина от start до deadline
    const diff = event.deadline - event.start;
    return Math.max((diff / DAY_MS) * DAY_WIDTH, DAY_WIDTH * 0.5);
  }

  // Процент ширины, который занимает период набора (start→end) относительно всей карточки (start→deadline)
  function getEndPortion(event) {
    const total = event.deadline - event.start;
    if (total <= 0) return 1;
    const portion = (event.end - event.start) / total;
    return Math.max(0, Math.min(1, portion));
  }

  // ─── Алгоритм распределения по подстрокам (lanes) ────────────
  // Проверяет, пересекаются ли два ивента по времени (от start до deadline)
  function eventsOverlap(a, b) {
    return a.start < b.deadline && b.start < a.deadline;
  }

  // Распределяет ивенты по lanes (возвращает массив вида [[evt, lane], ...])
  function assignLanes(catEvents) {
    if (catEvents.length === 0) return [];

    // Сортируем по start
    const sorted = [...catEvents].sort((a, b) => a.start - b.start);

    // lanes[i] = массив ивентов на i-й полосе
    const lanes = [];

    for (const evt of sorted) {
      let placed = false;
      // Ищем первую полосу, где нет пересечений
      for (let i = 0; i < lanes.length; i++) {
        const lane = lanes[i];
        const hasOverlap = lane.some((existing) => eventsOverlap(evt, existing));
        if (!hasOverlap) {
          lane.push(evt);
          placed = true;
          break;
        }
      }
      // Если не нашли — создаём новую полосу
      if (!placed) {
        lanes.push([evt]);
      }
    }

    return lanes;
  }

  // ─── Ивенты, сгруппированные по категориям и распределённые по lanes ──
  let eventsByCategory = $derived.by(() => {
    const map = {};
    for (const cat of categories) {
      map[cat.id] = [];
    }
    for (const evt of events) {
      if (map[evt.category]) {
        map[evt.category].push(evt);
      }
    }
    // Преобразуем в { lanes: [[evt,...], ...], totalLanes: number }
    const result = {};
    for (const cat of categories) {
      const lanes = assignLanes(map[cat.id]);
      result[cat.id] = {
        lanes,
        totalLanes: lanes.length,
      };
    }
    return result;
  });

  // ─── Редактор ────────────────────────────────────────────────
  let editorOpen = $state(false);
  let editingEvent = $state(null);

  let form = $state({
    id: null,
    text: "",
    category: categories[0].id,
    link: "",
    start: "",
    end: "",
    deadline: "",
    hasSet: true,
  });

  function formatDate(date) {
    return new Date(date).toISOString().slice(0, 10);
  }

  function openEditor(event = null) {
    if (event) {
      editingEvent = event;
      form.id = event.id;
      form.text = event.text;
      form.category = event.category;
      form.link = event.link || "";
      form.start = formatDate(event.start);
      form.end = formatDate(event.end);
      form.deadline = formatDate(event.deadline);
      form.hasSet = event.hasSet ?? true;
    } else {
      editingEvent = null;
      form.id = Date.now();
      form.text = "";
      form.category = categories[0].id;
      form.link = "";
      form.start = formatDate(new Date());
      form.end = formatDate(new Date(Date.now() + 6 * DAY_MS));
      form.deadline = formatDate(new Date(Date.now() + 10 * DAY_MS));
      form.hasSet = true;
    }
    editorOpen = true;
  }

  function closeEditor() {
    editorOpen = false;
  }

  function saveEvent() {
    const evt = {
      id: form.id,
      text: form.text,
      category: form.category,
      link: form.link,
      start: new Date(form.start),
      end: form.hasSet ? new Date(form.end) : new Date(form.start),
      deadline: new Date(form.deadline),
      progress: 0,
      hasSet: form.hasSet,
    };

    if (editingEvent) {
      const idx = events.findIndex((e) => e.id === evt.id);
      if (idx !== -1) events[idx] = evt;
    } else {
      events.push(evt);
    }

    editorOpen = false;

    // Синхронизируем с YDB
    syncEvents();
  }

  async function deleteEvent() {
    if (!editingEvent) return;

    const id = editingEvent.id;

    // Удаляем из локального массива
    events = events.filter((e) => e.id !== id);

    editorOpen = false;

    // Удаляем из YDB
    try {
      const res = await fetch("/api/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(`Ошибка удаления: ${res.status}`);
    } catch (err) {
      console.error("Ошибка удаления ивента из YDB:", err);
    }
  }

  // ─── Обработчики для ивентов ─────────────────────────────────
  let eventLongPressTimer = null;
  let eventLongPressStartX = 0;
  let eventLongPressStartY = 0;

  // Для детекции двойного тапа (работает и на ПК, и на мобильных)
  let lastTapEvent = null;
  let lastTapTime = 0;
  const DOUBLE_TAP_DELAY = 300; // мс

  // Drag-to-scroll состояние (общее для ивентов и пустых областей)
  let isDragging = $state(false);
  let dragStartX = 0;
  let dragStartScrollLeft = 0;
  let dragTarget = null;

  // Флаг: было ли реальное перемещение во время текущего нажатия
  let hasDraggedDuringPress = false;

  function handleEventPointerDown(event, evt) {
    event.stopPropagation();
    // Захватываем указатель, чтобы pointermove продолжал приходить даже за пределами карточки
    event.currentTarget.setPointerCapture(event.pointerId);
    eventLongPressStartX = event.clientX;
    eventLongPressStartY = event.clientY;
    hasDraggedDuringPress = false;
    if (eventLongPressTimer) clearTimeout(eventLongPressTimer);
    eventLongPressTimer = setTimeout(() => {
      // Не открываем редактор, если было реальное перетаскивание
      if (hasDraggedDuringPress) return;
      openEditor(evt);
    }, 600);

    // Детекция двойного тапа в pointerdown (первый тап — ничего не делаем, второй — открываем ссылку)
    const now = Date.now();
    if (lastTapEvent === evt && now - lastTapTime < DOUBLE_TAP_DELAY) {
      // Двойной тап — открываем ссылку
      lastTapEvent = null;
      lastTapTime = 0;
      if (evt.link) {
        window.open(evt.link, "_blank");
      }
    } else {
      lastTapEvent = evt;
      lastTapTime = now;
    }

    // Инициализация drag-to-scroll
    if (event.button === 0) {
      isDragging = true;
      dragStartX = event.clientX;
      dragTarget = event.currentTarget.closest('.gantt-scroll, .header-timescale-scroll');
      if (dragTarget) {
        dragStartScrollLeft = dragTarget.scrollLeft;
      }
    }
  }

  function handleEventPointerUp(event) {
    if (event) event.stopPropagation();
    if (eventLongPressTimer) {
      clearTimeout(eventLongPressTimer);
      eventLongPressTimer = null;
    }
    // Завершаем drag-to-scroll
    isDragging = false;
    dragTarget = null;
    hasDraggedDuringPress = false;
  }

  function handleEventPointerMove(event) {
    if (!eventLongPressTimer && !isDragging) return;
    const dx = event.clientX - eventLongPressStartX;
    const dy = event.clientY - eventLongPressStartY;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearTimeout(eventLongPressTimer);
      eventLongPressTimer = null;
    }
    // Drag-to-scroll
    if (isDragging && dragTarget) {
      dragTarget.scrollLeft = dragStartScrollLeft - dx;
    }
  }

  // ─── Drag-to-scroll для пустых областей (gantt-scroll и header) ──
  function handleDragPointerDown(event) {
    if (event.button !== 0) return;
    isDragging = true;
    dragStartX = event.clientX;
    dragTarget = event.currentTarget;
    dragStartScrollLeft = dragTarget.scrollLeft;
    dragTarget.setPointerCapture(event.pointerId);
    dragTarget.style.cursor = 'grabbing';
    event.preventDefault();
  }

  function handleDragPointerMove(event) {
    if (!isDragging || !dragTarget) return;
    // Помечаем, что было реальное перетаскивание (чтобы long press не открыл редактор)
    hasDraggedDuringPress = true;
    const dx = event.clientX - dragStartX;
    dragTarget.scrollLeft = dragStartScrollLeft - dx;
    event.preventDefault();
  }

  function handleDragPointerUp(event) {
    if (!isDragging || !dragTarget) return;
    isDragging = false;
    dragTarget.style.cursor = '';
    dragTarget.releasePointerCapture?.(event.pointerId);
    dragTarget = null;
    hasDraggedDuringPress = false;
    event.preventDefault();
  }

  // ─── Обработчики для пустого места ───────────────────────────
  let emptyLongPressTimer = null;

  function handleEmptyPointerDown(event) {
    // Отменяем скролл/контекстное меню браузера при долгом нажатии
    event.preventDefault();
    if (emptyLongPressTimer) clearTimeout(emptyLongPressTimer);
    emptyLongPressTimer = setTimeout(() => {
      openEditor();
    }, 600);
  }

  function handleEmptyPointerMove(event) {
    // Если палец/курсор сдвинулся — отменяем долгое нажатие (это скролл)
    if (emptyLongPressTimer) {
      clearTimeout(emptyLongPressTimer);
      emptyLongPressTimer = null;
    }
  }

  function handleEmptyPointerUp() {
    if (emptyLongPressTimer) {
      clearTimeout(emptyLongPressTimer);
      emptyLongPressTimer = null;
    }
  }

  // ─── Синхронизация скролла ───────────────────────────────────
  let headerScrollEl = $state(null);
  let headerCornerEl = $state(null);
  let ganttBodyEl = $state(null);
  let ganttLabelsEl = $state(null);
  let isSyncing = false;

  function handleHeaderScroll() {
    if (isSyncing || !ganttBodyEl) return;
    isSyncing = true;
    ganttBodyEl.scrollLeft = headerScrollEl?.scrollLeft ?? 0;
    isSyncing = false;
    updateStickyLabels();
  }

  function handleBodyScroll() {
    if (isSyncing || !headerScrollEl) return;
    isSyncing = true;
    headerScrollEl.scrollLeft = ganttBodyEl.scrollLeft;
    if (ganttLabelsEl) {
      ganttLabelsEl.scrollTop = ganttBodyEl.scrollTop;
    }
    isSyncing = false;
    updateStickyLabels();
  }

  function handleLabelsScroll() {
    if (isSyncing || !ganttBodyEl) return;
    isSyncing = true;
    ganttBodyEl.scrollTop = ganttLabelsEl?.scrollTop ?? 0;
    isSyncing = false;
  }

  function updateStickyLabels() {
    if (!ganttBodyEl) return;
    const containerRect = ganttBodyEl.getBoundingClientRect();

    // Sticky для карточек ивентов
    const cards = ganttBodyEl.querySelectorAll('.event-card');
    for (const card of cards) {
      const content = card.querySelector('.card-content');
      if (content) {
        const cardRect = card.getBoundingClientRect();
        const minOffset = Math.max(0, containerRect.left - cardRect.left);
        const contentWidth = content.offsetWidth;
        const cardWidth = cardRect.width;
        const maxOffset = Math.max(0, cardWidth - contentWidth);
        const offset = Math.min(minOffset, maxOffset);
        content.style.left = offset + 'px';
      }
    }

    // Sticky для названий месяцев в шапке
    if (headerScrollEl) {
      // Точка прилипания — правый край колонки "Категория" (или левый край скролла, если колонки нет)
      const stickyLeft = headerCornerEl
        ? headerCornerEl.getBoundingClientRect().right
        : headerScrollEl.getBoundingClientRect().left;
      const monthLabels = headerScrollEl.querySelectorAll('.timescale-month-label');
      for (const label of monthLabels) {
        const monthEl = label.closest('.timescale-month');
        if (monthEl) {
          const monthRect = monthEl.getBoundingClientRect();
          const labelWidth = label.offsetWidth;
          const monthWidth = monthRect.width;
          const minOffset = Math.max(0, stickyLeft - monthRect.left);
          const maxOffset = Math.max(0, monthWidth - labelWidth);
          const offset = Math.min(minOffset, maxOffset);
          label.style.left = offset + 'px';
        }
      }
    }
  }

  // ─── Высота контейнера ───────────────────────────────────────
  let containerHeight = $state(800);

  // ─── Скролл к текущему месяцу при загрузке ───────────────────
  let initialScrolled = $state(false);

  $effect(() => {
    // Сработает после того, как ganttBodyEl привяжется и данные загрузятся
    if (ganttBodyEl && !loading && !initialScrolled) {
      initialScrolled = true;
      requestAnimationFrame(() => {
        ganttBodyEl.scrollLeft = scrollToCurrentMonth + 800;
        // Синхронизируем хедер
        if (headerScrollEl) {
          headerScrollEl.scrollLeft = scrollToCurrentMonth + 800;
        }
        // Вызываем sticky-эффект после скролла
        setTimeout(() => updateStickyLabels(), 100);
      });
    }
  });

  onMount(() => {
    const handleResize = () => { containerHeight = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    containerHeight = window.innerHeight;

    // Загружаем ивенты из YDB
    fetchEvents();

    return () => window.removeEventListener('resize', handleResize);
  });
</script>

<section class="art-gantt-page" style="height: {containerHeight}px">
  <div class="gantt-wrapper">
    <!-- ─── КНОПКА ДОБАВЛЕНИЯ (правый верхний угол) ──────────── -->
    <button class="add-event-btn" onclick={() => openEditor()} aria-label="Добавить ивент">
      +
    </button>

    {#if editorOpen}
      <EventEditor
        {form}
        {categories}
        {editingEvent}
        onsave={saveEvent}
        onclose={closeEditor}
        ondelete={deleteEvent}
      />
    {/if}

    <!-- ─── ИНДИКАТОР СТАТУСА ───────────────────────────────── -->
    {#if loading || saving}
      <div class="status-bar">
        {#if loading}
          <span class="status-spinner"></span>
          <span>Загрузка...</span>
        {:else if saving}
          <span class="status-spinner"></span>
          <span>Сохранение...</span>
        {/if}
      </div>
    {/if}

    <!-- ─── ШАПКА: ВРЕМЕННАЯ ШКАЛА ──────────────────────────── -->
    <div class="gantt-header">
      <div
        class="header-timescale-scroll"
        bind:this={headerScrollEl}
        onscroll={handleHeaderScroll}
        onpointerdown={handleDragPointerDown}
        onpointermove={handleDragPointerMove}
        onpointerup={handleDragPointerUp}
        onpointerleave={handleDragPointerUp}
        onpointercancel={handleDragPointerUp}
      >
        <div class="header-corner" bind:this={headerCornerEl}>
          <span class="header-corner-text">Категория</span>
        </div>
        <div class="header-timescale" style="width: {TOTAL_DAYS * DAY_WIDTH}px">
          <!-- Строка месяцев -->
          <div class="timescale-months">
            {#each months as month}
              <div
                class="timescale-month"
                style="width: {month.days.length * DAY_WIDTH}px"
              >
                <span class="timescale-month-label">{month.label}</span>
              </div>
            {/each}
          </div>
          <!-- Строка дней -->
          <div class="timescale-days">
            {#each days as day}
              <div
                class="timescale-day"
                class:weekend={day.getDay() === 0 || day.getDay() === 6}
                style="width: {DAY_WIDTH}px"
              >
                {day.getDate()}
              </div>
            {/each}
          </div>
          <!-- Вертикальная линия "сегодня" в шапке -->
          <div class="today-line-header" style="left: {todayPosition}px"></div>
        </div>
      </div>
    </div>

    <!-- ─── ТЕЛО: СТРОКИ КАТЕГОРИЙ ──────────────────────────── -->
    <div class="gantt-body">
      <!-- Фиксированная колонка с названиями категорий -->
      <div class="gantt-labels" bind:this={ganttLabelsEl} onscroll={handleLabelsScroll}>
        {#each categories as cat}
          {@const catData = eventsByCategory[cat.id]}
          <div
            class="row-label"
            style="min-height: {Math.max(catData.totalLanes * LANE_HEIGHT + 16, 60)}px"
          >
            <span class="row-label-dot" style="background: {cat.color}"></span>
            <span class="row-label-text">{cat.label}</span>
            <span class="row-label-count">{catData.lanes.reduce((sum, lane) => sum + lane.length, 0)}</span>
          </div>
        {/each}
      </div>

      <!-- Скроллируемая часть с событиями -->
      <div
        class="gantt-scroll"
        bind:this={ganttBodyEl}
        onscroll={handleBodyScroll}
        onpointerdown={handleDragPointerDown}
        onpointermove={handleDragPointerMove}
        onpointerup={handleDragPointerUp}
        onpointerleave={handleDragPointerUp}
        onpointercancel={handleDragPointerUp}
      >
        {#each categories as cat}
          {@const catData = eventsByCategory[cat.id]}
          <!-- onpointerdown на gantt-row, чтобы вся область строки реагировала на долгое нажатие -->
          <div
            class="gantt-row"
            role="region"
            aria-label="Строка категории {cat.label}"
            style="min-height: {Math.max(catData.totalLanes * LANE_HEIGHT + 16, 60)}px"
            onpointerdown={handleEmptyPointerDown}
            onpointermove={handleEmptyPointerMove}
            onpointerup={handleEmptyPointerUp}
            onpointerleave={handleEmptyPointerUp}
            onpointercancel={handleEmptyPointerUp}
          >
            <!-- Затемнение фона слева от сегодняшней даты (на всю высоту строки) -->
            <div
              class="today-shade"
              style="width: {todayPosition}px"
            ></div>
            <!-- Вертикальная линия "сегодня" (на всю высоту строки) -->
            <div
              class="today-line"
              style="left: {todayPosition}px"
            ></div>
            <div
              class="row-events"
              role="region"
              aria-label="События категории {cat.label}"
              style="width: {TOTAL_DAYS * DAY_WIDTH}px; min-width: {TOTAL_DAYS * DAY_WIDTH}px"
            >
              {#each catData.lanes as lane, laneIdx}
                {#each lane as evt (evt.id)}
                  <div
                    class="event-positioner"
                    style="left: {getEventLeft(evt)}px; width: {getEventWidth(evt)}px; top: {laneIdx * LANE_HEIGHT + 8}px; height: {LANE_HEIGHT - 4}px"
                  >
                    <EventCard
                      event={evt}
                      color={cat.color}
                      endPortion={getEndPortion(evt)}
                      onpointerdown={(e) => handleEventPointerDown(e, evt)}
                      onpointermove={handleEventPointerMove}
                      onpointerup={handleEventPointerUp}
                      onpointerleave={handleEventPointerUp}
                      onpointercancel={handleEventPointerUp}
                    />
                  </div>
                {/each}
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>

<style>
  .art-gantt-page {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    overflow: hidden;
    background: #f8fafc;
  }

  .gantt-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  /* ─── ШАПКА ──────────────────────────────────────────────── */
  .gantt-header {
    display: flex;
    flex-shrink: 0;
    border-bottom: 1px solid #e2e8f0;
    background: #ffffff;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .header-corner {
    display: flex;
    align-items: center;
    padding: 0.5rem 1rem;
    border-right: 1px solid #e2e8f0;
    font-weight: 700;
    font-size: 0.85rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: #ffffff;
    position: sticky;
    left: 0;
    z-index: 15;
    width: 200px;
    box-sizing: border-box;
    flex-shrink: 0;
  }

  .header-timescale-scroll {
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    display: flex;
    scrollbar-width: none;
    cursor: grab;
  }

  .header-timescale-scroll:active {
    cursor: grabbing;
  }

  .header-timescale-scroll::-webkit-scrollbar {
    display: none;
  }

  .header-timescale {
    position: relative;
  }

  .timescale-months {
    display: flex;
    height: 28px;
    border-bottom: 1px solid #e2e8f0;
    background: #f1f5f9;
  }

  .timescale-month {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    font-size: 0.8rem;
    font-weight: 700;
    color: #334155;
    border-right: 1px solid #e2e8f0;
    text-transform: capitalize;
    position: relative;
  }

  .timescale-month-label {
    position: relative;
    z-index: 5;
    background: #f1f5f9;
    padding: 0 10px;
    height: 100%;
    display: flex;
    align-items: center;
    white-space: nowrap;
  }

  /* Вертикальная линия "сегодня" в шапке */
  .today-line-header {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: rgba(100, 116, 139, 0.5);
    pointer-events: none;
    z-index: 10;
  }

  .timescale-days {
    display: flex;
    height: 24px;
  }

  .timescale-day {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    color: #94a3b8;
    border-right: 1px solid #f1f5f9;
  }

  .timescale-day.weekend {
    background: #f8fafc;
    color: #cbd5e1;
  }

  /* ─── ТЕЛО ────────────────────────────────────────────────── */
  .gantt-body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .gantt-labels {
    flex: 0 0 200px;
    overflow-y: auto;
    overflow-x: hidden;
    background: #ffffff;
    border-right: 1px solid #e2e8f0;
    z-index: 15;
    scrollbar-width: none;
  }

  .gantt-labels::-webkit-scrollbar {
    display: none;
  }

  .gantt-scroll {
    flex: 1;
    overflow-x: auto;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    cursor: grab;
  }

  .gantt-scroll:active {
    cursor: grabbing;
  }

  .gantt-row {
    position: relative;
    border-bottom: 1px solid #f1f5f9;
    width: fit-content;
    min-width: 100%;
  }

  .gantt-row:last-child {
    border-bottom: none;
  }

  .row-label {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    background: #ffffff;
  }

  .row-label-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .row-label-text {
    font-weight: 600;
    font-size: 0.9rem;
    color: #0f172a;
  }

  .row-label-count {
    margin-left: auto;
    font-size: 0.75rem;
    color: #94a3b8;
    background: #f1f5f9;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
  }

  .row-events {
    position: relative;
    padding: 8px 0;
    box-sizing: border-box;
    background:
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 39px,
        #f8fafc 39px,
        #f8fafc 40px
      );
  }

  /* Затемнение фона слева от сегодняшней даты */
  .today-shade {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.03);
    pointer-events: none;
    z-index: 1;
  }

  /* Вертикальная линия "сегодня" */
  .today-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: rgba(100, 116, 139, 0.5);
    pointer-events: none;
    z-index: 3;
  }

  .event-positioner {
    position: absolute;
    padding: 0 2px;
    box-sizing: border-box;
  }

  /* ─── КНОПКА ДОБАВЛЕНИЯ ───────────────────────────────────── */
  .add-event-btn {
    position: absolute;
    top: 8px;
    right: 12px;
    z-index: 50;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: #3b82f6;
    color: #fff;
    font-size: 1.4rem;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
    transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
  }

  .add-event-btn:hover {
    background: #2563eb;
    transform: scale(1.08);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
  }

  .add-event-btn:active {
    transform: scale(0.95);
  }

  /* ─── СТАТУС-БАР ──────────────────────────────────────────── */
  .status-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 1rem;
    background: #f0f9ff;
    border-bottom: 1px solid #bae6fd;
    font-size: 0.8rem;
    color: #0369a1;
    flex-shrink: 0;
  }

  .status-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid #bae6fd;
    border-top-color: #0369a1;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ─── МОБИЛЬНАЯ АДАПТАЦИЯ ────────────────────────────────── */
  @media (max-width: 768px) {
    .header-corner {
      display: none;
    }

    .gantt-labels {
      display: none;
    }

    .gantt-header {
      border-bottom: 1px solid #e2e8f0;
    }
  }
</style>
