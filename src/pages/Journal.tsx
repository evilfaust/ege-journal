import { useState, useEffect, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { pb, type Group, type Student, type Exam, type StudentResult, examUrl, filterIn } from '../lib/pb'
import GradeCell, { gradeClass } from '../components/GradeCell'
import StudentExamModal from '../components/StudentExamModal'
import { ExternalLink, ChevronDown, Users } from 'lucide-react'
import { format, parse } from 'date-fns'
import { ru } from 'date-fns/locale'

function fmtDate(d: string) {
  try {
    const parsed = d.includes('-')
      ? parse(d, 'yyyy-MM-dd', new Date())
      : parse(d, 'dd.MM.yyyy', new Date())
    return format(parsed, 'd MMM', { locale: ru })
  } catch {
    return d
  }
}

function fmtMonth(d: string) {
  try {
    const parsed = d.includes('-')
      ? parse(d, 'yyyy-MM-dd', new Date())
      : parse(d, 'dd.MM.yyyy', new Date())
    return format(parsed, 'MMMM yyyy', { locale: ru })
  } catch {
    return d
  }
}

function getMonthKey(d: string) {
  try {
    const parsed = d.includes('-')
      ? parse(d, 'yyyy-MM-dd', new Date())
      : parse(d, 'dd.MM.yyyy', new Date())
    return format(parsed, 'yyyy-MM', { locale: ru })
  } catch {
    return d
  }
}

export default function Journal() {
  const { groupId } = useParams()
  const navigate = useNavigate()

  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroup, setActiveGroup] = useState<Group | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [results, setResults] = useState<Map<string, StudentResult>>(new Map())
  const [selectedCell, setSelectedCell] = useState<{ studentId: string; examId: string } | null>(null)
  const [loading, setLoading] = useState(true)

  // Group exams by month
  const examsByMonth = useMemo(() => {
    const groups: Record<string, Exam[]> = {}
    const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date))
    for (const exam of sorted) {
      const key = getMonthKey(exam.date)
      if (!groups[key]) groups[key] = []
      groups[key].push(exam)
    }
    return groups
  }, [exams])

  const availableMonths = useMemo(() => {
    return Object.keys(examsByMonth).sort((a, b) => a.localeCompare(b))
  }, [examsByMonth])

  const [selectedMonth, setSelectedMonth] = useState<string>('')

  // Set default month to most recent
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0]!)
    }
  }, [availableMonths, selectedMonth])

  const visibleExams = useMemo(() => {
    if (!selectedMonth) return exams
    return examsByMonth[selectedMonth] || []
  }, [selectedMonth, examsByMonth, exams])

  // Load all groups
  useEffect(() => {
    pb.collection('groups')
      .getFullList<Group>({ sort: 'name' })
      .then((gs) => {
        setGroups(gs)
        if (!groupId && gs.length > 0) {
          navigate(`/journal/${gs[0]!.id}`, { replace: true })
        }
      })
      .catch(console.error)
  }, [groupId, navigate])

  // Load active group data
  useEffect(() => {
    if (!groupId) return
    setLoading(true)

    const group = groups.find((g) => g.id === groupId) ?? null
    setActiveGroup(group)

    Promise.all([
      pb.collection('students').getFullList<Student>({
        filter: `group="${groupId}"`,
        sort: 'name',
      }),
      pb.collection('exams').getFullList<Exam>({
        filter: `group="${groupId}"`,
        sort: 'date',
      }),
    ])
      .then(async ([stds, exs]) => {
        setStudents(stds)
        setExams(exs)

        if (stds.length === 0 || exs.length === 0) {
          setLoading(false)
          return
        }

        // Load all results for this group
        const studentIds = stds.map((s) => s.id)
        const examIds = exs.map((e) => e.id)
        const allResults = await pb
          .collection('student_results')
          .getFullList<StudentResult>({
            filter: `${filterIn('student', studentIds)} && ${filterIn('exam', examIds)}`,
          })

        const map = new Map<string, StudentResult>()
        for (const r of allResults) {
          map.set(`${r.student}__${r.exam}`, r)
        }
        setResults(map)
        setLoading(false)
      })
      .catch((e) => {
        console.error(e)
        setLoading(false)
      })
  }, [groupId, groups])

  const getResult = (studentId: string, examId: string) =>
    results.get(`${studentId}__${examId}`)

  if (loading && groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-400">
        <Users size={40} className="mb-3 opacity-30" />
        <p className="text-lg font-medium">Нет данных</p>
        <p className="text-sm mt-1">
          <Link to="/upload" className="text-brand-600 hover:underline">
            Загрузите результаты тестов
          </Link>{' '}
          чтобы начать
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Group tabs */}
      {groups.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {groups.map((g) => (
            <Link
              key={g.id}
              to={`/journal/${g.id}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${g.id === groupId
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600'
                }`}
            >
              {g.name}
            </Link>
          ))}
        </div>
      )}

      {/* Leaderboard & Debtors */}
      {!loading && exams.length > 0 && students.length > 0 && (
        (() => {
          // Find students with 0 debts for visible exams
          const honorStudents = students.filter(student => {
            const studentResults = visibleExams.map(e => getResult(student.id, e.id));
            const hasTaken = studentResults.some(r => r && !r.did_not_take);
            if (!hasTaken) return false;
            const hasDebt = studentResults.some(r => r && r.did_not_take && !r.is_exempt);
            return !hasDebt;
          })

          // Find debtors for visible exams
          const debtorMap = new Map<string, { student: Student; count: number }>()
          for (const student of students) {
            const studentResults = visibleExams.map(e => getResult(student.id, e.id))
            const debts = studentResults.filter(r => r && r.did_not_take && !r.is_exempt)
            if (debts.length > 0) {
              debtorMap.set(student.id, { student, count: debts.length })
            }
          }
          const debtors = Array.from(debtorMap.values()).sort((a, b) => b.count - a.count)

          if (honorStudents.length === 0 && debtors.length === 0) return null;

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Honor Board */}
              {honorStudents.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <span className="text-6xl">🏆</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🏆</span>
                    <h3 className="font-bold text-amber-900">Доска почета</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {honorStudents.map(s => (
                      <Link
                        key={s.id}
                        to={`/student/${s.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 shadow-sm rounded-lg text-sm font-semibold text-amber-900 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                      >
                        {s.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Debtors */}
              {debtors.length > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <span className="text-6xl">⚠️</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">⚠️</span>
                    <h3 className="font-bold text-red-900">Должники</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {debtors.map(({ student, count }) => (
                      <Link
                        key={student.id}
                        to={`/student/${student.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 shadow-sm rounded-lg text-sm font-semibold text-red-900 hover:bg-red-50 hover:border-red-300 transition-colors"
                      >
                        {student.name}
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{count}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()
      )}

      {/* Legend & Month filter */}
      <div className="flex gap-3 flex-wrap text-xs items-center">
        {[
          { cls: 'grade-5', label: 'Отлично' },
          { cls: 'grade-4', label: 'Хорошо' },
          { cls: 'grade-3', label: 'Удовл.' },
          { cls: 'grade-2', label: 'Неуд.' },
          { cls: 'grade-absent', label: 'Не сдал' },
        ].map(({ cls, label }) => (
          <span key={cls} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cls}`}>
            {label}
          </span>
        ))}
        {availableMonths.length > 1 && (
          <div className="ml-auto flex gap-1 flex-wrap">
            {availableMonths.map((month) => (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedMonth === month
                    ? 'bg-brand-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300'
                }`}
              >
                {fmtMonth(examsByMonth[month]?.[0]?.date || month)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Journal table */}
      {loading ? (
        <div className="card p-8 text-center text-gray-400 text-sm animate-pulse">Загрузка…</div>
      ) : students.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <p>Нет студентов в этой группе</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 sticky left-0 z-10 bg-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[180px]">
                    Студент
                  </th>
                  {visibleExams.map((exam) => (
                    <th
                      key={exam.id}
                      className="text-center px-3 py-3 font-medium text-gray-600 min-w-[90px]"
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <Link
                          to={`/exam/${exam.id}`}
                          className="text-xs font-semibold hover:text-brand-600 transition-colors"
                          title="Статистика по тесту"
                        >
                          {fmtDate(exam.date)}
                        </Link>
                        <a
                          href={examUrl(exam.exam_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-gray-400 hover:text-brand-500 flex items-center gap-0.5"
                          title={exam.title}
                        >
                          #{exam.exam_id.slice(-4)}
                          <ExternalLink size={8} />
                        </a>
                      </div>
                    </th>
                  ))}
                  <th className="text-center px-3 py-3 font-medium text-gray-500 min-w-[70px]">
                    <ChevronDown size={14} className="mx-auto" />
                    Ср.
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => {
                  const studentResults = visibleExams.map((e) => getResult(student.id, e.id))
                  const taken = studentResults.filter((r) => r && !r.did_not_take)
                  const avgGrade =
                    taken.length > 0
                      ? taken.reduce((s, r) => s + (r?.grade ?? 0), 0) / taken.length
                      : null

                  return (
                    <tr
                      key={student.id}
                      className={`border-b border-gray-100 hover:bg-gray-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
                        }`}
                    >
                      <td className="px-4 py-2.5 sticky left-0 z-10 bg-inherit shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <Link
                          to={`/student/${student.id}`}
                          className="font-medium text-gray-800 hover:text-brand-600 transition-colors"
                        >
                          {student.name}
                        </Link>
                      </td>

                      {visibleExams.map((exam) => {
                        const r = getResult(student.id, exam.id)
                        return (
                          <td key={exam.id} className="px-3 py-2.5 text-center">
                            {r ? (
                              <button onClick={() => setSelectedCell({ studentId: student.id, examId: exam.id })} className="hover:scale-105 transition-transform" disabled={r.did_not_take && !r.is_exempt}>
                                <GradeCell
                                  grade={r.grade}
                                  correct={r.correct_count}
                                  didNotTake={r.did_not_take && !r.is_exempt}
                                  isExempt={r.is_exempt}
                                  compact
                                />
                              </button>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        )
                      })}

                      <td className="px-3 py-2.5 text-center">
                        {avgGrade != null ? (
                          <span
                            className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-bold ${gradeClass(Math.round(avgGrade))}`}
                          >
                            {avgGrade.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary row */}
      {!loading && visibleExams.length > 0 && (
        <div className="flex gap-4 flex-wrap text-xs text-gray-500">
          <span>
            <strong className="text-gray-700">{students.length}</strong> студентов
          </span>
          <span>
            <strong className="text-gray-700">{visibleExams.length}</strong> тестов (из {exams.length})
          </span>
          {activeGroup && (
            <span className="text-gray-400">
              Группа: <strong className="text-gray-600">{activeGroup.name}</strong>
            </span>
          )}
        </div>
      )}

      {selectedCell && (
        <StudentExamModal
          isOpen={!!selectedCell}
          onClose={() => setSelectedCell(null)}
          studentId={selectedCell.studentId}
          examId={selectedCell.examId}
        />
      )}
    </div>
  )
}
