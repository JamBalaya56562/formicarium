#!/usr/bin/env bash
# 診断専用：aube のスレッド数を絞った場合（T）と既定（D）を ABBA で交互に 4 セット（各 8 回）実行する。
cd "$(dirname "$0")/../.."
S=runtime/web/sessions.mjs
cp $S test-results/ab/sessions.mjs.orig; sha256sum $S > test-results/ab/sessions.sha256
trap 'cp test-results/ab/sessions.mjs.orig $S; sha256sum -c test-results/ab/sessions.sha256' EXIT
cd test-results/diag
N=$(ls -d ~/AppData/Local/mise/installs/node/24*/ | tail -1); export PATH="$N:$PATH"
i=0
for s in 1 2 3 4; do for m in D T T D; do i=$((i+1))
  cp ../ab/sessions.mjs.orig ../../$S
  if [ $m = T ]; then sed -i "s/aube: { AUBE_NO_UPDATE_CHECK: '1' }/aube: { AUBE_NO_UPDATE_CHECK: '1', TOKIO_WORKER_THREADS: '2', RAYON_NUM_THREADS: '2' }/" ../../$S; fi
  echo -n "mode=$m threads-line=$(grep -c TOKIO_WORKER_THREADS ../../$S) "
  node ../../node_modules/@playwright/test/cli.js test --config playwright.tier.config.mjs --project=chromium-default --workers=1 --retries=0 --output=out-threads/$i --reporter=list 2>&1 | grep -E "^TIMING|passed|failed" | tr '\n' ' '; echo " run=$i"
done; done
echo THREADSDONE
