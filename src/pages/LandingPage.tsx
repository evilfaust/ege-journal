import { useState, useEffect } from 'react'
import {
    BookOpen,
    Upload,
    Bot,
    FileText,
    ShieldCheck,
    Zap,
    Github,
    CheckCircle2,
    TrendingUp,
    Users,
    BarChart3,
    ArrowRight,
    Star,
    Clock,
    Layers,
    Moon,
    Sun,
} from 'lucide-react'

const GITHUB_URL = 'https://github.com/evilfaust/ege-journal'
const AUTHOR_URL = 'https://oipav.ru'

export default function LandingPage() {
    const [dark, setDark] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('landing-theme') === 'dark' ||
                (!localStorage.getItem('landing-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
        }
        return false
    })

    useEffect(() => {
        const root = document.documentElement
        if (dark) {
            root.classList.add('dark')
            localStorage.setItem('landing-theme', 'dark')
        } else {
            root.classList.remove('dark')
            localStorage.setItem('landing-theme', 'light')
        }
    }, [dark])

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-rose-200 dark:selection:bg-rose-900 transition-colors duration-300">
            {/* Header */}
            <header className="fixed top-4 left-4 right-4 z-50">
                <div className="max-w-6xl mx-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-lg shadow-slate-200/40 dark:shadow-slate-900/40 px-5 h-14 flex items-center justify-between">
                    <div className="flex items-center">
                        <img src="/ege-journal-logo.png" alt="Журнал ЕГЭ" className="h-7 w-auto rounded-lg bg-white dark:bg-white/10 p-0.5" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setDark(d => !d)}
                            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            aria-label="Переключить тему"
                        >
                            {dark ? <Sun size={17} /> : <Moon size={17} />}
                        </button>
                        <a
                            href={AUTHOR_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="hidden sm:inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            Проекты автора
                        </a>
                        <a
                            href={GITHUB_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <Github size={15} /> GitHub
                        </a>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="relative pt-36 pb-20 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                    <div className="absolute top-20 left-1/4 w-96 h-96 bg-rose-100 dark:bg-rose-900/30 rounded-full blur-3xl opacity-60" />
                    <div className="absolute top-40 right-1/4 w-80 h-80 bg-blue-100 dark:bg-blue-900/30 rounded-full blur-3xl opacity-50" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-gradient-to-t from-white dark:from-slate-950 to-transparent" />
                </div>

                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-5xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm font-medium mb-8">
                        <Zap size={14} className="text-rose-500 dark:text-rose-400" />
                        <span>Инструмент для преподавателей ЕГЭ</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6 leading-[1.08]">
                        Аналитика результатов{' '}
                        <span className="relative inline-block">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500">
                                Решу ЕГЭ
                            </span>
                            <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-orange-400 rounded-full" />
                        </span>
                        <br />
                        без лишних усилий
                    </h1>

                    <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Импортируйте Excel-таблицы, отслеживайте прогресс каждого ученика, получайте сводки прямо в Telegram — всё локально, без облаков.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a
                            href={GITHUB_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-base font-bold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 transition-all shadow-xl shadow-rose-200 dark:shadow-rose-900/40 hover:-translate-y-0.5 cursor-pointer"
                        >
                            <Github size={18} /> Открыть на GitHub
                        </a>
                        <a
                            href="#features"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-base font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm cursor-pointer"
                        >
                            Подробнее
                        </a>
                    </div>

                    {/* Stats strip */}
                    <div className="mt-16 grid grid-cols-3 gap-4 max-w-xl mx-auto">
                        <StatPill icon={Users} value="100+" label="учеников" />
                        <StatPill icon={TrendingUp} value="ЕГЭ" label="аналитика" />
                        <StatPill icon={Clock} value="0" label="облаков" />
                    </div>
                </div>
            </section>

            {/* Bento Features Grid */}
            <section id="features" className="py-20 bg-slate-50 dark:bg-slate-900">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
                    <div className="text-center mb-14">
                        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Всё что нужно учителю</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto">Один инструмент вместо таблиц, мессенджеров и ручного подсчёта</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-[minmax(160px,auto)]">

                        {/* Big card - Import */}
                        <div className="md:col-span-7 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 flex flex-col justify-between text-white overflow-hidden relative cursor-default">
                            <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute right-12 bottom-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2" />
                            <div className="relative">
                                <div className="inline-flex p-3 rounded-2xl bg-white/20 mb-4">
                                    <Upload size={24} />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">Умный импорт Excel</h3>
                                <p className="text-emerald-100 leading-relaxed max-w-sm">
                                    Загружайте таблицы с «Решу ЕГЭ» — автоматическое определение данных, предпросмотр и защита от дублей.
                                </p>
                            </div>
                            <div className="flex gap-2 mt-6 flex-wrap">
                                <Tag>xlsx / xls</Tag>
                                <Tag>Предпросмотр</Tag>
                                <Tag>Дедупликация</Tag>
                            </div>
                        </div>

                        {/* Telegram bot */}
                        <div className="md:col-span-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-8 flex flex-col justify-between text-white overflow-hidden relative cursor-default">
                            <div className="absolute -right-6 -top-6 w-36 h-36 bg-white/10 rounded-full" />
                            <div className="relative">
                                <div className="inline-flex p-3 rounded-2xl bg-white/20 mb-4">
                                    <Bot size={24} />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">Telegram-бот</h3>
                                <p className="text-blue-100 leading-relaxed">
                                    Результаты группы или ученика прямо в мессенджере — без открытия браузера.
                                </p>
                            </div>
                        </div>

                        {/* Journal */}
                        <div className="md:col-span-4 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-3xl p-8 flex flex-col justify-between hover:border-rose-200 dark:hover:border-rose-800 hover:shadow-lg hover:shadow-rose-50 dark:hover:shadow-rose-900/20 transition-all group cursor-default">
                            <div>
                                <div className="inline-flex p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60 transition-colors">
                                    <BookOpen size={22} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Журнал и группы</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                    Наглядный журнал с группами. Один клик — и открывается карточка ученика с полной статистикой.
                                </p>
                            </div>
                        </div>

                        {/* Dashboard */}
                        <div className="md:col-span-4 bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-900/30 dark:to-orange-900/20 border border-rose-100 dark:border-rose-900/50 rounded-3xl p-8 flex flex-col justify-between hover:shadow-lg transition-all cursor-default">
                            <div>
                                <div className="inline-flex p-3 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 mb-4">
                                    <BarChart3 size={22} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Дашборд</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                    Должники, сложные задания, динамика по всем группам — всё на одном экране.
                                </p>
                            </div>
                            <div className="flex items-end gap-1 mt-4 h-10">
                                {[40, 65, 50, 80, 70, 90, 75].map((h, i) => (
                                    <div key={i} className="flex-1 bg-rose-400 dark:bg-rose-600 rounded-sm opacity-80" style={{ height: `${h}%` }} />
                                ))}
                            </div>
                        </div>

                        {/* PDF Reports */}
                        <div className="md:col-span-4 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-3xl p-8 flex flex-col justify-between hover:border-amber-200 dark:hover:border-amber-700 hover:shadow-lg hover:shadow-amber-50 dark:hover:shadow-amber-900/20 transition-all group cursor-default">
                            <div>
                                <div className="inline-flex p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 mb-4 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/60 transition-colors">
                                    <FileText size={22} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">PDF Отчёты</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                    Красивые печатные отчёты для учеников: динамика, разбивка по заданиям, проблемные темы.
                                </p>
                            </div>
                        </div>

                        {/* Local DB wide */}
                        <div className="md:col-span-12 bg-slate-900 dark:bg-slate-800 border dark:border-slate-700 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 text-white cursor-default">
                            <div className="flex items-center gap-5">
                                <div className="inline-flex p-4 rounded-2xl bg-white/10">
                                    <ShieldCheck size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold mb-1">100% локальное хранение</h3>
                                    <p className="text-slate-400">PocketBase — база данных прямо на вашем компьютере. Никаких облаков, никаких утечек.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 flex-shrink-0 flex-wrap">
                                <BadgePill>Без интернета</BadgePill>
                                <BadgePill>GDPR friendly</BadgePill>
                                <BadgePill>PocketBase</BadgePill>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id="how-it-works" className="py-20 bg-white dark:bg-slate-950">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
                    <div className="text-center mb-14">
                        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Как начать?</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-lg">Три шага до полной аналитики</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mb-16">
                        <StepCard
                            number="01"
                            title="Установка"
                            description="Скачайте проект, установите зависимости npm install и бинарник PocketBase."
                            color="from-rose-500 to-rose-600"
                        />
                        <StepCard
                            number="02"
                            title="Запуск"
                            description="Один скрипт ./start.sh поднимает БД, создаёт коллекции, запускает бота и фронтенд."
                            color="from-blue-500 to-indigo-600"
                        />
                        <StepCard
                            number="03"
                            title="Работа"
                            description="Загружайте Excel с «Решу ЕГЭ» и сразу получайте полную аналитику по ученикам."
                            color="from-emerald-500 to-teal-600"
                        />
                    </div>

                    {/* Tech Stack */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                                <Layers size={20} className="text-slate-600 dark:text-slate-400" />
                            </div>
                            <h3 className="font-bold text-xl text-slate-900 dark:text-white">Технологический стек</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {[
                                { name: 'React 18 + TypeScript', light: 'bg-blue-50 border-blue-100', dark: 'dark:bg-blue-900/20 dark:border-blue-900' },
                                { name: 'Vite', light: 'bg-yellow-50 border-yellow-100', dark: 'dark:bg-yellow-900/20 dark:border-yellow-900' },
                                { name: 'PocketBase', light: 'bg-slate-100 border-slate-200', dark: 'dark:bg-slate-800 dark:border-slate-700' },
                                { name: 'Tailwind CSS', light: 'bg-cyan-50 border-cyan-100', dark: 'dark:bg-cyan-900/20 dark:border-cyan-900' },
                                { name: 'grammY (Telegram)', light: 'bg-sky-50 border-sky-100', dark: 'dark:bg-sky-900/20 dark:border-sky-900' },
                                { name: 'SheetJS (Excel)', light: 'bg-emerald-50 border-emerald-100', dark: 'dark:bg-emerald-900/20 dark:border-emerald-900' },
                            ].map(({ name, light, dark }) => (
                                <div key={name} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${light} ${dark}`}>
                                    <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Banner */}
            <section className="py-20 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="bg-gradient-to-br from-rose-600 via-rose-500 to-orange-500 rounded-3xl p-12 text-center text-white relative overflow-hidden">
                        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full" />
                        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/10 rounded-full" />
                        <div className="relative">
                            <Star size={28} className="mx-auto mb-4 opacity-80" />
                            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Готовы начать?</h2>
                            <p className="text-rose-100 text-lg mb-8 max-w-md mx-auto">
                                Откройте журнал прямо сейчас и начните работать с данными ваших учеников.
                            </p>
                            <a
                                href={GITHUB_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-bold text-rose-600 bg-white hover:bg-rose-50 transition-all shadow-xl cursor-pointer"
                            >
                                <Github size={18} /> Открыть на GitHub
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white dark:bg-slate-950 py-10 border-t border-slate-200 dark:border-slate-800">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <img src="/ege-journal-logo.png" alt="Журнал ЕГЭ" className="h-6 w-auto opacity-70 rounded-lg bg-white dark:bg-white/10 p-0.5" />
                    </div>
                    <p className="text-slate-400 dark:text-slate-500 text-sm">Локальная система управления результатами ЕГЭ</p>
                    <div className="flex items-center gap-4">
                        <a
                            href={GITHUB_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                            <Github size={18} />
                        </a>
                        <a
                            href="#features"
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors text-sm cursor-pointer"
                        >
                            Возможности
                        </a>
                        <a
                            href={AUTHOR_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors text-sm cursor-pointer"
                        >
                            oipav.ru
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    )
}

function StatPill({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
    return (
        <div className="flex flex-col items-center gap-1 px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-sm">
            <Icon size={16} className="text-rose-500 dark:text-rose-400" />
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">{value}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
        </div>
    )
}

function Tag({ children }: { children: React.ReactNode }) {
    return (
        <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium">
            {children}
        </span>
    )
}

function BadgePill({ children }: { children: React.ReactNode }) {
    return (
        <span className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-medium">
            {children}
        </span>
    )
}

function StepCard({ number, title, description, color }: { number: string; title: string; description: string; color: string }) {
    return (
        <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-7 border border-slate-200/60 dark:border-slate-700 hover:shadow-lg dark:hover:shadow-slate-900 transition-all cursor-default">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${color} text-white font-extrabold text-lg mb-5 shadow-lg`}>
                {number}
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h4>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{description}</p>
        </div>
    )
}
