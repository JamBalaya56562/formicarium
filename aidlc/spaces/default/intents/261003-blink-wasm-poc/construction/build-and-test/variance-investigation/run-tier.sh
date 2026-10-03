#!/usr/bin/env bash
# 診断専用：Chromium で既定と --no-liftoff を ABBA で交互に 4 セット（各 8 回）実行する。
cd "$(dirname "$0")/../diag"
N=$(ls -d ~/AppData/Local/mise/installs/node/24*/ | tail -1); export PATH="$N:$PATH"
i=0
for s in 1 2 3 4; do for p in chromium-default chromium-noliftoff chromium-noliftoff chromium-default; do i=$((i+1))
  node ../../node_modules/@playwright/test/cli.js test --config playwright.tier.config.mjs --project=$p --workers=1 --retries=0 --output=out-tier/$i --reporter=list 2>&1 | grep -E "^TIMING|passed|failed" | tr '\n' ' '; echo " run=$i"
done; done
echo TIERDONE
