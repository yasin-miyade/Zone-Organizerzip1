#!/bin/sh
set -e

echo "Starting Zone Organizer (5toolbox)..."

if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL is set. Ensuring database schema is up-to-date..."
  pnpm --filter @workspace/db run push
  
  echo "Seeding default metadata..."
  pnpm --filter @workspace/db run seed
else
  echo "DATABASE_URL is not set. Running in offline database mode."
fi

echo "Starting Express backend API and frontend static server..."
exec node --enable-source-maps artifacts/api-server/dist/index.mjs
