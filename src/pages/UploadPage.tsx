import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Play,
  RefreshCcw,
} from 'lucide-react'
import { parseJournalWorkbook, type ParsedSheet } from '../lib/excel-parser'
import {
  importSheets,
  previewSheetsImport,
  type ImportPreview,
  type ImportProgress,
} from '../lib/import-service'

type FileStatus = 'idle' | 'parsing' | 'ready' | 'importing' | 'done' | 'error'

interface FileState {
  file: File
  status: FileStatus
  error?: string
  sheets?: ParsedSheet[]
  preview?: ImportPreview
  progress?: ImportProgress
}

export default function UploadPage() {
  const [files, setFiles] = useState<FileState[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const updateFile = useCallback((file: File, patch: Partial<FileState>) => {
    setFiles((prev) =>
      prev.map((item) => (item.file === file ? { ...item, ...patch } : item)),
    )
  }, [])

  const processFile = useCallback(async (file: File) => {
    setFiles((prev) => {
      const next = prev.filter((item) => item.file !== file)
      return [...next, { file, status: 'parsing' }]
    })

    try {
      const buffer = await file.arrayBuffer()
      const sheets = parseJournalWorkbook(buffer)

      if (sheets.length === 0) {
        updateFile(file, {
          status: 'error',
          error: 'Не найдено данных. Проверьте формат файла.',
        })
        return
      }

      const preview = await previewSheetsImport(sheets)
      updateFile(file, { status: 'ready', sheets, preview, error: undefined })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      updateFile(file, { status: 'error', error: msg })
    }
  }, [updateFile])

  const startImport = useCallback(async (file: File) => {
    const current = files.find((item) => item.file === file)
    if (!current?.sheets) return

    try {
      updateFile(file, {
        status: 'importing',
        progress: { stage: 'Подготовка импорта…', current: 0, total: 1 },
      })

      await importSheets(current.sheets, (progress) => updateFile(file, { progress }))

      updateFile(file, { status: 'done', error: undefined })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      updateFile(file, { status: 'error', error: msg })
    }
  }, [files, updateFile])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const dropped = Array.from(e.dataTransfer.files).filter(
        (f) => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'),
      )
      dropped.forEach((file) => void processFile(file))
    },
    [processFile],
  )

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      Array.from(e.target.files ?? []).forEach((file) => void processFile(file))
      e.target.value = ''
    },
    [processFile],
  )

  const remove = (file: File) =>
    setFiles((prev) => prev.filter((item) => item.file !== file))

  const readyFiles = files.filter((file) => file.status === 'ready')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          rounded-[28px] border-2 border-dashed p-12 text-center transition-all cursor-pointer
          ${dragging
            ? 'border-brand-500 bg-brand-50'
            : 'border-slate-300 bg-white/85 hover:border-brand-400 hover:bg-brand-50/40'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          multiple
          className="hidden"
          onChange={handleChange}
        />
        <Upload
          size={42}
          className={`mx-auto mb-4 ${dragging ? 'text-brand-500' : 'text-slate-400'}`}
        />
        <p className="text-lg font-semibold text-slate-800">
          Перетащите Excel-файлы сюда или выберите вручную
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Сначала приложение покажет предпросмотр импорта, затем вы подтвердите запись в базу.
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          {readyFiles.length > 1 && (
            <div className="card flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Несколько файлов готовы к импорту</p>
                <p className="text-xs text-slate-500">
                  Предпросмотр уже собран. Можно подтвердить импорт сразу для всех.
                </p>
              </div>
              <button
                onClick={() => readyFiles.forEach((file) => void startImport(file.file))}
                className="btn-primary"
              >
                <Play size={15} />
                Импортировать все
              </button>
            </div>
          )}

          {files.map((fileState) => (
            <div key={fileState.file.name + fileState.file.size} className="card flex items-start gap-4 p-4">
              <FileSpreadsheet size={22} className="mt-0.5 shrink-0 text-emerald-500" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{fileState.file.name}</p>

                {fileState.status === 'parsing' && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 size={12} className="animate-spin" />
                    Разбираем файл и сравниваем с текущей базой…
                  </div>
                )}

                {fileState.status === 'ready' && fileState.preview && fileState.sheets && (
                  <div className="mt-3 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <PreviewBadge label="Новые группы" value={fileState.preview.totals.groupsToCreate} tone="blue" />
                      <PreviewBadge label="Новые ученики" value={fileState.preview.totals.studentsToCreate} tone="emerald" />
                      <PreviewBadge label="Новые тесты" value={fileState.preview.totals.examsToCreate} tone="violet" />
                      <PreviewBadge label="Обновить тесты" value={fileState.preview.totals.examsToUpdate} tone="amber" />
                      <PreviewBadge label="Новые результаты" value={fileState.preview.totals.resultsToCreate} tone="emerald" />
                      <PreviewBadge label="Обновить результаты" value={fileState.preview.totals.resultsToUpdate} tone="amber" />
                      <PreviewBadge label="Пропустить дубли" value={fileState.preview.totals.skippedDuplicates} tone="slate" />
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Предпросмотр по листам
                      </p>
                      <div className="mt-2 space-y-2">
                        {fileState.preview.sheets.map((sheet) => (
                          <div key={sheet.groupName} className="rounded-xl bg-white px-3 py-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-800">{sheet.groupName}</p>
                              <span className="text-xs text-slate-400">
                                {sheet.exams.create + sheet.exams.update + sheet.exams.reuse} тестов
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              Ученики: +{sheet.students.create}, повторно {sheet.students.reuse} ·
                              Тесты: +{sheet.exams.create}, обновить {sheet.exams.update}, без изменений {sheet.exams.reuse} ·
                              Результаты: +{sheet.results.create}, обновить {sheet.results.update}, пропустить {sheet.results.skip}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => void startImport(fileState.file)}
                        className="btn-primary"
                      >
                        <Play size={15} />
                        Импортировать
                      </button>
                      <button
                        onClick={() => void processFile(fileState.file)}
                        className="btn-ghost border border-slate-200"
                      >
                        <RefreshCcw size={15} />
                        Обновить предпросмотр
                      </button>
                    </div>
                  </div>
                )}

                {fileState.status === 'importing' && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-brand-600">
                      <Loader2 size={12} className="animate-spin" />
                      {fileState.progress?.stage ?? 'Импорт…'}
                    </div>
                    {fileState.progress && fileState.progress.total > 0 && (
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all"
                          style={{ width: `${(fileState.progress.current / fileState.progress.total) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {fileState.status === 'done' && fileState.sheets && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fileState.sheets.map((sheet) => (
                      <span
                        key={sheet.groupName}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                      >
                        <CheckCircle2 size={11} />
                        {sheet.groupName} · {sheet.students.length} уч. · {sheet.exams.length} тестов
                      </span>
                    ))}
                  </div>
                )}

                {fileState.status === 'error' && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-red-600">
                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                    <span>{fileState.error}</span>
                  </div>
                )}
              </div>

              {(fileState.status === 'done' || fileState.status === 'error' || fileState.status === 'ready') && (
                <button
                  onClick={() => remove(fileState.file)}
                  className="shrink-0 text-slate-400 transition-colors hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card border-blue-100 bg-blue-50 p-5">
        <h3 className="mb-2 text-sm font-semibold text-blue-800">Как экспортировать из Решу ЕГЭ</h3>
        <ol className="list-inside list-decimal space-y-1 text-sm text-blue-700">
          <li>Откройте журнал на сайте решу-егэ.рф</li>
          <li>Выберите группу или класс</li>
          <li>Нажмите «Экспорт» → «Excel»</li>
          <li>Загрузите скачанный `.xlsx` файл сюда</li>
        </ol>
        <p className="mt-3 text-xs text-blue-500">
          Поддерживаются файлы с несколькими листами. До записи в базу вы увидите, что создастся, что обновится и что будет пропущено как дубль.
        </p>
      </div>
    </div>
  )
}

function PreviewBadge({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'blue' | 'emerald' | 'violet' | 'amber' | 'slate'
}) {
  const tones = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    violet: 'border-violet-100 bg-violet-50 text-violet-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    slate: 'border-slate-200 bg-slate-100 text-slate-600',
  }

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${tones[tone]}`}>
      <strong>{value}</strong>
      {label}
    </span>
  )
}
