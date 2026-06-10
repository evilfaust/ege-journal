#!/usr/bin/env node
/**
 * Синхронизация результатов решу.ЕГЭ из локального ege-journal в облачную Lemma.
 *
 * Направление: ДОМ → ОБЛАКО (исходящий HTTPS). Локальный PB не светится наружу.
 * Идемпотентно: повторный запуск обновляет существующие записи, не плодит дубли.
 *
 * Запуск (Node 20+):
 *   node --env-file=.env.lemma scripts/sync-to-lemma.mjs          # dry-run (ничего не пишет)
 *   node --env-file=.env.lemma scripts/sync-to-lemma.mjs --push   # реальная заливка
 *
 * .env.lemma (см. .env.lemma.example):
 *   LEMMA_PB_URL=https://task-ege.oipav.ru
 *   LEMMA_SYNC_USER=journal-sync          # отдельный учитель (role=editor) в Lemma
 *   LEMMA_SYNC_PASS=...                    # его пароль
 *   LEMMA_OWNER_ID=<id основного учителя>  # чьи это данные в журнале Lemma
 *   LOCAL_PB_URL=http://127.0.0.1:8090     # (опц.) локальный PB журнала
 */
import PocketBase from 'pocketbase';

const PUSH = process.argv.includes('--push');
const LOCAL_URL = process.env.LOCAL_PB_URL || 'http://127.0.0.1:8090';
const LEMMA_URL = process.env.LEMMA_PB_URL || 'https://task-ege.oipav.ru';
const USER = process.env.LEMMA_SYNC_USER;
const PASS = process.env.LEMMA_SYNC_PASS;

function die(msg) { console.error(`❌ ${msg}`); process.exit(1); }

if (!USER || !PASS) die('Заполни LEMMA_SYNC_USER / LEMMA_SYNC_PASS (см. .env.lemma.example).');

const q = (s) => String(s ?? '').replace(/"/g, '\\"');

async function main() {
  console.log(`\n🔄 Sync ege-journal → Lemma  (${PUSH ? 'PUSH' : 'DRY-RUN'})`);
  console.log(`   local:  ${LOCAL_URL}`);
  console.log(`   lemma:  ${LEMMA_URL}\n`);

  const local = new PocketBase(LOCAL_URL);
  local.autoCancellation(false);
  const lemma = new PocketBase(LEMMA_URL);
  lemma.autoCancellation(false);

  // [1/5] Авторизация sync-аккаунта в Lemma
  try {
    await lemma.collection('teachers').authWithPassword(USER, PASS);
  } catch (e) {
    die(`Не удалось войти в Lemma как ${USER}: ${e?.message}`);
  }
  const owner = process.env.LEMMA_OWNER_ID || lemma.authStore.model?.id;
  console.log(`[1/5] Вход ок. owner=${owner}${process.env.LEMMA_OWNER_ID ? ' (из env)' : ' (sync-аккаунт)'}`);

  // [2/5] Чтение локальных данных журнала
  const [groups, exams, examTasks, results, answers, students] = await Promise.all([
    local.collection('groups').getFullList(),
    local.collection('exams').getFullList(),
    local.collection('exam_tasks').getFullList(),
    local.collection('student_results').getFullList(),
    local.collection('student_answers').getFullList(),
    local.collection('students').getFullList(),
  ]);
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const studentName = new Map(students.map((s) => [s.id, s.name]));
  const examById = new Map(exams.map((e) => [e.id, e]));
  // (localExamId|task_number) -> problem_id
  const problemByTask = new Map(examTasks.map((t) => [`${t.exam}|${t.task_number}`, t.problem_id]));
  console.log(`[2/5] Локально: ${exams.length} работ, ${results.length} результатов, ${answers.length} ответов, ${students.length} учеников`);

  // [3/5] Предзагрузка существующих записей Lemma (для upsert)
  const fOwner = `owner = "${q(owner)}"`;
  const [exExams, exResults, exTasks] = await Promise.all([
    lemma.collection('ext_journal_exams').getFullList({ filter: fOwner }),
    lemma.collection('ext_journal_results').getFullList({ filter: fOwner }),
    lemma.collection('ext_journal_task_results').getFullList({ filter: fOwner }),
  ]);
  // Храним сам существующий record (не только id), чтобы сравнивать поля и
  // не слать update там, где ничего не поменялось.
  const exExamKey = new Map(exExams.map((r) => [r.exam_id, r]));
  const exResKey = new Map(exResults.map((r) => [`${r.exam_id}|${r.student_name}`, r]));
  const exTaskKey = new Map(exTasks.map((r) => [`${r.exam_id}|${r.student_name}|${r.task_number}`, r]));
  console.log(`[3/5] В Lemma уже: ${exExams.length} работ, ${exResults.length} результатов, ${exTasks.length} ответов`);

  // Сравнение значений поля: null/undefined эквивалентны; bool/число/строка
  // приводятся к сопоставимому виду (PB может вернуть число строкой и т.п.).
  const sameVal = (a, b) => {
    const na = a === null || a === undefined ? null : a;
    const nb = b === null || b === undefined ? null : b;
    if (typeof na === 'boolean' || typeof nb === 'boolean') return !!na === !!nb;
    if (na === null || nb === null) return na === nb;
    return String(na) === String(nb);
  };
  const unchanged = (rec, data) => Object.keys(data).every((k) => sameVal(rec[k], data[k]));

  // c=created, u=updated, s=skipped (без изменений)
  const stat = { exams: { c: 0, u: 0, s: 0 }, results: { c: 0, u: 0, s: 0 }, tasks: { c: 0, u: 0, s: 0 } };
  const upsert = async (coll, exist, data, kind) => {
    if (exist) {
      if (unchanged(exist, data)) { stat[kind].s++; return; }
      if (PUSH) await lemma.collection(coll).update(exist.id, data);
      stat[kind].u++;
    } else {
      if (PUSH) await lemma.collection(coll).create({ ...data, owner });
      stat[kind].c++;
    }
  };

  // [4/5] Работы
  for (const e of exams) {
    await upsert('ext_journal_exams', exExamKey.get(e.exam_id), {
      exam_id: e.exam_id,
      title: e.title || e.label || '',
      date: e.date || '',
      group_name: groupName.get(e.group) || '',
      source: 'ege-journal',
    }, 'exams');
  }

  // Результаты
  for (const r of results) {
    const e = examById.get(r.exam);
    if (!e) continue;
    const sName = studentName.get(r.student);
    if (!sName) continue;
    await upsert('ext_journal_results', exResKey.get(`${e.exam_id}|${sName}`), {
      exam_id: e.exam_id,
      student_name: sName,
      group_name: groupName.get(e.group) || '',
      grade: r.grade ?? null,
      correct_count: r.correct_count ?? null,
      part1_score: r.part1_score ?? null,
      did_not_take: !!r.did_not_take,
    }, 'results');
  }

  // Потасковые ответы
  for (const a of answers) {
    const e = examById.get(a.exam);
    if (!e) continue;
    const sName = studentName.get(a.student);
    if (!sName) continue;
    await upsert('ext_journal_task_results', exTaskKey.get(`${e.exam_id}|${sName}|${a.task_number}`), {
      exam_id: e.exam_id,
      student_name: sName,
      task_number: a.task_number,
      problem_id: problemByTask.get(`${a.exam}|${a.task_number}`) || '',
      is_correct: !!a.is_correct,
    }, 'tasks');
  }

  // формат: +создано / ~обновлено / =без изменений
  console.log(`[4/5] Работы: +${stat.exams.c} / ~${stat.exams.u} / =${stat.exams.s}`);
  console.log(`      Результаты: +${stat.results.c} / ~${stat.results.u} / =${stat.results.s}`);
  console.log(`      Ответы: +${stat.tasks.c} / ~${stat.tasks.u} / =${stat.tasks.s}`);
  console.log(`[5/5] ${PUSH ? '✅ Залито в Lemma.' : 'ℹ️  DRY-RUN — ничего не записано. Повтори с --push.'}\n`);
}

main().catch((e) => die(e?.message || String(e)));
