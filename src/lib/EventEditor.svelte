<script>
  let { form, categories, editingEvent, onsave, onclose, ondelete } = $props();

  let confirmDelete = $state(false);
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

    <label class="checkbox-row">
      <input type="checkbox" bind:checked={form.hasSet} />
      Есть набор
    </label>

    {#if form.hasSet}
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
    {:else}
      <label>
        Начало ивента
        <input type="date" bind:value={form.start} required />
      </label>
    {/if}

    <label>
      Дедлайн работ
      <input type="date" bind:value={form.deadline} required />
    </label>

    <div class="actions">
      {#if editingEvent}
        <button type="button" class="danger" onclick={() => confirmDelete = true}>🗑️</button>
      {/if}
      <button type="button" class="secondary" onclick={onclose}>Отмена</button>
      <button type="button" onclick={onsave}>Сохранить</button>
    </div>
  </div>

  {#if confirmDelete}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="confirm-overlay" role="button" tabindex="0" onclick={() => confirmDelete = false} onkeydown={(e) => e.key === 'Escape' && (confirmDelete = false)}>
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="confirm-dialog" role="dialog" tabindex="0" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && (confirmDelete = false)}>
        <p class="confirm-text">Вы точно хотите удалить ивент?</p>
        <div class="confirm-actions">
          <button type="button" class="secondary" onclick={() => confirmDelete = false}>Нет</button>
          <button type="button" class="danger" onclick={ondelete}>Да</button>
        </div>
      </div>
    </div>
  {/if}
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

  .checkbox-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;
    color: #334155;
    cursor: pointer;
  }

  .checkbox-row input[type="checkbox"] {
    width: 1.1rem;
    height: 1.1rem;
    accent-color: #2563eb;
    cursor: pointer;
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

  .actions .danger {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
    margin-right: auto;
    font-size: 1.1rem;
    line-height: 1;
    padding: 0.9rem 1rem;
    transition: background 0.15s;
  }

  .actions .danger:hover {
    background: #fee2e2;
  }

  .confirm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.35);
    display: grid;
    place-items: center;
    padding: 1rem;
    z-index: 60;
  }

  .confirm-dialog {
    background: white;
    border-radius: 1.25rem;
    padding: 1.5rem 2rem;
    box-shadow: 0 24px 80px rgba(15, 23, 42, 0.2);
    display: grid;
    gap: 1.25rem;
    max-width: 360px;
    width: 100%;
    text-align: center;
  }

  .confirm-text {
    margin: 0;
    font-size: 1.05rem;
    color: #0f172a;
    font-weight: 600;
  }

  .confirm-actions {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
  }

  .confirm-actions button {
    padding: 0.75rem 1.5rem;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    font-weight: 700;
    font-size: 0.95rem;
    min-width: 100px;
  }

  .confirm-actions .secondary {
    background: #f8fafc;
    color: #0f172a;
    border: 1px solid #cbd5e1;
  }

  .confirm-actions .danger {
    background: #dc2626;
    color: white;
  }

  .confirm-actions .danger:hover {
    background: #b91c1c;
  }

  @media (max-width: 850px) {
    .grid-two {
      grid-template-columns: 1fr;
    }
  }
</style>