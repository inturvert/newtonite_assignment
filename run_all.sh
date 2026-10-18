
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting Newtonite server and client..."

bash "$SCRIPT_DIR/run_server.sh" &
SERVER_PID=$!
bash "$SCRIPT_DIR/run_client.sh" &
CLIENT_PID=$!

trap 'kill "$SERVER_PID" "$CLIENT_PID" 2>/dev/null || true' INT TERM EXIT
wait "$SERVER_PID" "$CLIENT_PID"


