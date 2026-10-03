#!/usr/bin/env bash
# 診断専用：毎回 aube の直前と直後にホストの固定計算を測り、aube の時間と連動するかを見る。
cd "$(dirname "$0")/../diag"
N=$(ls -d ~/AppData/Local/mise/installs/node/24*/ | tail -1); export PATH="$N:$PATH"
for i in $(seq 1 12); do
  b1=$(node ../ab/cpubench.cjs | cut -d' ' -f1)
  t=$(node ../../node_modules/@playwright/test/cli.js test --config playwright.tier.config.mjs --project=chromium-default --workers=1 --retries=0 --output=out-host/$i --reporter=list 2>&1 | grep -E "^TIMING" | tr '\n' ' ')
  b2=$(node ../ab/cpubench.cjs | cut -d' ' -f1)
  echo "run=$i bench_before=$b1 bench_after=$b2 $t"
done
echo HOSTDONE
