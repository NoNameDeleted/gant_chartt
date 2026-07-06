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
  const startTime = Date.now();
  console.log('[api/events] POST запрос получен');
  try {
    const body = await request.json();
    console.log('[api/events] Тело запроса: events=', body.events ? body.events.length : 'нет', 'event=', body.event ? 'есть' : 'нет');

    if (body.events) {
      // Полная синхронизация — заменяем все ивенты
      console.log('[api/events] Вызываю saveAllEvents, ивентов:', body.events.length);
      await saveAllEvents(body.events);
      console.log('[api/events] saveAllEvents успешно за', Date.now() - startTime, 'мс');
      return json({ ok: true });
    }

    if (body.event) {
      // Сохраняем один ивент
      console.log('[api/events] Вызываю saveEvent, id:', body.event.id);
      await saveEvent(body.event);
      console.log('[api/events] saveEvent успешно за', Date.now() - startTime, 'мс');
      return json({ ok: true });
    }

    console.log('[api/events] Неверный формат запроса');
    return json({ error: 'Неверный формат запроса' }, { status: 400 });
  } catch (err) {
    console.error('[api/events] POST error за', Date.now() - startTime, 'мс:', err.message);
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