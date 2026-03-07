const TELEGRAM_API_BASE = "https://api.telegram.org"
const STATE_DIR = $filepath.join($os.getwd(), "pb_data")
const STATE_PATH = $filepath.join(STATE_DIR, "telegram_bot_state.json")
const REPORT_PERIODS = {
  week: { label: "За неделю", days: 6 },
  month: { label: "За месяц", days: 29 },
  all: { label: "За всё время", days: null },
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function getEnv(name, fallback) {
  const value = $os.getenv(name)
  return value ? String(value).trim() : (fallback || "")
}

function getConfig() {
  const token = getEnv("TELEGRAM_BOT_TOKEN")
  const allowedUserIds = getEnv("TELEGRAM_ALLOWED_USER_IDS")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

  return {
    token,
    allowedUserIds,
    defaultChatId: getEnv("TELEGRAM_DEFAULT_CHAT_ID"),
  }
}

function ensureStateDir() {
  try {
    $os.mkdirAll(STATE_DIR, 0o755)
  } catch (_) {}
}

function loadState() {
  ensureStateDir()
  try {
    return JSON.parse(toString($os.readFile(STATE_PATH)))
  } catch (_) {
    return { lastUpdateId: 0 }
  }
}

function saveState(state) {
  ensureStateDir()
  $os.writeFile(STATE_PATH, JSON.stringify(state, null, 2), 0o600)
}

function telegramRequest(config, method, payload) {
  if (!config.token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured")
  }

  const response = $http.send({
    method: "POST",
    url: TELEGRAM_API_BASE + "/bot" + config.token + "/" + method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
    timeout: 20,
  })

  if (response.statusCode < 200 || response.statusCode >= 300 || !response.json || response.json.ok !== true) {
    throw new Error("Telegram API error in " + method + ": " + JSON.stringify(response.json || { statusCode: response.statusCode, body: toString(response.body) }))
  }

  return response.json.result
}

function isAllowedUser(config, chatId) {
  if (config.allowedUserIds.length === 0) return false
  return config.allowedUserIds.indexOf(String(chatId)) !== -1
}

function normalizeGroupName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function getExamDebtDate(exam) {
  const label = exam.label || ""
  const match = label.match(/\d{2}\.\d{2}\.\d{2,4}/)
  if (match) return match[0]

  if (!exam.date) return ""
  const parts = String(exam.date).split("-")
  if (parts.length === 3) {
    const year = parts[0].slice(-2)
    return parts[2] + "." + parts[1] + "." + year
  }

  return String(exam.date)
}

function parseIsoDate(value) {
  if (!value) return null
  const date = new Date(String(value) + "T00:00:00")
  if (isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

function getPeriodStart(periodKey) {
  if (periodKey === "all") return null
  const period = REPORT_PERIODS[periodKey]
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  now.setDate(now.getDate() - period.days)
  return now
}

function splitMessage(text, maxLength) {
  const limit = maxLength || 3500
  if (text.length <= limit) return [text]

  const chunks = []
  let current = ""
  const lines = text.split("\n")

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const next = current ? current + "\n" + line : line
    if (next.length > limit && current) {
      chunks.push(current)
      current = line
    } else {
      current = next
    }
  }

  if (current) chunks.push(current)
  return chunks
}

function buildDataSnapshot() {
  const groups = $app.findAllRecords("groups")
  const students = $app.findAllRecords("students")
  const exams = $app.findAllRecords("exams")
  const results = $app.findAllRecords("student_results")

  const groupsData = groups.map((record) => ({
    id: record.id,
    name: record.getString("name"),
  }))

  const studentsData = students.map((record) => ({
    id: record.id,
    name: record.getString("name"),
    group: record.getString("group"),
  }))

  const examsData = exams.map((record) => ({
    id: record.id,
    group: record.getString("group"),
    examId: record.getString("exam_id"),
    label: record.getString("label"),
    date: record.getString("date"),
  }))

  const resultsData = results.map((record) => ({
    student: record.getString("student"),
    exam: record.getString("exam"),
    didNotTake: record.getBool("did_not_take"),
    isExempt: record.getBool("is_exempt"),
  }))

  return {
    groups: groupsData,
    students: studentsData,
    exams: examsData,
    results: resultsData,
  }
}

function resolveGroup(groups, rawName) {
  const query = normalizeGroupName(rawName)
  if (!query) return null

  for (let i = 0; i < groups.length; i += 1) {
    if (normalizeGroupName(groups[i].name) === query) {
      return groups[i]
    }
  }

  const contains = groups.filter((group) => normalizeGroupName(group.name).indexOf(query) !== -1)
  if (contains.length === 1) return contains[0]

  return null
}

function buildDebtReport(periodKey, groupName) {
  const period = REPORT_PERIODS[periodKey]
  if (!period) {
    return { ok: false, text: "Неизвестный период. Используйте /week, /month или /all." }
  }

  const snapshot = buildDataSnapshot()
  const targetGroup = resolveGroup(snapshot.groups, groupName)
  if (!targetGroup) {
    return {
      ok: false,
      text: groupName
        ? 'Группа не найдена. Используйте /groups, чтобы посмотреть доступные названия.'
        : 'Нужно указать группу. Пример: /week База 11 25 26',
    }
  }

  const periodStart = getPeriodStart(periodKey)
  const exams = snapshot.exams.filter((exam) => {
    if (exam.group !== targetGroup.id) return false
    if (!periodStart) return true
    const examDate = parseIsoDate(exam.date)
    return examDate && examDate >= periodStart
  })

  const students = snapshot.students.filter((student) => student.group === targetGroup.id)
  const resultsMap = {}
  for (let i = 0; i < snapshot.results.length; i += 1) {
    const result = snapshot.results[i]
    resultsMap[result.student + "__" + result.exam] = result
  }

  const studentDebts = []
  for (let i = 0; i < students.length; i += 1) {
    const student = students[i]
    const debts = []

    for (let j = 0; j < exams.length; j += 1) {
      const exam = exams[j]
      const result = resultsMap[student.id + "__" + exam.id]
      if ((!result || result.didNotTake) && !(result && result.isExempt)) {
        debts.push(exam)
      }
    }

    if (debts.length > 0) {
      debts.sort((a, b) => String(b.date).localeCompare(String(a.date)))
      studentDebts.push({
        student,
        exams: debts,
      })
    }
  }

  studentDebts.sort((a, b) => {
    if (b.exams.length !== a.exams.length) return b.exams.length - a.exams.length
    return a.student.name.localeCompare(b.student.name, "ru")
  })

  const title = "<b>" + escapeHtml(targetGroup.name) + "</b>"
  if (studentDebts.length === 0) {
    return {
      ok: true,
      text: title + "\n\nДолгов нет.",
    }
  }

  const lines = studentDebts.map((item) => {
    const examParts = item.exams.map((exam) => {
      return '<a href="' + escapeHtml("https://mathb-ege.sdamgia.ru/test?id=" + exam.examId) + '">' + escapeHtml(getExamDebtDate(exam)) + "</a>"
    }).join("; ")

    return escapeHtml(item.student.name) + " — " + item.exams.length + ": " + examParts + "."
  })

  return {
    ok: true,
    text: title + "\n\n" + lines.join("\n\n"),
  }
}

function buildGroupsList() {
  const groups = buildDataSnapshot().groups
    .map((group) => group.name)
    .sort((a, b) => a.localeCompare(b, "ru"))

  if (groups.length === 0) {
    return "Группы не найдены."
  }

  return "<b>Группы</b>\n\n" + groups.map((name) => "• " + escapeHtml(name)).join("\n")
}

function buildHelpText() {
  return [
    "<b>Команды бота</b>",
    "",
    "/groups",
    "/week &lt;группа&gt;",
    "/month &lt;группа&gt;",
    "/all &lt;группа&gt;",
    "",
    "Пример:",
    "/week База 11 25 26",
  ].join("\n")
}

function sendTelegramMessage(config, chatId, html) {
  const chunks = splitMessage(html, 3500)
  for (let i = 0; i < chunks.length; i += 1) {
    telegramRequest(config, "sendMessage", {
      chat_id: String(chatId),
      text: chunks[i],
      parse_mode: "HTML",
      disable_web_page_preview: true,
    })
  }
}

function processCommand(config, message) {
  const chat = message.chat || {}
  const chatId = chat.id
  if (!chatId || !isAllowedUser(config, chatId)) {
    return
  }

  const rawText = String(message.text || "").trim()
  if (!rawText) return

  const match = rawText.match(/^\/([a-z_]+)(?:@\w+)?(?:\s+([\s\S]+))?$/i)
  if (!match) {
    sendTelegramMessage(config, chatId, buildHelpText())
    return
  }

  const command = String(match[1] || "").toLowerCase()
  const arg = String(match[2] || "").trim()

  if (command === "start" || command === "help") {
    sendTelegramMessage(config, chatId, buildHelpText())
    return
  }

  if (command === "groups") {
    sendTelegramMessage(config, chatId, buildGroupsList())
    return
  }

  const periodMap = {
    week: "week",
    month: "month",
    all: "all",
  }

  const periodKey = periodMap[command]
  if (periodKey) {
    const report = buildDebtReport(periodKey, arg)
    sendTelegramMessage(config, chatId, report.text)
    return
  }

  sendTelegramMessage(config, chatId, buildHelpText())
}

function pollTelegramUpdates() {
  const config = getConfig()
  if (!config.token) return

  const state = loadState()
  const payload = {
    offset: Number(state.lastUpdateId || 0),
    timeout: 0,
    allowed_updates: ["message"],
  }

  try {
    const updates = telegramRequest(config, "getUpdates", payload)
    let nextOffset = Number(state.lastUpdateId || 0)

    for (let i = 0; i < updates.length; i += 1) {
      const update = updates[i]
      if (update.update_id >= nextOffset) {
        nextOffset = update.update_id + 1
      }

      if (update.message && update.message.text) {
        processCommand(config, update.message)
      }
    }

    if (nextOffset !== Number(state.lastUpdateId || 0)) {
      saveState({ lastUpdateId: nextOffset })
    }
  } catch (error) {
    console.log("[telegram-bot] polling failed:", error)
  }
}

routerAdd("GET", "/api/telegram-bot/status", (e) => {
  const config = getConfig()
  return e.json(200, {
    ok: true,
    configured: !!config.token,
    allowedUserIds: config.allowedUserIds,
    defaultChatId: config.defaultChatId,
    state: loadState(),
  })
}, $apis.requireSuperuserAuth())

cronAdd("telegram-bot-poll", "* * * * *", () => {
  pollTelegramUpdates()
})
