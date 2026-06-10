import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  BarChart2,
  Upload,
  ChevronRight,
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Journal from './pages/Journal'
import StudentPage from './pages/StudentPage'
import StudentReportPage from './pages/StudentReportPage'
import ExamPage from './pages/ExamPage'
import StatsPage from './pages/StatsPage'
import UploadPage from './pages/UploadPage'
import HomeworkPrintPage from './pages/HomeworkPrintPage'
import SetupGuard from './components/SetupGuard'
import GlobalSearch from './components/GlobalSearch'
import LemmaSyncButton from './components/LemmaSyncButton'
import LandingPage from './pages/LandingPage'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Обзор', end: true },
  { to: '/journal', icon: BookOpen, label: 'Журнал' },
  { to: '/stats', icon: BarChart2, label: 'Статистика' },
  { to: '/upload', icon: Upload, label: 'Загрузить' },
]

function Sidebar() {
  return (
    <aside className="app-sidebar fixed inset-y-0 left-0 z-20 hidden w-60 flex-col lg:flex">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white grid place-items-center font-bold text-[13px] tracking-tight shrink-0">
            ЕГ
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-slate-900">Журнал ЕГЭ</p>
            <p className="text-[11px] text-slate-500">кабинет преподавателя</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Навигация
        </p>
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2.2 : 2} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-200">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Решу ЕГЭ
        </p>
        <p className="mt-1 text-[12px] text-slate-500">Локальный кабинет преподавателя</p>
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
            `inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
              isActive
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`
          }
        >
          <Icon size={15} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function TopBar() {
  const location = useLocation()

  const staticTitles: Record<string, { eyebrow: string; title: string }> = {
    '/': { eyebrow: 'Панель преподавателя', title: 'Обзор' },
    '/journal': { eyebrow: 'Панель преподавателя', title: 'Журнал' },
    '/stats': { eyebrow: 'Панель преподавателя', title: 'Статистика' },
    '/upload': { eyebrow: 'Панель преподавателя', title: 'Загрузить результаты' },
  }

  const isStudent = location.pathname.startsWith('/student/')
  const isExam = location.pathname.startsWith('/exam/')

  const meta = Object.entries(staticTitles).find(([path]) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path),
  )?.[1] ?? { eyebrow: 'Панель преподавателя', title: 'Журнал ЕГЭ' }

  return (
    <header className="app-header print-hidden sticky top-0 z-10 border-b border-slate-200 px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4 lg:gap-6">
        <div className="flex-1 min-w-0">
          {(isStudent || isExam) ? (
            <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
              <NavLink to="/journal" className="hover:text-slate-900 transition-colors">
                Журнал
              </NavLink>
              <ChevronRight size={12} className="text-slate-300" />
              <span className="text-slate-900 font-medium">
                {isStudent ? 'Ученик' : 'Тест'}
              </span>
            </div>
          ) : (
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {meta.eyebrow}
            </p>
          )}
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-[-0.01em] truncate mt-0.5">
            {(isStudent || isExam) ? 'Журнал ЕГЭ' : meta.title}
          </h1>
        </div>
        <div className="hidden md:block">
          <GlobalSearch />
        </div>
        <LemmaSyncButton />
      </div>
    </header>
  )
}

function AppLayout() {
  return (
    <SetupGuard>
      <div className="app-shell flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col lg:pl-60">
          <TopBar />
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
              <Route path="/homework/:contextType/:contextId" element={<HomeworkPrintPage />} />
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
