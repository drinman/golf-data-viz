#!/bin/bash
# Cloud environment setup for Claude Code on the web (auto-fix PRs, remote sessions)
# Only runs in remote environments — skips local sessions

if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

npm install
npx playwright install --with-deps chromium
exit 0
