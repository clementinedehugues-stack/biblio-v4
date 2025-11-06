#!/bin/bash
set -e

echo "🔧 Setting up environment..."
export PYTHONPATH=/opt/render/project/src

echo "📂 Moving to backend directory..."
cd backend

echo "🗄️  Running database migrations..."
alembic upgrade head

echo "✅ Migrations complete!"

echo "🚀 Starting FastAPI server..."
uvicorn backend.main:app --host 0.0.0.0 --port 10000
