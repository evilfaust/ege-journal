# Журнал ЕГЭ

Локальное веб-приложение для учителя: импорт результатов из "Решу ЕГЭ", журнал по группам, карточки учеников, аналитика по долгам и отдельный Telegram-бот для быстрых сводок.

## Что есть в проекте

- React + TypeScript + Vite фронтенд
- PocketBase как локальная БД и API
- импорт Excel из "Решу ЕГЭ" с предпросмотром и защитой от дублей
- журнал по группам с переходами в карточки ученика и работы
- дашборд с общей сводкой, должниками и слабыми заданиями
- страница статистики с отчётом по долгам для чата
- печатная версия карточки ученика и детальный PDF-отчёт
- Telegram-бот, который читает данные из PocketBase и отвечает на команды по группам и ученикам

## Структура

- `src/` - фронтенд
- `bot/index.mjs` - Telegram-бот на `grammy`
- `scripts/run-pocketbase.sh` - запуск PocketBase
- `scripts/backup_pb.sh` - архивный backup `pb_data`
- `setup.js` - создание коллекций через API PocketBase
- `pb_migrations/` - миграции PocketBase
- `pb_public/` - результат `npm run build`

## Требования

- Node.js 18+
- npm
- бинарник PocketBase в корне проекта: `./pb`

## Быстрый старт

### 1. Установить зависимости

```bash
npm install
```

### 2. Скачать PocketBase

macOS Apple Silicon:

```bash
curl -L https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_darwin_arm64.zip \
  -o pb.zip && unzip pb.zip pocketbase && mv pocketbase pb && rm pb.zip && chmod +x pb
```

macOS Intel:

```bash
curl -L https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_darwin_amd64.zip \
  -o pb.zip && unzip pb.zip pocketbase && mv pocketbase pb && rm pb.zip && chmod +x pb
```

Linux/Windows:

Скачать PocketBase вручную с [pocketbase.io](https://pocketbase.io/docs/) и положить бинарник рядом с проектом под именем `pb`.

### 3. Подготовить Telegram-переменные

Если бот нужен сразу, скопируйте `.env.example` в `.env.bot` и заполните:

```bash
cp .env.example .env.bot
```

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_USER_IDS`
- `TELEGRAM_DEFAULT_CHAT_ID` - опционально

### 4. Запустить проект

Полный сценарий:

```bash
./start.sh
```

`start.sh` делает следующее:

1. поднимает PocketBase на `http://127.0.0.1:8090`
2. запускает `setup.js`
3. запускает Telegram-бота из `bot/index.mjs`
4. запускает Vite dev server на `http://localhost:5151`

### Важно про первый запуск PocketBase

`setup.js` не создаёт superuser автоматически, а пытается войти с учётными данными, захардкоженными в самом файле:

- email: `admin@example.com`
- password: `password123456`

Если superuser ещё не создан, сначала:

1. запустите `./pb serve --http=127.0.0.1:8090`
2. откройте `http://127.0.0.1:8090/_/`
3. создайте администратора с этими данными или измените константы в `setup.js`
4. после этого снова запустите `./start.sh`

## Альтернативные команды

```bash
npm run dev
```

Только фронтенд на `http://localhost:5151`.

```bash
npm run pb
```

Запускает только Vite и PocketBase. В отличие от `./start.sh`, эта команда сейчас не запускает `setup.js` и не поднимает Telegram-бота.

```bash
npm run build
```

Собирает фронтенд в `pb_public/`.

```bash
npm run preview
```

Локальный preview production-сборки.

```bash
npm run backup:pb
```

Создаёт архив `pb_data` в `backups/`.

## Маршруты интерфейса

- `/` - обзор по группам, последним работам, должникам и слабым заданиям
- `/journal` - журнал по группам
- `/student/:studentId` - карточка ученика
- `/student/:studentId/print` - детальный печатный отчёт
- `/exam/:examId` - страница работы
- `/stats` - статистика и отчёт по долгам
- `/upload` - импорт Excel

## Импорт Excel

Импорт работает в два этапа:

1. файл парсится в браузере
2. перед записью показывается preview того, что будет создано, обновлено или пропущено

В preview отображаются:

- новые группы
- новые ученики
- новые тесты
- тесты на обновление
- новые результаты
- результаты на обновление
- дубли и неизменившиеся записи, которые будут пропущены

Поддерживаются файлы `.xlsx` и `.xls`.

### Ожидаемая структура

| Строка | Содержимое |
|--------|------------|
| 0 | Заголовки тестов вида `Контрольная работа № {exam_id}, {date}` |
| 1 | Заголовки заданий вида `B {n} № {problem_id}` |
| 2+ | Данные учеников |

### Именование файла

Рекомендуемый шаблон:

```text
ГРУППА-ДД.ММ.ГГ.xlsx
```

Примеры:

- `10А-01.02.26.xlsx`
- `11Б-15.03.26.xlsx`

Имя файла используется как дополнительный источник для названия группы и даты.

### Формат результата

Поддерживаются записи вида:

- `13(4)/4`
- `17/5`
- пустая ячейка как "не писал"

## Telegram-бот

Бот теперь живёт отдельно в `bot/index.mjs`, а не в `pb_hooks`.

Источник данных:

- `groups`
- `students`
- `exams`
- `student_results`

Бот читает PocketBase по HTTP API (`PB_URL`, по умолчанию `http://127.0.0.1:8090`).

### Команды

- `/help`
- `/ping`
- `/groups`
- `/week <группа>`
- `/month <группа>`
- `/all <группа>`
- `/scores <группа>`
- `/scores week|month|all <группа>`
- `/student <имя>`

Примеры:

```text
/week База 11 25 26
/scores month Проф 11
/student Иванов
```

## PDF и печать

В карточке ученика доступны два сценария:

- печать текущей карточки
- отдельный детальный отчёт `/student/:studentId/print`

В печатных версиях проект показывает:

- динамику и результаты по тестам
- расклад по заданиям
- проблемные задания
- ссылки на задания и работы
- группировку по периодам и блок "за всё время"

## Технологии

- React 18
- TypeScript
- Vite 6
- React Router 6
- PocketBase
- Recharts
- SheetJS (`xlsx`)
- Tailwind CSS
- `grammy`

## История последних изменений

По последним коммитам и текущему рабочему дереву в проект уже вошли или сейчас дорабатываются такие направления:

- предпросмотр импорта и дедупликация результатов
- глобальный поиск и виджеты внимания на дашборде
- ссылки на задания на странице работы
- backup-скрипт для PocketBase
- печатные отчёты ученика и восстановленный PDF-экспорт
- чатовый отчёт по долгам на странице статистики
- перенос Telegram-логики из `pb_hooks` в отдельный `bot/index.mjs`

## Если что-то не запускается

Проверить, что:

1. в корне есть `./pb`
2. PocketBase слушает `127.0.0.1:8090`
3. superuser для `setup.js` существует
4. `.env.bot` заполнен, если нужен Telegram-бот

Для полной перезагрузки локальной базы:

```bash
rm -rf pb_data
./start.sh
```

Админка PocketBase:

[http://127.0.0.1:8090/_/](http://127.0.0.1:8090/_/)
