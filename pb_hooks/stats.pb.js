/// <reference path="../pb_data/types.d.ts" />

/**
 * Автоматически пересчитывает success_rate задачи после каждого ответа ученика.
 * success_rate = доля правильных ответов по всем попыткам для данной задачи (0.0–1.0).
 * -1 означает «нет данных».
 *
 * ВАЖНО: DynamicModel не используется намеренно — в PocketBase 0.36.x он может быть недоступен.
 * Вместо SELECT + UPDATE используется один UPDATE с подзапросом.
 */

function updateTaskSuccessRate(app, taskId) {
  if (!taskId) return;
  try {
    app.db().newQuery(`
      UPDATE tasks
      SET success_rate = (
        SELECT CASE
          WHEN COUNT(*) > 0
          THEN CAST(SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(*)
          ELSE -1
        END
        FROM attempt_answers
        WHERE task = {:taskId}
      )
      WHERE id = {:taskId}
    `).bind({ taskId: taskId }).execute();
  } catch (err) {
    console.error('[stats hook] Error updating success_rate for task', taskId, String(err));
  }
}

onRecordAfterCreateSuccess((e) => {
  try {
    const taskId = e.record.getString('task');
    updateTaskSuccessRate(e.app, taskId);
  } catch (err) {
    console.error('[stats hook] Error in create hook:', String(err));
  }
  e.next();
}, 'attempt_answers');

onRecordAfterUpdateSuccess((e) => {
  try {
    const taskId = e.record.getString('task');
    updateTaskSuccessRate(e.app, taskId);
  } catch (err) {
    console.error('[stats hook] Error in update hook:', String(err));
  }
  e.next();
}, 'attempt_answers');
