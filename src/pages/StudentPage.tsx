import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { pb, type Student, type Exam, type StudentResult, type StudentAnswer, type ExamTask, examUrl, problemUrl, filterIn } from '../lib/pb'
import GradeCell from '../components/GradeCell'
import StudentExamModal from '../components/StudentExamModal'
import { ExternalLink, ArrowLeft, TrendingUp, Settings2, FileDown } from 'lucide-react'
import { format, parse } from 'date-fns'
import { ru } from 'date-fns/locale'

function fmtDate(d: string) {
  try {
    const parsed = d.includes('-')
      ? parse(d, 'yyyy-MM-dd', new Date())
      : parse(d, 'dd.MM.yyyy', new Date())
    return format(parsed, 'd MMM yy', { locale: ru })
  } catch {
    return d
  }
}

const DOW = [
  { short: 'Вс', color: 'text-gray-400' },
  { short: 'Пн', color: 'text-blue-500' },
  { short: 'Вт', color: 'text-gray-400' },
  { short: 'Ср', color: 'text-emerald-500' },
  { short: 'Чт', color: 'text-gray-400' },
  { short: 'Пт', color: 'text-violet-500' },
  { short: 'Сб', color: 'text-gray-400' },
]

function getDow(d: string) {
  try {
    const parsed = d.includes('-')
      ? parse(d, 'yyyy-MM-dd', new Date())
      : parse(d, 'dd.MM.yyyy', new Date())
    return DOW[parsed.getDay()]
  } catch {
    return null
  }
}

function parseExamDate(d: string) {
  try {
    return d.includes('-')
      ? parse(d, 'yyyy-MM-dd', new Date())
      : parse(d, 'dd.MM.yyyy', new Date())
  } catch {
    return null
  }
}

function monthLabelFromDate(date: Date) {
  const label = format(date, 'LLLL yyyy', { locale: ru })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

type TaskStat = {
  task_number: number
  attempts: number
  correct: number
  rate: number
  problem_id: string
  failed_problem_ids: string[]
}

function buildTaskStats(tasks: ExamTask[], answers: StudentAnswer[]): TaskStat[] {
  const taskProblemByKey = new Map<string, string>()
  for (const t of tasks) {
    taskProblemByKey.set(`${t.exam}|${t.task_number}`, t.problem_id)
  }

  const failedByTask = new Map<number, Set<string>>()
  for (const a of answers) {
    if (a.is_correct) continue
    const problemId = taskProblemByKey.get(`${a.exam}|${a.task_number}`)
    if (!problemId) continue
    const cur = failedByTask.get(a.task_number) ?? new Set<string>()
    cur.add(problemId)
    failedByTask.set(a.task_number, cur)
  }

  const answerMap = new Map<string, { attempts: number; correct: number }>()
  for (const a of answers) {
    const key = `${a.exam}|${a.task_number}`
    const cur = answerMap.get(key) ?? { attempts: 0, correct: 0 }
    answerMap.set(key, {
      attempts: cur.attempts + 1,
      correct: cur.correct + (a.is_correct ? 1 : 0),
    })
  }

  const taskAgg = new Map<number, { attempts: number; correct: number; problem_id: string }>()
  for (const t of tasks) {
    const key = `${t.exam}|${t.task_number}`
    const stats = answerMap.get(key)
    if (!stats) continue
    const cur = taskAgg.get(t.task_number) ?? {
      attempts: 0,
      correct: 0,
      problem_id: t.problem_id,
    }
    taskAgg.set(t.task_number, {
      attempts: cur.attempts + stats.attempts,
      correct: cur.correct + stats.correct,
      problem_id: t.problem_id,
    })
  }

  return [...taskAgg.entries()]
    .map(([task_number, s]) => ({
      task_number,
      attempts: s.attempts,
      correct: s.correct,
      rate: s.correct / s.attempts,
      problem_id: s.problem_id,
      failed_problem_ids: [...(failedByTask.get(task_number) ?? new Set<string>())],
    }))
    .sort((a, b) => a.task_number - b.task_number)
}

export default function StudentPage() {
  const { studentId } = useParams<{ studentId: string }>()
  const [student, setStudent] = useState<Student | null>(null)
  const [results, setResults] = useState<StudentResult[]>([])
  const [exams, setExams] = useState<Map<string, Exam>>(new Map())

  // Tasks/Answers state
  const [tasks, setTasks] = useState<ExamTask[]>([])
  const [answers, setAnswers] = useState<StudentAnswer[]>([])
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) return

    async function load() {
      try {
        const std = await pb.collection('students').getOne<Student>(studentId!)
        setStudent(std)

        // Load ALL exams for the student's group
        const allGroupExams = await pb.collection('exams').getFullList<Exam>({
          filter: `group="${std.group}"`,
          sort: 'date',
        })

        const examMap = new Map<string, Exam>()
        for (const e of allGroupExams) {
          examMap.set(e.id, e)
        }
        setExams(examMap)

        const res = await pb.collection('student_results').getFullList<StudentResult>({
          filter: `student="${studentId}"`,
          expand: 'exam',
        })

        // Ensure we have a result entity for every exam, even if it's a debt
        const completeResults: StudentResult[] = allGroupExams.map(exam => {
          const existing = res.find(r => r.exam === exam.id)
          if (existing) return existing

          return {
            id: `virtual-${exam.id}`,
            student: std.id,
            exam: exam.id,
            correct_count: 0,
            grade: 0,
            part1_score: 0,
            did_not_take: true,
            is_exempt: false,
          }
        })

        setResults(completeResults)

        // Load all answers for this student
        const fetchedAnswers = await pb.collection('student_answers').getFullList<StudentAnswer>({
          filter: `student="${studentId}"`,
        })

        // Load all exam tasks
        const examIds = [...examMap.keys()]
        const fetchedTasks = examIds.length > 0
          ? await pb.collection('exam_tasks').getFullList<ExamTask>({
            filter: filterIn('exam', examIds),
          })
          : []

        setTasks(fetchedTasks)
        setAnswers(fetchedAnswers)

        // Extract available months from exams
        const months = new Set<string>()
        allGroupExams.forEach(e => {
          const dateStr = fmtDate(e.date)
          // Extract Month + Year (e.g. from "5 мар 26" -> "мар 26")
          const parts = dateStr.split(' ')
          if (parts.length >= 3) { // usually "D MMM YY"
            months.add(`${parts[1]} ${parts[2]}`)
          } else if (parts.length === 2) {
            months.add(`${parts[0]} ${parts[1]}`)
          }
        })
        const monthsArr = Array.from(months)
        // Basic sort - if they are chronological by exams, they'll mostly be fine,
        // but since Set preserves insertion order and exams were sorted by date,
        // the Set order is already chronological!
        setAvailableMonths(monthsArr)

      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [studentId])

  // Derive taskStats whenever selectedMonth, tasks, or answers change
  const taskStats = useMemo(() => {
    // Filter answers by selected month
    const filteredAnswers = selectedMonth === 'all' ? answers : answers.filter(a => {
      const e = exams.get(a.exam)
      if (!e) return false
      const dateStr = fmtDate(e.date)
      const parts = dateStr.split(' ')
      const monthYear = parts.length >= 3 ? `${parts[1]} ${parts[2]}` : parts.length === 2 ? `${parts[0]} ${parts[1]}` : dateStr
      return monthYear === selectedMonth
    })

    return buildTaskStats(tasks, filteredAnswers)
  }, [tasks, answers, selectedMonth, exams])

  const taskStatsAll = useMemo(() => buildTaskStats(tasks, answers), [tasks, answers])

  const { monthMeta, examMonthKey } = useMemo(() => {
    const meta: { key: string; label: string }[] = []
    const seen = new Set<string>()
    const keyByExam = new Map<string, string>()

    for (const exam of exams.values()) {
      const parsed = parseExamDate(exam.date)
      if (!parsed) continue
      const key = format(parsed, 'yyyy-MM')
      const label = monthLabelFromDate(parsed)
      keyByExam.set(exam.id, key)
      if (!seen.has(key)) {
        seen.add(key)
        meta.push({ key, label })
      }
    }
    return { monthMeta: meta, examMonthKey: keyByExam }
  }, [exams])

  const monthlyStats = useMemo(() => {
    return monthMeta.map(m => {
      const filteredAnswers = answers.filter(a => examMonthKey.get(a.exam) === m.key)
      const stats = buildTaskStats(tasks, filteredAnswers)
      return {
        key: m.key,
        label: m.label,
        stats,
        weak: stats.filter(t => t.rate < 0.6),
      }
    })
  }, [answers, examMonthKey, monthMeta, tasks])

  if (loading) {
    return <div className="card p-8 text-center text-gray-400 animate-pulse">Загрузка…</div>
  }

  if (!student) {
    return <div className="card p-8 text-center text-gray-500">Студент не найден</div>
  }

  // Chart data (chronological)
  // Only include exams where they actually took them or are exempt (don't chart debts)
  const chartData = results
    .filter((r) => !r.did_not_take || r.is_exempt)
    .sort((a, b) => {
      const dbA = exams.get(a.exam)?.date || ''
      const dbB = exams.get(b.exam)?.date || ''
      return dbA.localeCompare(dbB)
    })
    .map((r) => {
      const exam = exams.get(r.exam)
      return {
        date: exam ? fmtDate(exam.date) : r.exam,
        // For chart, if exempt we can show 0 or omit it entirely. Let's map it to null so the line breaks or just chart actual grades
        grade: r.is_exempt ? null : r.grade,
        correct: r.correct_count,
        label: exam?.label ?? '',
      }
    }).filter(d => d.grade !== null) // Ignore exempt from chart

  const weakTasks = taskStats.filter((t) => t.rate < 0.6).sort((a, b) => a.rate - b.rate)
  const takenCount = results.filter((r) => !r.did_not_take && !r.is_exempt).length
  const exemptCount = results.filter((r) => r.did_not_take && r.is_exempt).length
  const debtCount = results.filter((r) => r.did_not_take && !r.is_exempt).length

  const toggleExempt = async (r: StudentResult) => {
    if (!studentId) return
    try {
      if (r.id.startsWith('virtual-')) {
        // Need to create the record first to mark as exempt
        const newRecord = await pb.collection('student_results').create<StudentResult>({
          student: studentId,
          exam: r.exam,
          correct_count: 0,
          grade: 0,
          part1_score: 0,
          did_not_take: true,
          is_exempt: true
        })
        setResults(prev => prev.map(pr => pr.exam === r.exam ? newRecord : pr))
      } else {
        // Update existing
        const updated = await pb.collection('student_results').update<StudentResult>(r.id, {
          is_exempt: !r.is_exempt
        })
        setResults(prev => prev.map(pr => pr.id === r.id ? updated : pr))
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl print-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/journal" className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{student.name}</h2>
          <p className="text-sm text-gray-500">
            Сдано: <strong>{takenCount}</strong>
            {exemptCount > 0 && <span className="ml-1">· Зачтено: <strong className="text-blue-600">{exemptCount}</strong></span>}
            {' '}· Не сдано: <strong className={debtCount > 0 ? 'text-red-600' : ''}>{debtCount}</strong>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 print-hidden">
          <button
            className="btn-ghost"
            onClick={() => {
              const prev = document.title
              const stamp = format(new Date(), 'dd.MM.yyyy')
              document.title = `${student.name} ${stamp}`
              window.print()
              window.setTimeout(() => { document.title = prev }, 1000)
            }}
            title="Экспорт этой страницы в PDF"
          >
            <FileDown size={16} />
            Экспорт PDF
          </button>
          <Link
            to={`/student/${student.id}/print`}
            className="btn-ghost"
            title="Открыть детальный отчет"
          >
            Отчет (детальный)
          </Link>
        </div>
      </div>

      {/* Progress chart */}
      {chartData.length > 1 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-brand-500" />
            <h3 className="font-semibold text-gray-800">Динамика оценок</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis domain={[1, 5]} ticks={[2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <ReferenceLine y={3} stroke="#fbbf24" strokeDasharray="4 4" label={{ value: '3', fill: '#fbbf24', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(v) => [`Оценка: ${v}`, '']}
              />
              <Line
                type="monotone"
                dataKey="grade"
                stroke="#4f6ef7"
                strokeWidth={2.5}
                dot={{ r: 5, fill: '#4f6ef7', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* All results table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Все тесты</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Тест</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Дата</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Результат</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Правильных</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const exam = exams.get(r.exam)
                const isExempt = r.did_not_take && r.is_exempt
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 ${isExempt ? 'print-hidden-row' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/exam/${r.exam}`}
                        className="text-brand-600 hover:text-brand-800 font-medium"
                      >
                        {exam?.label || `Тест #${exam?.exam_id?.slice(-4)}`}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {exam ? (
                        <span className="flex items-center gap-1.5">
                          {(() => { const dow = getDow(exam.date); return dow ? <span className={`font-bold ${dow.color}`}>{dow.short}</span> : null })()}
                          <span className="text-gray-500">{fmtDate(exam.date)}</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setSelectedExamId(r.exam)} className="hover:scale-105 transition-transform" disabled={r.did_not_take && !r.is_exempt}>
                        <GradeCell grade={r.grade} correct={r.correct_count} didNotTake={r.did_not_take && !r.is_exempt} isExempt={r.is_exempt} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {r.did_not_take && !r.is_exempt ? '—' : r.is_exempt ? '—' : `${r.correct_count} / ${exam?.task_count ?? '?'}`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {r.did_not_take && (
                          <button
                            onClick={() => toggleExempt(r)}
                            className={`p-1.5 rounded-md transition-colors ${r.is_exempt ? 'text-blue-600 bg-blue-50' : 'text-gray-300 hover:text-blue-500 hover:bg-gray-50'}`}
                            title={r.is_exempt ? 'Снять отметку' : 'Назначить зачет'}
                          >
                            <Settings2 size={14} />
                          </button>
                        )}
                        {exam && (
                          <a
                            href={examUrl(exam.exam_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-brand-600 p-1.5"
                            title="открыть на решу-егэ"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Month Filter for Stats */}
      {availableMonths.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center mt-8 mb-[-8px] print-hidden">
          <span className="text-sm font-medium text-gray-500 mr-2">Период:</span>
          <button
            onClick={() => setSelectedMonth('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedMonth === 'all'
              ? 'bg-gray-800 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
          >
            Всё время
          </button>
          {availableMonths.map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${selectedMonth === m
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300'
                }`}
            >
              {m}
            </button>
          ))}
        </div>
      )}



      {/* Task heatmap */}
      {taskStats.length > 0 && (
        <div className="card p-5 task-all-card print-hidden">
          <h3 className="font-semibold text-gray-800 mb-4">Все задания</h3>
          <div className="flex flex-wrap gap-1.5">
            {taskStats.map((t) => {
              const pct = t.rate
              const bg =
                pct >= 0.8 ? 'bg-emerald-200 text-emerald-800'
                  : pct >= 0.6 ? 'bg-lime-200 text-lime-800'
                    : pct >= 0.4 ? 'bg-amber-200 text-amber-800'
                      : 'bg-red-200 text-red-800'
              return (
                <a
                  key={t.task_number}
                  href={problemUrl(t.problem_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Задание ${t.task_number}: ${t.correct}/${t.attempts} (${Math.round(pct * 100)}%)`}
                  className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg text-xs font-bold ${bg} hover:opacity-80 transition-opacity cursor-pointer`}
                >
                  <span className="text-base leading-tight">{t.task_number}</span>
                  <span className="opacity-70">{Math.round(pct * 100)}%</span>
                </a>
              )
            })}
          </div>
        </div>
      )}

            {/* Weak tasks */}
      {weakTasks.length > 0 && (
        <div className="card p-5 task-weak-card print-hidden">
          <h3 className="font-semibold text-gray-800 mb-4">
            Проблемные задания
            <span className="ml-2 text-xs font-normal text-gray-400">(&lt;60% правильных)</span>
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {weakTasks.map((t) => (
              <div
                key={t.task_number}
                className="weak-item flex flex-col items-start gap-1 px-2.5 py-2 rounded-lg border border-gray-200 bg-white"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Задание {t.task_number}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t.correct}/{t.attempts} ({Math.round(t.rate * 100)}%)
                  </p>
                </div>
                {t.failed_problem_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1 text-[10px] text-gray-500">
                    {t.failed_problem_ids.map((pid) => (
                      <a
                        key={pid}
                        href={problemUrl(pid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                      >
                        {pid}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Print-only: monthly blocks, then all-time */}
      <div className="print-only space-y-6">

        {monthlyStats.map((m, idx) => (
          <div key={m.key} className={`space-y-4 ${idx === 0 ? 'print-break-before' : ''}`}>
            <h3 className="text-lg font-semibold text-gray-800">Период: {m.label}</h3>

            <div className="card p-5 task-all-card">
              <h4 className="font-semibold text-gray-800 mb-3">Все задания</h4>
              {m.stats.length === 0 ? (
                <p className="text-sm text-gray-400">Нет данных.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {m.stats.map((t) => {
                    const pct = t.rate
                    const bg = pct >= 0.8 ? 'print-tile-green' : pct >= 0.6 ? 'print-tile-lime' : pct >= 0.4 ? 'print-tile-amber' : 'print-tile-red'
                    return (
                      <div key={t.task_number} className={`print-tile ${bg}`}>
                        <span className="print-tile-num">{t.task_number}</span>
                        <span className="print-tile-pct">{Math.round(pct * 100)}%</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="card p-5 task-weak-card">
              <h4 className="font-semibold text-gray-800 mb-3">Проблемные задания</h4>
              {m.weak.length === 0 ? (
                <p className="text-sm text-gray-400">Нет проблемных заданий.</p>
              ) : (
                <div className="print-weak-grid">
                  {m.weak.map((t) => (
                    <div key={t.task_number} className="print-weak-item">
                      <p className="print-weak-title">Задание {t.task_number}</p>
                      <p className="print-weak-score">{t.correct}/{t.attempts} ({Math.round(t.rate * 100)}%)</p>
                      {t.failed_problem_ids.length > 0 && (
                        <div className="print-weak-ids">
                          {t.failed_problem_ids.map((pid) => (
                            <a key={pid} href={problemUrl(pid)} target="_blank" rel="noopener noreferrer" className="print-weak-id">{pid}</a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Период: Всё время</h3>
          {taskStatsAll.length > 0 && (
            <div className="card p-5 task-all-card">
              <h4 className="font-semibold text-gray-800 mb-3">Все задания</h4>
              <div className="flex flex-wrap gap-1.5">
                {taskStatsAll.map((t) => {
                  const pct = t.rate
                  const bg = pct >= 0.8 ? 'print-tile-green' : pct >= 0.6 ? 'print-tile-lime' : pct >= 0.4 ? 'print-tile-amber' : 'print-tile-red'
                  return (
                    <div key={t.task_number} className={`print-tile ${bg}`}>
                      <span className="print-tile-num">{t.task_number}</span>
                      <span className="print-tile-pct">{Math.round(pct * 100)}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {taskStatsAll.filter(t => t.rate < 0.6).length > 0 && (
            <div className="card p-5 task-weak-card">
              <h4 className="font-semibold text-gray-800 mb-3">Проблемные задания</h4>
              <div className="print-weak-grid">
                {taskStatsAll.filter(t => t.rate < 0.6).map((t) => (
                  <div key={t.task_number} className="print-weak-item">
                    <p className="print-weak-title">Задание {t.task_number}</p>
                    <p className="print-weak-score">{t.correct}/{t.attempts} ({Math.round(t.rate * 100)}%)</p>
                    {t.failed_problem_ids.length > 0 && (
                      <div className="print-weak-ids">
                        {t.failed_problem_ids.map((pid) => (
                          <a key={pid} href={problemUrl(pid)} target="_blank" rel="noopener noreferrer" className="print-weak-id">{pid}</a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedExamId && (
        <StudentExamModal
          isOpen={!!selectedExamId}
          onClose={() => setSelectedExamId(null)}
          studentId={studentId!}
          examId={selectedExamId}
        />
      )}
    </div>
  )
}
