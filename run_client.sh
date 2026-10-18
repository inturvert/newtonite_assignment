
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

echo "Preparing the Newtonite client..."

cd "$SCRIPT_DIR/client"

npm install

npm run dev



