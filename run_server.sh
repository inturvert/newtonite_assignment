#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

echo "Preparing the Newtonite server..."

cd "$SCRIPT_DIR/server"

npm install

npm run db:generate

npm run db:push

npm run db:seed

echo "Running the server on http://localhost:3001..."

npm run dev






