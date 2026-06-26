import { json } from '@sveltejs/kit';
import { loadEvents, saveEvent, deleteEvent, saveAllEvents } from '$lib/server/ydb.js';

/**
 * GET /api/events — загрузить все ивенты из YDB
 */
export async function GET() {
  try {
    const events = await loadEvents();
    return json(events);
  } catch (err) {
    console.error('[api/events] GET error:', err);
    return json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/events — сохранить ивент (или массив ивентов)
 * Тело: { events: [...] } — полная синхронизация (замена всех)
 *   или: { event: {...} } — сохранение одного ивента
 */
export async function POST({ request }) {
  try {
    const body = await request.json();

    if (body.events) {
      // Полная синхронизация — заменяем все ивенты
      await saveAllEvents(body.events);
      return json({ ok: true });
    }

    if (body.event) {
      // Сохраняем один ивент
      await saveEvent(body.event);
      return json({ ok: true });
    }

    return json({ error: 'Неверный формат запроса' }, { status: 400 });
  } catch (err) {
    console.error('[api/events] POST error:', err);
    return json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/events — удалить ивент
 * Тело: { id: number }
 */
export async function DELETE({ request }) {
  try {
    const body = await request.json();
    await deleteEvent(body.id);
    return json({ ok: true });
  } catch (err) {
    console.error('[api/events] DELETE error:', err);
    return json({ error: err.message }, { status: 500 });
  }
}