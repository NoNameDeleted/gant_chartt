<script>
  let {
    event,
    color = "#64748b",
    endPortion = 1,
    onpointerdown,
    onpointerup,
    onpointerleave,
    onpointercancel,
    ondblclick,
  } = $props();

  // Светлая версия цвета для периода после набора (end → deadline)
  function lightenColor(hex, amount = 0.4) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const mix = (c) => Math.round(c + (255 - c) * amount);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
  }

  // Используем $derived, чтобы lightColor реактивно обновлялся при изменении color
  let lightColor = $derived(lightenColor(color));

  function formatDate(value) {
    const d = new Date(value);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      ondblclick?.();
    }
  }
</script>

<div
  class="event-card"
  role="button"
  tabindex="0"
  aria-label="{event.text}, {formatDate(event.start)} — {formatDate(event.deadline)}"
  style="border-left-color: {color}"
  {onpointerdown}
  {onpointerup}
  {onpointerleave}
  {onpointercancel}
  {ondblclick}
  onkeydown={handleKeyDown}
>
  <!-- Двухцветный фон: если есть набор — левая часть яркая, правая светлая -->
  {#if event.hasSet}
    <div
      class="card-bg-segment card-bg-active"
      style="background: {color}; width: {endPortion * 100}%"
    ></div>
    <div
      class="card-bg-segment card-bg-deadline"
      style="background: {lightColor}; width: {(1 - endPortion) * 100}%"
    ></div>
  {:else}
    <!-- Если набора нет — весь ивент яркого цвета -->
    <div
      class="card-bg-segment card-bg-active"
      style="background: {color}; width: 100%"
    ></div>
  {/if}

  <!-- Контент поверх фона -->
  <div class="card-content">
    <div class="event-title">{event.text}</div>
    <div class="event-meta">
      {#if event.hasSet}
        <span class="event-date">{formatDate(event.start)} — {formatDate(event.end)}</span>
      {:else}
        <span class="event-date">{formatDate(event.start)}</span>
      {/if}
      <span class="event-deadline">⏱{formatDate(event.deadline)}</span>
    </div>
  </div>
</div>

<style>
  .event-card {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    border-radius: 0.4rem;
    border: 1px solid #e2e8f0;
    border-left: 3px solid;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    cursor: pointer;
    position: relative;
    transition: box-shadow 0.15s, transform 0.1s;
    user-select: none;
    -webkit-user-select: none;
  }

  .event-card:hover {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  }

  .event-card:active {
    transform: scale(0.98);
  }

  /* Двухцветные сегменты фона */
  .card-bg-segment {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    opacity: 0.15;
    pointer-events: none;
  }

  .card-bg-active {
    opacity: 0.18;
  }

  .card-bg-deadline {
    left: auto;
    right: 0;
    opacity: 0.1;
  }

  /* Контент поверх фона */
  .card-content {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 2;
    padding: 0.25rem 0.5rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.1rem;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 0.3rem;
    min-width: max-content;
    box-shadow: 2px 0 6px rgba(0, 0, 0, 0.06);
    pointer-events: none;
    transition: left 0.15s ease-out;
  }

  .event-title {
    font-weight: 700;
    font-size: 0.7rem;
    color: #0f172a;
    white-space: nowrap;
    line-height: 1.2;
  }

  .event-meta {
    display: flex;
    gap: 0.35rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .event-date {
    font-size: 0.6rem;
    color: #334155;
    white-space: nowrap;
  }

  .event-deadline {
    font-size: 0.55rem;
    color: #dc2626;
    font-weight: 600;
    white-space: nowrap;
  }
</style>