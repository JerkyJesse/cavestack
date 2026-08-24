#!/usr/bin/env bash
# Build a Node.js-compatible server bundle for Windows.
#
# On Windows, Bun can't launch or connect to Playwright's Chromium
# (oven-sh/bun#4253, #9911). This script produces a server bundle
# that runs under Node.js with Bun API polyfills.
#
# The actual work is browse/scripts/build-node-server.ts — Bun.build in
# memory, then one write. CLI outfile + Git Bash head/perl stay locked
# on Windows (Permission denied / EUNKNOWN) and aborted Cursor setup.

set -e

CAVESTACK_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) CAVESTACK_DIR="$(cygpath -m "$CAVESTACK_DIR")" ;;
esac

echo "Building Node-compatible server bundle..."
bun "$CAVESTACK_DIR/browse/scripts/build-node-server.ts"
