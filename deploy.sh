#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

RPI_USER="faust"
RPI_HOST="88.201.208.15"
RPI_PORT="22222"
RPI_PB_DIR="/home/faust/apps/ege-deploy/pocketbase"
RPI_PATH="${RPI_PB_DIR}/pb_public/"

echo "🛠  Building production bundle..."
npx vite build

echo ""
echo "📦 Syncing pb_public/ → ${RPI_USER}@${RPI_HOST}:${RPI_PATH}"
rsync -avz --delete -e "ssh -p ${RPI_PORT}" pb_public/ "${RPI_USER}@${RPI_HOST}:${RPI_PATH}"

# Хук кнопки «Отправить в Лемму» (роут POST /api/sync-lemma). Сам скрипт пуша,
# его node_modules и .env.lemma уже лежат в чекауте /home/faust/apps/ege-journal-src
# на RPi — хук запускает их оттуда, доливать ничего не нужно.
echo ""
echo "🔌 Syncing pb_hooks/ → ${RPI_PB_DIR}/pb_hooks/"
rsync -avz --delete -e "ssh -p ${RPI_PORT}" pb_hooks/ "${RPI_USER}@${RPI_HOST}:${RPI_PB_DIR}/pb_hooks/"

# Перезапуск сервиса, чтобы PocketBase подхватил обновлённые pb_hooks/.
echo ""
echo "🔄 Restarting ege-journal.service on RPi..."
ssh -p "${RPI_PORT}" "${RPI_USER}@${RPI_HOST}" 'sudo -n systemctl restart ege-journal.service'

echo ""
echo "✅ Deployed. Open via SSH tunnel:"
echo "   ssh -L 8090:localhost:8090 ${RPI_USER}@${RPI_HOST} -p ${RPI_PORT} -N"
echo "   then http://localhost:8090"
