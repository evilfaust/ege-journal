/**
 * Imports parsed Excel data into PocketBase collections.
 * Handles deduplication: existing groups/students/exams are reused.
 */

import { pb, type Exam, type Group, type Student, type StudentResult } from './pb'
import type { ParsedSheet, ParsedExam, ParsedStudent } from './excel-parser'

export interface ImportProgress {
  stage: string
  current: number
  total: number
}

type ProgressCallback = (p: ImportProgress) => void

export interface ImportPreviewSheet {
  groupName: string
  students: {
    create: number
    reuse: number
  }
  exams: {
    create: number
    update: number
    reuse: number
  }
  results: {
    create: number
    update: number
    skip: number
  }
}

export interface ImportPreview {
  sheets: ImportPreviewSheet[]
  totals: {
    groupsToCreate: number
    studentsToCreate: number
    examsToCreate: number
    examsToUpdate: number
    resultsToCreate: number
    resultsToUpdate: number
    skippedDuplicates: number
  }
}

type PreviewResultState = {
  did_not_take: boolean
}

type PreviewExamState = {
  title: string
  date: string
  label: string
  taskCount: number
}

export async function previewSheetsImport(sheets: ParsedSheet[]): Promise<ImportPreview> {
  const [groups, students, exams, results] = await Promise.all([
    pb.collection('groups').getFullList<Group>({ sort: 'name' }),
    pb.collection('students').getFullList<Student>(),
    pb.collection('exams').getFullList<Exam>(),
    pb.collection('student_results').getFullList<StudentResult>(),
  ])

  const groupNameById = new Map(groups.map((group) => [group.id, group.name]))

  const knownGroups = new Set(groups.map((group) => group.name))
  const knownStudents = new Set(
    students.map((student) => `${groupNameById.get(student.group) ?? student.group}__${student.name.trim()}`),
  )
  const knownExams = new Map<string, PreviewExamState>(
    exams.map((exam) => [
      `${groupNameById.get(exam.group) ?? exam.group}__${exam.exam_id}`,
      {
        title: exam.title,
        date: exam.date,
        label: exam.label,
        taskCount: exam.task_count,
      },
    ]),
  )

  const studentGroupById = new Map(students.map((student) => [student.id, student.group]))
  const examById = new Map(exams.map((exam) => [exam.id, exam]))
  const knownResults = new Map<string, PreviewResultState>()
  for (const result of results) {
    const groupName = groupNameById.get(studentGroupById.get(result.student) ?? '')
    const exam = examById.get(result.exam)
    if (!groupName || !exam) continue

    const student = students.find((item) => item.id === result.student)
    if (!student) continue

    const resultKey = `${groupName}__${student.name.trim()}__${exam.exam_id}`
    knownResults.set(resultKey, { did_not_take: result.did_not_take })
  }

  const previewSheets: ImportPreviewSheet[] = []
  const totals = {
    groupsToCreate: 0,
    studentsToCreate: 0,
    examsToCreate: 0,
    examsToUpdate: 0,
    resultsToCreate: 0,
    resultsToUpdate: 0,
    skippedDuplicates: 0,
  }

  for (const sheet of sheets) {
    const previewSheet: ImportPreviewSheet = {
      groupName: sheet.groupName,
      students: { create: 0, reuse: 0 },
      exams: { create: 0, update: 0, reuse: 0 },
      results: { create: 0, update: 0, skip: 0 },
    }

    if (!knownGroups.has(sheet.groupName)) {
      knownGroups.add(sheet.groupName)
      totals.groupsToCreate += 1
    }

    for (const exam of sheet.exams) {
      const examKey = `${sheet.groupName}__${exam.exam_id}`
      const existingExam = knownExams.get(examKey)

      if (!existingExam) {
        knownExams.set(examKey, {
          title: exam.title,
          date: exam.date,
          label: exam.label,
          taskCount: exam.taskCount,
        })
        previewSheet.exams.create += 1
        totals.examsToCreate += 1
      } else if (
        existingExam.title !== exam.title ||
        existingExam.date !== exam.date ||
        existingExam.label !== exam.label ||
        existingExam.taskCount !== exam.taskCount
      ) {
        knownExams.set(examKey, {
          title: exam.title,
          date: exam.date,
          label: exam.label,
          taskCount: exam.taskCount,
        })
        previewSheet.exams.update += 1
        totals.examsToUpdate += 1
      } else {
        previewSheet.exams.reuse += 1
      }
    }

    for (const student of sheet.students) {
      const studentKey = `${sheet.groupName}__${student.name.trim()}`
      if (!knownStudents.has(studentKey)) {
        knownStudents.add(studentKey)
        previewSheet.students.create += 1
        totals.studentsToCreate += 1
      } else {
        previewSheet.students.reuse += 1
      }

      for (const result of student.results) {
        const resultKey = `${studentKey}__${result.exam_id}`
        const existingResult = knownResults.get(resultKey)

        if (!existingResult) {
          knownResults.set(resultKey, { did_not_take: result.did_not_take })
          previewSheet.results.create += 1
          totals.resultsToCreate += 1
        } else if (existingResult.did_not_take && !result.did_not_take) {
          knownResults.set(resultKey, { did_not_take: false })
          previewSheet.results.update += 1
          totals.resultsToUpdate += 1
        } else {
          previewSheet.results.skip += 1
          totals.skippedDuplicates += 1
        }
      }
    }

    previewSheets.push(previewSheet)
  }

  return { sheets: previewSheets, totals }
}

export async function importSheets(
  sheets: ParsedSheet[],
  onProgress?: ProgressCallback,
) {
  for (const sheet of sheets) {
    await importSheet(sheet, onProgress)
  }
}

async function importSheet(sheet: ParsedSheet, onProgress?: ProgressCallback) {
  const report = (stage: string, current: number, total: number) =>
    onProgress?.({ stage, current, total })

  // ── 1. Upsert group ───────────────────────────────────────
  report('Группа: ' + sheet.groupName, 0, 1)
  const group = await upsertGroup(sheet.groupName)

  // ── 2. Upsert exams ───────────────────────────────────────
  report('Импорт тестов…', 0, sheet.exams.length)
  const examIdMap: Record<string, string> = {} // решу-ЕГЭ id → pb record id

  for (let i = 0; i < sheet.exams.length; i++) {
    const e = sheet.exams[i]
    if (!e) continue
    report('Тест ' + e.date, i, sheet.exams.length)
    const pbExam = await upsertExam(e, group.id)
    examIdMap[e.exam_id] = pbExam.id

    // upsert tasks
    await upsertTasks(e, pbExam.id)
  }

  // ── 3. Upsert students + results ──────────────────────────
  report('Импорт студентов…', 0, sheet.students.length)

  for (let i = 0; i < sheet.students.length; i++) {
    const s = sheet.students[i]
    if (!s) continue
    report('Студент: ' + s.name, i, sheet.students.length)
    const student = await upsertStudent(s.name, group.id)
    await upsertResults(s, student.id, examIdMap)
  }

  report('Готово!', 1, 1)
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

async function upsertGroup(name: string) {
  try {
    const list = await pb.collection('groups').getList(1, 1, {
      filter: `name="${name.replace(/"/g, '\\"')}"`,
    })
    if (list.items.length > 0) return list.items[0]!
  } catch { /* not found */ }
  return pb.collection('groups').create({ name })
}

async function upsertExam(e: ParsedExam, groupId: string) {
  try {
    const list = await pb.collection('exams').getList(1, 1, {
      filter: `exam_id="${e.exam_id}" && group="${groupId}"`,
    })
    if (list.items.length > 0) {
      const existing = list.items[0]!
      if (
        existing.date !== e.date ||
        existing.label !== e.label ||
        existing.title !== e.title ||
        existing.task_count !== e.taskCount
      ) {
        return pb.collection('exams').update(existing.id, {
          title: e.title,
          date: e.date,
          label: e.label,
          task_count: e.taskCount,
        })
      }
      return existing
    }
  } catch { /* not found */ }

  return pb.collection('exams').create({
    exam_id: e.exam_id,
    title: e.title,
    date: e.date,
    label: e.label,
    group: groupId,
    task_count: e.taskCount,
  })
}

async function upsertTasks(e: ParsedExam, examPbId: string) {
  // Check if tasks already imported
  try {
    const existing = await pb.collection('exam_tasks').getList(1, 1, {
      filter: `exam="${examPbId}"`,
    })
    if (existing.items.length > 0) return // already imported
  } catch { /* ok */ }

  const BATCH = 25
  for (let start = 0; start < e.tasks.length; start += BATCH) {
    await Promise.all(
      e.tasks.slice(start, start + BATCH).map((t) =>
        pb.collection('exam_tasks').create({
          exam: examPbId,
          task_number: t.task_number,
          problem_id: t.problem_id,
        }),
      ),
    )
  }
}

async function upsertStudent(name: string, groupId: string) {
  // normalize trailing spaces
  const cleanName = name.trim()
  try {
    const list = await pb.collection('students').getList(1, 1, {
      filter: `name="${cleanName.replace(/"/g, '\\"')}" && group="${groupId}"`,
    })
    if (list.items.length > 0) return list.items[0]!
  } catch { /* not found */ }
  return pb.collection('students').create({ name: cleanName, group: groupId })
}

async function upsertResults(
  s: ParsedStudent,
  studentPbId: string,
  examIdMap: Record<string, string>,
) {
  for (const r of s.results) {
    const examPbId = examIdMap[r.exam_id]
    if (!examPbId) continue

    let existingResultId: string | null = null

    // Check if result already exists
    try {
      const existing = await pb.collection('student_results').getList(1, 1, {
        filter: `student="${studentPbId}" && exam="${examPbId}"`,
      })
      if (existing.items.length > 0) {
        const item = existing.items[0]!
        // If it was previously marked as "did not take" but now the student took it, we should update it
        if (item.did_not_take && !r.did_not_take) {
          existingResultId = item.id
        } else {
          continue // skip duplicate or unchanged
        }
      }
    } catch { /* ok */ }

    if (existingResultId) {
      // Update existing result that was previously "did not take"
      await pb.collection('student_results').update(existingResultId, {
        correct_count: r.correct_count ?? 0,
        grade: r.grade ?? 0,
        part1_score: r.part1_score ?? 0,
        did_not_take: false,
      })
    } else {
      // Create new
      await pb.collection('student_results').create({
        student: studentPbId,
        exam: examPbId,
        correct_count: r.correct_count ?? 0,
        grade: r.grade ?? 0,
        part1_score: r.part1_score ?? 0,
        did_not_take: r.did_not_take,
      })
    }

    // Answers in batches
    if (!r.did_not_take && r.answers.length > 0) {
      const BATCH = 25
      for (let start = 0; start < r.answers.length; start += BATCH) {
        await Promise.all(
          r.answers.slice(start, start + BATCH).map((isCorrect, offset) =>
            pb.collection('student_answers').create({
              student: studentPbId,
              exam: examPbId,
              task_number: start + offset + 1,
              is_correct: isCorrect,
            }),
          ),
        )
      }
    }
  }
}
