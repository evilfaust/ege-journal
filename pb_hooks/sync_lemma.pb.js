/// <reference path="../pb_data/types.d.ts" />

// POST /api/sync-lemma
// Запускает scripts/sync-to-lemma.mjs --push — пуш работ/результатов/потасковых
// ответов из локального PB журнала в облачную Lemma. Кнопка в UI (TopBar) дёргает
// этот роут.
//
// Скрипт, его зависимость (node_modules/pocketbase) и .env.lemma с секретами лежат
// в репозитории проекта, а НЕ в рабочей директории PocketBase. Поэтому ниже мы ищем
// папку, где есть .env.lemma, и запускаем скрипт оттуда:
//   - локально (./start.sh): cwd PocketBase = корень проекта → "."
//   - на RPi (prod): полный чекаут в /home/faust/apps/ege-journal-src
// Нужен node в PATH процесса PocketBase.
routerAdd("POST", "/api/sync-lemma", (e) => {
  const candidates = [".", "/home/faust/apps/ege-journal-src"]

  let dir = ""
  for (const d of candidates) {
    try {
      $os.stat(d + "/.env.lemma")
      dir = d
      break
    } catch (_) {
      // нет .env.lemma в этой папке — пробуем следующую
    }
  }
  if (!dir) {
    return e.json(500, {
      ok: false,
      output: "Не найден .env.lemma ни в одной из папок: " + candidates.join(", "),
    })
  }

  // `|| true` — чтобы sh всегда завершался кодом 0 и output() не бросал
  // исключение, теряя текст. Успех/ошибку определяем по содержимому вывода.
  const cmd = $os.cmd(
    "sh",
    "-c",
    "cd '" + dir + "' && node --env-file=.env.lemma scripts/sync-to-lemma.mjs --push 2>&1 || true",
  )

  let output = ""
  try {
    output = toString(cmd.output())
  } catch (err) {
    return e.json(500, { ok: false, output: "Не удалось запустить синхронизацию: " + String(err) })
  }

  const ok = output.indexOf("✅") !== -1
  return e.json(ok ? 200 : 500, { ok, output })
})
