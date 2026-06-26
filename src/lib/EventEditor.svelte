<script>
  let { form, categories, editingEvent, onsave, onclose } = $props();
</script>

<div class="overlay" role="button" tabindex="0" onclick={onclose} onkeydown={(e) => e.key === 'Escape' && onclose()}>
  <div
    class="editor"
    role="dialog"
    tabindex="0"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.key === 'Escape' && onclose()}
  >
    <div class="editor-header">
      <h2>{editingEvent ? "Редактировать ивент" : "Новый ивент"}</h2>
      <button type="button" class="close" onclick={onclose}>&times;</button>
    </div>

    <label>
      Название
      <input type="text" bind:value={form.text} placeholder="Название ивента" required />
    </label>

    <label>
      Категория
      <select bind:value={form.category}>
        {#each categories as cat}
          <option value={cat.id}>{cat.label}</option>
        {/each}
      </select>
    </label>

    <label>
      Ссылка на пост
      <input type="url" bind:value={form.link} placeholder="https://..." />
    </label>

    <div class="grid-two">
      <label>
        Начало набора
        <input type="date" bind:value={form.start} required />
      </label>
      <label>
        Конец набора
        <input type="date" bind:value={form.end} required />
      </label>
    </div>

    <label>
      Дедлайн работ
      <input type="date" bind:value={form.deadline} required />
    </label>

    <div class="actions">
      <button type="button" class="secondary" onclick={onclose}>Отмена</button>
      <button type="button" onclick={onsave}>Сохранить</button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: grid;
    place-items: center;
    padding: 1rem;
    z-index: 50;
  }

  .editor {
    width: min(600px, 100%);
    background: white;
    border-radius: 1.25rem;
    padding: 1.25rem 1.5rem;
    box-shadow: 0 24px 80px rgba(15, 23, 42, 0.16);
    display: grid;
    gap: 1rem;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .editor-header h2 {
    margin: 0;
    font-size: 1.2rem;
  }

  .close {
    border: none;
    background: transparent;
    font-size: 1.8rem;
    line-height: 1;
    cursor: pointer;
  }

  label {
    display: grid;
    gap: 0.35rem;
    font-size: 0.95rem;
    color: #334155;
  }

  input,
  select {
    width: 100%;
    border: 1px solid #cbd5e1;
    border-radius: 0.85rem;
    padding: 0.85rem 1rem;
    font: inherit;
    background: white;
  }

  .grid-two {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .actions button {
    padding: 0.9rem 1.2rem;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    font-weight: 700;
  }

  .actions .secondary {
    background: #f8fafc;
    color: #0f172a;
    border: 1px solid #cbd5e1;
  }

  .actions button:last-child {
    background: #2563eb;
    color: white;
  }

  @media (max-width: 850px) {
    .grid-two {
      grid-template-columns: 1fr;
    }
  }
</style>