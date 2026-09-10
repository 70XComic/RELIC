#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

command -v timeout || {
  echo "build-verified.sh requires GNU timeout." >&2
  exit 69
}

vinext="${SITES_PROJECT_ROOT}/node_modules/.bin/vinext"
if [[ ! -x "${vinext}" ]]; then
  echo "vinext is unavailable. Run npm run install:ci and wait for it to finish before building." >&2
  exit 69
fi

echo "Running bounded vinext build..."

# vinext does not always clear removed public assets from a previous build.
# Start from a clean generated output so obsolete sprites cannot be published.
if [[ -d "${SITES_PROJECT_ROOT}/dist" ]]; then
  find "${SITES_PROJECT_ROOT}/dist" -mindepth 1 -delete
fi

timeout \
  --signal=TERM \
  --kill-after="${SITES_BUILD_KILL_AFTER:-10s}" \
  "${SITES_BUILD_TIMEOUT:-3m}" \
  "${vinext}" build

# The runtime now references lossless WebP assets. Local workspace sync can
# briefly restore their superseded PNG sources, so keep those out of deploys.
if [[ -d "${SITES_PROJECT_ROOT}/dist/client/assets" ]]; then
  find "${SITES_PROJECT_ROOT}/dist/client/assets" -type f \
    \( -name '*.png' -o -name '*.validated-temp' -o -name '*.verified-new' \) \
    -delete
fi

# Keep superseded artwork in source control while verifying and excluding it
# from the production upload. Active catalog and animation files are protected.
node "${script_dir}/prune-obsolete-runtime-assets.mjs"
