import { Link } from 'react-router-dom'
import {
    LayoutDashboard,
    BookOpen,
    Upload,
    GraduationCap,
    Bot,
    FileText,
    Database,
    ShieldCheck,
    Zap,
    ChevronRight,
    Github,
    CheckCircle2
} from 'lucide-react'

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-brand-500/30">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/10 text-brand-700">
                            <GraduationCap size={20} />
                        </div>
                        <span className="font-bold text-slate-800 text-lg">Журнал ЕГЭ</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <a
                            href="https://github.com/evilfaust/math-test-ege" // To be updated by user
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-500 hover:text-slate-900 transition-colors"
                        >
                            <Github size={20} />
                        </a>
                        <Link
                            to="/"
                            className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
                        >
                            Войти в систему
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-100/40 via-slate-50 to-slate-50 -z-10" />
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200/50 text-brand-700 text-sm font-medium mb-8 animate-fade-in">
                        <Zap size={16} className="text-brand-500" />
                        <span>Локальное приложение для учителя</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8">
                        Управляйте результатами
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">
                            Решу ЕГЭ
                        </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Мощный аналитический инструмент: импорт из Excel, удобный журнал, детальные карточки учеников и Telegram-бот.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-[0_14px_30px_rgba(15,23,42,0.16)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.2)] hover:-translate-y-0.5"
                        >
                            Перейти в панель <ChevronRight size={18} />
                        </Link>
                        <a
                            href="#how-it-works"
                            className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl px-6 py-4 text-base font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            Как это работает
                        </a>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-white relative">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Всё для удобной работы</h2>
                        <p className="text-slate-500 text-lg">Автоматизируйте рутину и сосредоточьтесь на прогрессе учеников</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureCard
                            icon={Upload}
                            title="Умный импорт"
                            description="Загрузка Excel из 'Решу ЕГЭ' с предпросмотром, защитой от дублей и автоопределением данных."
                            color="bg-emerald-50 text-emerald-600"
                        />
                        <FeatureCard
                            icon={BookOpen}
                            title="Журнал и группы"
                            description="Наглядное отображение результатов по группам. Быстрый переход к детальной статистике каждого ученика."
                            color="bg-blue-50 text-blue-600"
                        />
                        <FeatureCard
                            icon={LayoutDashboard}
                            title="Дашборд и Аналитика"
                            description="Сводка по должникам, сложным заданиям и общая динамика по всем группам в одном месте."
                            color="bg-brand-50 text-brand-600"
                        />
                        <FeatureCard
                            icon={Bot}
                            title="Telegram-Бот"
                            description="Отдельный бот для быстрых команд. Узнавайте результаты группы или конкретного ученика прямо в мессенджере."
                            color="bg-sky-50 text-sky-600"
                        />
                        <FeatureCard
                            icon={FileText}
                            title="PDF Отчёты"
                            description="Генерация красивых печатных отчётов для учеников: с динамикой, раскладом по заданиям и проблемными темами."
                            color="bg-rose-50 text-rose-600"
                        />
                        <FeatureCard
                            icon={ShieldCheck}
                            title="PocketBase"
                            description="Никаких облаков. Вся база данных хранится локально на вашем компьютере для полной безопасности."
                            color="bg-amber-50 text-amber-600"
                        />
                    </div>
                </div>
            </section>

            {/* Workflow Section */}
            <section id="how-it-works" className="py-24 bg-slate-50 border-t border-slate-200/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
                    <div className="flex flex-col md:flex-row gap-16 items-center">
                        <div className="flex-1 space-y-8">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 mb-4">Как начать работу?</h2>
                                <p className="text-slate-500 text-lg">Простой и быстрый старт на локальной машине с минимальными настройками.</p>
                            </div>

                            <div className="space-y-6">
                                <Step
                                    number="1"
                                    title="Установка"
                                    description="Скачайте проект, установите Node.js зависимости через npm install и скачайте бинарник PocketBase."
                                />
                                <Step
                                    number="2"
                                    title="Запуск"
                                    description="Выполните скрипт ./start.sh, который поднимет БД, создаст коллекции, запустит бота и фронтенд."
                                />
                                <Step
                                    number="3"
                                    title="Импорт данных"
                                    description="Перейдите в веб-интерфейс, загрузите Excel-таблицы с 'Решу ЕГЭ' и наслаждайтесь аналитикой."
                                />
                            </div>
                        </div>

                        <div className="flex-1 w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200/60 shadow-xl shadow-slate-200/40 transform hover:-translate-y-1 transition-transform">
                            <div className="flex items-center gap-3 mb-6">
                                <Database className="text-brand-500" size={24} />
                                <h3 className="font-semibold text-xl text-slate-800">Архитектура</h3>
                            </div>
                            <ul className="space-y-4">
                                <TechItem name="React + TypeScript (Vite)" />
                                <TechItem name="PocketBase (Local DB + API)" />
                                <TechItem name="Tailwind CSS + Recharts" />
                                <TechItem name="grammY (Telegram Bot)" />
                                <TechItem name="SheetJS (Excel Parser)" />
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white py-12 border-t border-slate-200">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 opacity-80">
                        <GraduationCap size={20} className="text-slate-400" />
                        <span className="font-semibold text-slate-600">Журнал ЕГЭ</span>
                    </div>
                    <p className="text-slate-400 text-sm">
                        Локальная система управления результатами
                    </p>
                </div>
            </footer>
        </div>
    )
}

function FeatureCard({ icon: Icon, title, description, color }: { icon: any, title: string, description: string, color: string }) {
    return (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/50 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-100/50 transition-all group">
            <div className={`inline-flex p-3 rounded-2xl mb-4 ${color} transform group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-500 leading-relaxed text-sm">
                {description}
            </p>
        </div>
    )
}

function Step({ number, title, description }: { number: string, title: string, description: string }) {
    return (
        <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shadow-md">
                {number}
            </div>
            <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-1">{title}</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
            </div>
        </div>
    )
}

function TechItem({ name }: { name: string }) {
    return (
        <li className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
            <span className="text-slate-700 font-medium">{name}</span>
        </li>
    )
}
