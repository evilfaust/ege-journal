import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from 'recharts'
import { pb, type Group, type Student, type Exam, type StudentResult, type StudentAnswer, problemUrl, examUrl, filterIn } from '../lib/pb'
import { AlertTriangle, TrendingDown, Users, Copy, Check, X } from 'lucide-react'

interface DebtItem {
  student: Student
  exam: Exam
}

interface WeakTask {
  task_number: number
  problem_id: string
  correct: number
  total: number
  rate: number
}

interface GroupStat {
  group: Group
  examCount: number
  studentCount: number
  avgGrade: number
  passRate: number
}

function fmtDate(d: string) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface DebtModalState {
  student: Student
  exams: Exam[]
}

export default function StatsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialGroup = searchParams.get('group') || 'all'

  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>(initialGroup)
  const [debts, setDebts] = useState<DebtItem[]>([])
  const [debtModal, setDebtModal] = useState<DebtModalState | null>(null)
  const [copied, setCopied] = useState(false)

  // Tasks/Answers state
  const [tasks, setTasks] = useState<{ id: string; exam: string; task_number: number; problem_id: string }[]>([])
  const [answers, setAnswers] = useState<StudentAnswer[]>([])
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [exams, setExams] = useState<Exam[]>([])

  const [groupStats, setGroupStats] = useState<GroupStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    pb.collection('groups').getFullList<Group>({ sort: 'name' }).then(setGroups).catch(console.error)
  }, [])

  // Sync selectedGroup from URL when it changes externally
  useEffect(() => {
    const urlGroup = searchParams.get('group')
    if (urlGroup && urlGroup !== selectedGroup) {
      setSelectedGroup(urlGroup)
    }
  }, [searchParams])

  useEffect(() => {
    load()
  }, [selectedGroup])

  async function load() {
    setLoading(true)
    try {
      const groupFilter = selectedGroup !== 'all' ? `group="${selectedGroup}"` : ''

      const [students, exams] = await Promise.all([
        pb.collection('students').getFullList<Student>({
          filter: groupFilter,
          sort: 'name',
          expand: 'group',
        }),
        pb.collection('exams').getFullList<Exam>({
          filter: groupFilter,
          sort: '-date',
          expand: 'group',
        }),
      ])

      if (students.length === 0 || exams.length === 0) {
        setDebts([])
        setTasks([])
        setAnswers([])
        setLoading(false)
        return
      }

      const studentIds = students.map((s) => s.id)
      const examIds = exams.map((e) => e.id)

      const [results, answers, tasks] = await Promise.all([
        pb.collection('student_results').getFullList<StudentResult>({
          filter: `${filterIn('student', studentIds)} && ${filterIn('exam', examIds)}`,
        }),
        pb.collection('student_answers').getFullList<StudentAnswer>({
          filter: `${filterIn('student', studentIds)} && ${filterIn('exam', examIds)}`,
        }),
        pb.collection('exam_tasks').getFullList<{ id: string; exam: string; task_number: number; problem_id: string }>({
          filter: filterIn('exam', examIds),
        }),
      ])

      // ── Debts ────────────────────────────────────────────
      const resultMap = new Map<string, StudentResult>()
      for (const r of results) resultMap.set(`${r.student}__${r.exam}`, r)

      const debtList: DebtItem[] = []
      for (const student of students) {
        for (const exam of exams.filter((e) => e.group === student.group)) {
          const r = resultMap.get(`${student.id}__${exam.id}`)
          // Debt is when they didn't take it AND it hasn't been manually exempted
          if ((!r || r.did_not_take) && !r?.is_exempt) {
            debtList.push({ student, exam })
          }
        }
      }
      setDebts(debtList)

      // Save to state for memoized filtering
      setTasks(tasks)
      setAnswers(answers)
      setExams(exams)

      // Extract months correctly (Chronological from exams mapping)
      const months = new Set<string>()
      // We process exams in order to extract months chronologically backwards (because sort: '-date')
      // Let's sort ascending for the UI
      const sortedExams = [...exams].sort((a, b) => a.date.localeCompare(b.date))
      sortedExams.forEach(e => {
        const dateStr = fmtDate(e.date)
        const parts = dateStr.split(' ')
        if (parts.length >= 3) {
          months.add(`${parts[1]} ${parts[2]}`)
        } else if (parts.length === 2) {
          months.add(`${parts[0]} ${parts[1]}`)
        }
      })
      setAvailableMonths(Array.from(months))

      // ── Group stats ────────────────────────────────────────
      const gs: GroupStat[] = []
      const allGroups = selectedGroup === 'all' ? groups : groups.filter((g) => g.id === selectedGroup)
      for (const group of allGroups) {
        const groupStudents = students.filter((s) => s.group === group.id)
        const groupExams = exams.filter((e) => e.group === group.id)
        const groupResults = results.filter(
          (r) =>
            groupStudents.some((s) => s.id === r.student) &&
            groupExams.some((e) => e.id === r.exam) &&
            !r.did_not_take,
        )
        const avgGrade =
          groupResults.length > 0
            ? groupResults.reduce((s, r) => s + r.grade, 0) / groupResults.length
            : 0
        const passRate =
          groupResults.length > 0
            ? groupResults.filter((r) => r.grade >= 3).length / groupResults.length
            : 0

        gs.push({
          group,
          examCount: groupExams.length,
          studentCount: groupStudents.length,
          avgGrade,
          passRate,
        })
      }
      setGroupStats(gs)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Dedup debts by student for summary
  const debtsByStudent = new Map<string, { student: Student; count: number }>()
  for (const d of debts) {
    const cur = debtsByStudent.get(d.student.id) ?? { student: d.student, count: 0 }
    debtsByStudent.set(d.student.id, { ...cur, count: cur.count + 1 })
  }
  const sortedDebtors = [...debtsByStudent.values()].sort((a, b) => b.count - a.count)

  const weakTasks = useMemo(() => {
    const filteredAnswers = selectedMonth === 'all' ? answers : answers.filter(a => {
      const e = exams.find(ex => ex.id === a.exam)
      if (!e) return false
      const dateStr = fmtDate(e.date)
      const parts = dateStr.split(' ')
      const monthYear = parts.length >= 3 ? `${parts[1]} ${parts[2]}` : parts.length === 2 ? `${parts[0]} ${parts[1]}` : dateStr
      return monthYear === selectedMonth
    })

    const taskMap = new Map<number, { correct: number; total: number; problem_id: string }>()
    for (const t of tasks) {
      const taskAnswers = filteredAnswers.filter(
        (a) => a.task_number === t.task_number && a.exam === t.exam,
      )
      if (taskAnswers.length === 0) continue
      const cur = taskMap.get(t.task_number) ?? { correct: 0, total: 0, problem_id: t.problem_id }
      taskMap.set(t.task_number, {
        correct: cur.correct + taskAnswers.filter((a) => a.is_correct).length,
        total: cur.total + taskAnswers.length,
        problem_id: t.problem_id,
      })
    }

    return [...taskMap.entries()]
      .map(([n, s]) => ({ task_number: n, ...s, rate: s.total > 0 ? s.correct / s.total : 0 }))
      .sort((a, b) => a.rate - b.rate)
  }, [tasks, answers, selectedMonth, exams])

  const top10Weak = weakTasks.slice(0, 10)

  function openDebtModal(student: Student) {
    const studentExams = debts.filter((d) => d.student.id === student.id).map((d) => d.exam)
    setDebtModal({ student, exams: studentExams })
    setCopied(false)
  }

  function copyDebtList() {
    if (!debtModal) return
    const lines = debtModal.exams.map((e) => {
      const dateStr = fmtDate(e.date)
      return `${e.label || dateStr} — ${examUrl(e.exam_id)}`
    })
    const text = `Долги ${debtModal.student.name}:\n${lines.join('\n')}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-6">
      {/* Group filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => {
            setSelectedGroup('all')
            setSearchParams({})
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedGroup === 'all'
            ? 'bg-brand-600 text-white'
            : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300'
            }`}
        >
          Все группы
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => {
              setSelectedGroup(g.id)
              setSearchParams({ group: g.id })
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedGroup === g.id
              ? 'bg-brand-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300'
              }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-400 animate-pulse">Загрузка…</div>
      ) : (
        <>
          {/* Group summary cards */}
          {groupStats.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupStats.map(({ group, examCount, studentCount, avgGrade, passRate }) => (
                <div key={group.id} className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">{group.name}</h3>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Users size={12} /> {studentCount}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Тестов проведено</span>
                      <strong>{examCount}</strong>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Средняя оценка</span>
                      <strong className={avgGrade >= 4 ? 'text-emerald-600' : avgGrade >= 3 ? 'text-amber-600' : 'text-red-600'}>
                        {avgGrade.toFixed(2)}
                      </strong>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Успеваемость</span>
                      <strong>{Math.round(passRate * 100)}%</strong>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${passRate * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Debts */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <h3 className="font-semibold text-gray-800">Должники</h3>
                <span className="ml-auto text-xs text-gray-400">{sortedDebtors.length} студентов</span>
              </div>
              {sortedDebtors.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Долгов нет</div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                  {sortedDebtors.map(({ student, count }) => (
                    <div key={student.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                      <Link
                        to={`/student/${student.id}`}
                        className="text-sm font-medium text-gray-800 hover:text-brand-600"
                      >
                        {student.name}
                      </Link>
                      <button
                        onClick={() => openDebtModal(student)}
                        className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-medium hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        {count} тест{count === 1 ? '' : count < 5 ? 'а' : 'ов'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weak tasks */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <TrendingDown size={16} className="text-red-500" />
                <h3 className="font-semibold text-gray-800">Сложные задания</h3>
                <span className="ml-auto text-xs text-gray-400">топ-10 по ошибкам</span>
              </div>
              {top10Weak.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Данных нет</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={top10Weak}
                    layout="vertical"
                    margin={{ top: 10, right: 20, bottom: 10, left: 60 }}
                    barSize={16}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `${Math.round(v * 100)}%`}
                      tick={{ fontSize: 10 }}
                      domain={[0, 1]}
                    />
                    <YAxis
                      type="category"
                      dataKey="task_number"
                      tickFormatter={(v) => `Зад. ${v}`}
                      tick={{ fontSize: 11 }}
                      width={55}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v: number) => [`${Math.round(v * 100)}%`, 'Верно']}
                      labelFormatter={(v) => `Задание ${v}`}
                    />
                    <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                      {top10Weak.map((t) => (
                        <Cell
                          key={t.task_number}
                          fill={t.rate >= 0.6 ? '#bef264' : t.rate >= 0.4 ? '#fde68a' : '#fca5a5'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Problem links for hardest tasks */}
          {weakTasks.filter((t) => t.rate < 0.5).length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-3">
                Ссылки на задания с &lt;50% верных ответов
              </h3>
              <div className="flex flex-wrap gap-2">
                {weakTasks
                  .filter((t) => t.rate < 0.5)
                  .map((t) => (
                    <a
                      key={t.task_number}
                      href={problemUrl(t.problem_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <span className="font-bold">Задание {t.task_number}</span>
                      <span className="text-red-400 text-xs">{Math.round(t.rate * 100)}%</span>
                    </a>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Debt modal */}
      {debtModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setDebtModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">{debtModal.student.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {debtModal.exams.length} незданных тест{debtModal.exams.length === 1 ? '' : debtModal.exams.length < 5 ? 'а' : 'ов'}
                </p>
              </div>
              <button
                onClick={() => setDebtModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-3 max-h-72 overflow-y-auto divide-y divide-gray-50">
              {debtModal.exams.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between py-2.5 gap-3">
                  <span className="text-sm text-gray-700 truncate">{exam.label || fmtDate(exam.date)}</span>
                  <a
                    href={examUrl(exam.exam_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-600 hover:underline whitespace-nowrap"
                  >
                    Открыть →
                  </a>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={copyDebtList}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
              >
                {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                {copied ? 'Скопировано!' : 'Скопировать список со ссылками'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
