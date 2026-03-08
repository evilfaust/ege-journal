import { Bot } from 'grammy'

const PB_URL    = process.env.PB_URL    || 'http://127.0.0.1:8090'
const SDAM_BASE = 'https://mathb-ege.sdamgia.ru'
const TOKEN     = process.env.TELEGRAM_BOT_TOKEN
const ALLOWED   = (process.env.TELEGRAM_ALLOWED_USER_IDS || '')
  .split(',').map(s => s.trim()).filter(Boolean)

const PERIODS = {
  week:  { label: 'За неделю',    days: 6  },
  month: { label: 'За месяц',     days: 29 },
  all:   { label: 'За всё время', days: null },
}
const GRADE_EMOJI  = ['', '', '🟥', '🟧', '🟩', '🟦']
const GRADE_CIRCLE = ['', '', '❷', '❸', '❹', '❺']

if (!TOKEN) {
  console.error('[bot] TELEGRAM_BOT_TOKEN не задан')
  process.exit(1)
}

// ── PocketBase API (коллекции публичные) ───────────────────────────────────

async function pbAll(collection) {
  let page = 1
  const items = []
  while (true) {
    const res  = await fetch(`${PB_URL}/api/collections/${collection}/records?perPage=500&page=${page}`)
    if (!res.ok) throw new Error(`PocketBase ${collection}: HTTP ${res.status}`)
    const data = await res.json()
    items.push(...data.items)
    if (items.length >= data.totalItems) break
    page++
  }
  return items
}

async function snapshot() {
  const [groups, students, exams, results] = await Promise.all([
    pbAll('groups'),
    pbAll('students'),
    pbAll('exams'),
    pbAll('student_results'),
  ])
  return { groups, students, exams, results }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim() }

function resolveGroup(groups, q) {
  if (!q) return null
  const exact = groups.find(g => norm(g.name) === norm(q))
  if (exact) return exact
  const hits = groups.filter(g => norm(g.name).includes(norm(q)))
  return hits.length === 1 ? hits[0] : null
}

function periodStart(key) {
  if (key === 'all') return null
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (PERIODS[key]?.days ?? 6))
  return d
}

function examDate(exam) {
  const m = (exam.label || '').match(/\d{2}\.\d{2}\.\d{2,4}/)
  if (m) return m[0]
  if (!exam.date) return '?'
  const [y, mo, d] = exam.date.split('-')
  return `${d}.${mo}.${y?.slice(-2)}`
}

function parseDate(s) {
  if (!s) return null
  const d = new Date(s + 'T00:00:00')
  return isNaN(d) ? null : (d.setHours(0, 0, 0, 0), d)
}

// ── Команды ────────────────────────────────────────────────────────────────

function help() {
  return [
    '<b>📊 Журнал ЕГЭ — бот</b>',
    '',
    '/ping — проверить связь',
    '/groups — список групп',
    '',
    '<b>Долги:</b>',
    '/week &lt;группа&gt; — за неделю',
    '/month &lt;группа&gt; — за месяц',
    '/all &lt;группа&gt; — за всё время',
    '',
    '<b>Оценки:</b>',
    '/scores &lt;группа&gt;',
    '/scores week|month|all &lt;группа&gt;',
    '/student &lt;имя&gt; — статистика ученика',
    '',
    '<i>Примеры:</i>',
    '/week База 11 25 26',
    '/scores month Проф 11',
    '/student Иванов',
  ].join('\n')
}

async function cmdGroups() {
  const { groups } = await snapshot()
  const names = groups.map(g => g.name).sort((a, b) => a.localeCompare(b, 'ru'))
  return names.length
    ? '<b>Группы:</b>\n\n' + names.map(n => `• ${n}`).join('\n')
    : 'Группы не найдены.'
}

async function cmdDebts(periodKey, groupName) {
  const period = PERIODS[periodKey]
  if (!period) return 'Неизвестный период.'

  const snap  = await snapshot()
  const group = resolveGroup(snap.groups, groupName)
  if (!group) return groupName
    ? 'Группа не найдена. Используйте /groups.'
    : 'Укажите группу. Пример: /week База 11 25 26'

  const start = periodStart(periodKey)
  const exams = snap.exams.filter(e => {
    if (e.group !== group.id) return false
    if (!start) return true
    const d = parseDate(e.date)
    return d && d >= start
  })

  const students = snap.students.filter(s => s.group === group.id)
  const rmap = Object.fromEntries(snap.results.map(r => [`${r.student}__${r.exam}`, r]))

  const rows = students
    .map(student => ({
      student,
      debts: exams.filter(e => {
        const r = rmap[`${student.id}__${e.id}`]
        return (!r || r.did_not_take) && !r?.is_exempt
      }).sort((a, b) => b.date.localeCompare(a.date)),
    }))
    .filter(r => r.debts.length)
    .sort((a, b) =>
      b.debts.length !== a.debts.length
        ? b.debts.length - a.debts.length
        : a.student.name.localeCompare(b.student.name, 'ru')
    )

  const title = `<b>${group.name}</b> — ${period.label}`
  if (!rows.length) return title + '\n\n✅ Долгов нет.'

  return title + '\n\n' + rows.map(({ student, debts }) =>
    `${student.name} — ${debts.length}: ` +
    debts.map(e => `<a href="${SDAM_BASE}/test?id=${e.exam_id}">${examDate(e)}</a>`).join('; ')
  ).join('\n\n')
}

async function cmdScores(periodKey, groupName) {
  if (!PERIODS[periodKey]) periodKey = 'all'
  const period = PERIODS[periodKey]

  const snap  = await snapshot()
  const group = resolveGroup(snap.groups, groupName)
  if (!group) return groupName
    ? 'Группа не найдена. Используйте /groups.'
    : 'Укажите группу. Пример: /scores База 11 25 26'

  const start   = periodStart(periodKey)
  const examIds = new Set(
    snap.exams
      .filter(e => {
        if (e.group !== group.id) return false
        if (!start) return true
        const d = parseDate(e.date)
        return d && d >= start
      })
      .map(e => e.id)
  )

  const rows = snap.students
    .filter(s => s.group === group.id)
    .map(student => {
      const taken = snap.results.filter(r =>
        r.student === student.id && examIds.has(r.exam) && !r.did_not_take && !r.is_exempt && r.grade > 0
      )
      const avg = taken.length ? taken.reduce((s, r) => s + r.grade, 0) / taken.length : null
      return { name: student.name, avg, count: taken.length }
    })
    .sort((a, b) => {
      if (a.avg === null && b.avg === null) return a.name.localeCompare(b.name, 'ru')
      if (a.avg === null) return 1
      if (b.avg === null) return -1
      return b.avg !== a.avg ? b.avg - a.avg : a.name.localeCompare(b.name, 'ru')
    })

  const title = `<b>${group.name}</b> — оценки (${period.label})`
  return title + '\n\n' + rows.map(r =>
    r.avg === null
      ? `⬜ ${r.name} — нет данных`
      : `${GRADE_EMOJI[Math.round(r.avg)] ?? '⬜'} ${r.name} — <b>${r.avg.toFixed(1)}</b> (${r.count} раб.)`
  ).join('\n')
}

async function cmdStudent(namePart) {
  if (!namePart) return 'Укажите имя. Пример: /student Иванов'
  const q = namePart.toLowerCase().trim()

  const snap    = await snapshot()
  const matches = snap.students.filter(s => s.name.toLowerCase().includes(q))

  if (!matches.length) return `Студент не найден: ${namePart}`
  if (matches.length > 5) return (
    `Найдено ${matches.length} студентов. Уточните:\n` +
    matches.slice(0, 6).map(s => `• ${s.name}`).join('\n')
  )

  const parts = await Promise.all(matches.map(async student => {
    const group   = snap.groups.find(g => g.id === student.group)
    const all     = snap.results.filter(r => r.student === student.id && !r.is_exempt)
    const taken   = all.filter(r => !r.did_not_take && r.grade > 0)
    const missed  = all.filter(r => r.did_not_take)
    const avg     = taken.length
      ? (taken.reduce((s, r) => s + r.grade, 0) / taken.length).toFixed(1)
      : null
    const dist    = { 2: 0, 3: 0, 4: 0, 5: 0 }
    taken.forEach(r => { if (r.grade in dist) dist[r.grade]++ })

    const last5 = [...taken]
      .sort((a, b) => {
        const da = snap.exams.find(e => e.id === a.exam)?.date ?? ''
        const db = snap.exams.find(e => e.id === b.exam)?.date ?? ''
        return db.localeCompare(da)
      })
      .slice(0, 5)

    const lines = [`<b>${student.name}</b>${group ? ` (${group.name})` : ''}`]
    if (avg !== null) {
      lines.push(`Средняя: <b>${avg}</b>  |  Работ: ${taken.length}  |  Пропусков: ${missed.length}`)
      lines.push(`❺ ${dist[5]}  ❹ ${dist[4]}  ❸ ${dist[3]}  ❷ ${dist[2]}`)
      if (last5.length) {
        lines.push('\nПоследние работы:')
        last5.forEach(r => {
          const exam  = snap.exams.find(e => e.id === r.exam)
          const label = exam ? examDate(exam) : '?'
          const link  = exam ? `<a href="${SDAM_BASE}/test?id=${exam.exam_id}">${label}</a>` : label
          lines.push(`  ${GRADE_CIRCLE[r.grade] ?? r.grade} ${link}  (${r.correct_count} верных)`)
        })
      }
    } else {
      lines.push('Нет результатов.')
    }
    return lines.join('\n')
  }))

  return parts.join('\n\n─────────────────\n\n')
}

// ── Bot setup ──────────────────────────────────────────────────────────────

const bot = new Bot(TOKEN)

function allowed(ctx) {
  const id = String(ctx.from?.id ?? '')
  return !ALLOWED.length || ALLOWED.includes(id)
}

async function handle(ctx, fn) {
  if (!allowed(ctx)) return
  try {
    const text = await fn()
    await ctx.reply(text, { parse_mode: 'HTML', disable_web_page_preview: true })
  } catch (err) {
    console.error('[bot] error:', err.message)
    await ctx.reply(`❌ Ошибка: ${err.message}`)
  }
}

bot.command(['start', 'help'], ctx => handle(ctx, () => help()))

bot.command('ping', ctx => handle(ctx, () => {
  const ts = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
  return `✅ Бот работает\n${ts}`
}))

bot.command('groups', ctx => handle(ctx, () => cmdGroups()))

bot.command('week',  ctx => handle(ctx, () => cmdDebts('week',  ctx.match?.trim() ?? '')))
bot.command('month', ctx => handle(ctx, () => cmdDebts('month', ctx.match?.trim() ?? '')))
bot.command('all',   ctx => handle(ctx, () => cmdDebts('all',   ctx.match?.trim() ?? '')))

bot.command('scores', ctx => handle(ctx, () => {
  const arg = ctx.match?.trim() ?? ''
  const m   = arg.match(/^(week|month|all)\s+([\s\S]+)$/i)
  return m ? cmdScores(m[1].toLowerCase(), m[2].trim()) : cmdScores('all', arg)
}))

bot.command('student', ctx => handle(ctx, () => cmdStudent(ctx.match?.trim() ?? '')))

bot.on('message:text', ctx => {
  if (!allowed(ctx)) return
  ctx.reply(help(), { parse_mode: 'HTML' })
})

bot.catch(err => console.error('[bot] unhandled:', err.message))

bot.start({ onStart: () => console.log('[bot] ✅ запущен, ожидаю сообщения...') })
