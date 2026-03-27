import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  BarChart2,
  Upload,
  GraduationCap,
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Journal from './pages/Journal'
import StudentPage from './pages/StudentPage'
import StudentReportPage from './pages/StudentReportPage'
import ExamPage from './pages/ExamPage'
import StatsPage from './pages/StatsPage'
import UploadPage from './pages/UploadPage'
import SetupGuard from './components/SetupGuard'
import GlobalSearch from './components/GlobalSearch'

import LandingPage from './pages/LandingPage'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Обзор', end: true },
  { to: '/journal', icon: BookOpen, label: 'Журнал' },
  { to: '/stats', icon: BarChart2, label: 'Статистика' },
  { to: '/upload', icon: Upload, label: 'Загрузить' },
]

function Sidebar() {
  return (
    <aside className="app-sidebar fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/60 lg:flex">
      <div className="border-b border-white/60 px-6 py-6">
        <img src="/ege-journal-logo.png" alt="Журнал ЕГЭ" className="mb-3 h-11 w-auto" />
        <p className="mt-1 text-sm text-slate-500">
          Аналитика по группам, тестам и прогрессу
        </p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${isActive
                ? 'bg-slate-900 text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)]'
                : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/60 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Решу ЕГЭ</p>
        <p className="mt-1 text-sm text-slate-500">Локальный кабинет преподавателя</p>
      </div>
    </aside>
  )
}

function MobileNav() {
  return (
    <nav className="print-hidden mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">
      {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all ${isActive
              ? 'bg-slate-900 text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)]'
              : 'bg-white/80 text-slate-600 ring-1 ring-slate-200/80 hover:text-slate-900'
            }`
          }
        >
          <Icon size={16} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function PageTitle() {
  const location = useLocation()
  const titles: Record<string, string> = {
    '/': 'Обзор',
    '/journal': 'Журнал',
    '/stats': 'Статистика',
    '/upload': 'Загрузить результаты',
  }
  const title =
    Object.entries(titles).find(([path]) =>
      path === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(path),
    )?.[1] ?? 'Журнал ЕГЭ'

  return <>{title}</>
}

function AppLayout() {
  return (
    <SetupGuard>
      <div className="app-shell flex min-h-screen bg-slate-50/50">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
          <header className="app-header sticky top-0 z-10 border-b border-white/60 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Панель преподавателя
                </p>
                <h1 className="text-2xl font-semibold text-slate-900">
                  <PageTitle />
                </h1>
              </div>
              <GlobalSearch />
            </div>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <MobileNav />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/journal/:groupId" element={<Journal />} />
              <Route path="/student/:studentId" element={<StudentPage />} />
              <Route path="/student/:studentId/print" element={<StudentReportPage />} />
              <Route path="/exam/:examId" element={<ExamPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/upload" element={<UploadPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </SetupGuard>
  )
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  )
}
