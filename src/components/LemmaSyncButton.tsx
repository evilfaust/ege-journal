import { useState } from 'react'
import { CloudUpload, Loader2, Check, AlertCircle } from 'lucide-react'
import { pb } from '../lib/pb'

type Status = 'idle' | 'syncing' | 'done' | 'error'

export default function LemmaSyncButton() {
  const [status, setStatus] = useState<Status>('idle')
  const [output, setOutput] = useState('')

  async function sync() {
    if (status === 'syncing') return
    setStatus('syncing')
    setOutput('')
    try {
      const res = await pb.send<{ ok: boolean; output: string }>('/api/sync-lemma', {
        method: 'POST',
      })
      setOutput(res.output || '')
      setStatus(res.ok ? 'done' : 'error')
    } catch (err: any) {
      setOutput(err?.response?.output || err?.message || 'Ошибка соединения с сервером')
      setStatus('error')
    } finally {
      // вернуть кнопку в исходное состояние через несколько секунд
      window.setTimeout(() => setStatus((s) => (s === 'syncing' ? s : 'idle')), 6000)
    }
  }

  const config = {
    idle: {
      icon: <CloudUpload size={15} />,
      label: 'Отправить в Лемму',
      cls: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900',
    },
    syncing: {
      icon: <Loader2 size={15} className="animate-spin" />,
      label: 'Синхронизация…',
      cls: 'border-slate-200 bg-white text-slate-500',
    },
    done: {
      icon: <Check size={15} />,
      label: 'Отправлено',
      cls: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    error: {
      icon: <AlertCircle size={15} />,
      label: 'Ошибка',
      cls: 'border-rose-200 bg-rose-50 text-rose-700',
    },
  }[status]

  return (
    <button
      type="button"
      onClick={sync}
      disabled={status === 'syncing'}
      title={output || 'Отправить обновлённые результаты в облачную Лемму'}
      className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors disabled:cursor-default ${config.cls}`}
    >
      {config.icon}
      <span className="hidden sm:inline">{config.label}</span>
    </button>
  )
}
