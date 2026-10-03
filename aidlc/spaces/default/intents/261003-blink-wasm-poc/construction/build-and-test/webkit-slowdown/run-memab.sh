#!/usr/bin/env bash
# 診断専用：WebKit で wasm メモリの上限 4GB（F）と 1GB（G）を ABBA で交互に 4 セット（各 8 回）実行する。
cd "$(dirname "$0")/../.."
trap 'rm -rf dist/blink; cp -r test-results/wkcpu/dist-blink-4gb dist/blink; grep -o "maximum:[0-9]*" dist/blink/blink.mjs | head -1' EXIT
cd test-results/diag
N=$(ls -d ~/AppData/Local/mise/installs/node/24*/ | tail -1); export PATH="$N:$PATH"
i=0
for s in 1 2 3 4; do for m in F G G F; do i=$((i+1))
  rm -rf ../../dist/blink; if [ $m = F ]; then cp -r ../wkcpu/dist-blink-4gb ../../dist/blink; else cp -r ../wkcpu/dist-blink-1gb ../../dist/blink; fi
  echo -n "mode=$m $(grep -o 'maximum:[0-9]*' ../../dist/blink/blink.mjs | head -1) "
  node ../../node_modules/@playwright/test/cli.js test --config playwright.memab.config.mjs --project=webkit --workers=1 --retries=0 --output=out-memab/$i --reporter=list 2>&1 | grep -E "^TIMING" | tr '\n' ' '; echo " run=$i"
done; done
echo MEMABDONE
