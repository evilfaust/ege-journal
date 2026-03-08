#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f ".env.bot" ]; then
  set -a
  . ./.env.bot
  set +a
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   📚 Журнал ЕГЭ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Check PocketBase
if [ ! -f "./pb" ]; then
  echo "⚠️  PocketBase не найден (./pb)"
  echo ""
  echo "Скачайте и переименуйте:"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if [[ $(uname -m) == "arm64" ]]; then
      echo "  curl -L https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_darwin_arm64.zip -o pb.zip && unzip pb.zip pocketbase && mv pocketbase pb && rm pb.zip && chmod +x pb"
    else
      echo "  curl -L https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_darwin_amd64.zip -o pb.zip && unzip pb.zip pocketbase && mv pocketbase pb && rm pb.zip && chmod +x pb"
    fi
  else
    echo "  https://pocketbase.io/docs/"
  fi
  echo ""
  exit 1
fi

# 2. Start PocketBase
echo "🗄️  Starting PocketBase..."
./scripts/run-pocketbase.sh &
PB_PID=$!

# Wait for PocketBase to start
sleep 2

# 3. Setup collections
echo "⚙️  Setting up database..."
if ! node setup.js; then
  kill $PB_PID 2>/dev/null || true
  exit 1
fi

# 4. Start Telegram bot
echo "🤖 Starting Telegram bot..."
node bot/index.mjs &
BOT_PID=$!

# 5. Start dev server
echo ""
echo "🚀 Starting dev server..."
echo ""
echo "  App:            http://localhost:5151"
echo "  PocketBase API: http://localhost:8090"
echo ""
echo "Press Ctrl+C to stop"
echo ""

npm run dev &
VITE_PID=$!

trap "kill $PB_PID $BOT_PID $VITE_PID 2>/dev/null || true" EXIT INT TERM

wait
