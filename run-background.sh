#!/usr/bin/env bash
cd /home/bagus/Developments/child-growth-web

# Pastikan file .env ada
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
fi

# Install dependencies jika belum
if [ ! -d node_modules ]; then
  echo "=== Menginstal dependensi npm ==="
  npm install
fi

# Jalankan Vite dev server
echo "=== Menjalankan Vite dev server pada 0.0.0.0:5173 ==="
npm run dev -- --host 0.0.0.0
