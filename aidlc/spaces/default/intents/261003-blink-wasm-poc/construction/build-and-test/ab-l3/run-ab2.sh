#!/usr/bin/env bash
# 診断専用：L-3（worker.mjs の delete Atomics.waitAsync）あり／なしを ABBA で交互に計測する。
set -u
cd "$(dirname "$0")/../.."
N=$(ls -d ~/AppData/Local/mise/installs/node/24*/ | tail -1); export PATH="$N:$PATH"
W=runtime/web/worker.mjs
cp $W test-results/ab/worker.mjs.orig; sha256sum $W > test-results/ab/worker.sha256
cp docs/results/README.md test-results/ab/README.md.orig; cp docs/results/aube-timings.json test-results/ab/aube-timings.json.orig
restore() { cp test-results/ab/worker.mjs.orig $W; cp test-results/ab/README.md.orig docs/results/README.md; cp test-results/ab/aube-timings.json.orig docs/results/aube-timings.json; sha256sum -c test-results/ab/worker.sha256; }
trap restore EXIT
set_mode() { cp test-results/ab/worker.mjs.orig $W; if [ "$1" = B ]; then sed -i 's/^delete Atomics.waitAsync;$/\/\/ AB-TEST: delete Atomics.waitAsync;/' $W; fi; grep -c '^delete Atomics.waitAsync;$' $W | sed "s/^/mode $1 delete-lines=/"; }
run() { local env=$1 sets=$2 i=0; for s in $(seq 1 $sets); do for m in A B B A; do i=$((i+1)); set_mode $m; node scripts/measure-aube.mjs --env $env --trials 1 --out test-results/ab/r2-$env-$i-$m.json > test-results/ab/r2-$env-$i-$m.log 2>&1; echo "$env run $i mode $m exit=$? $(grep -o '{"version".*}' test-results/ab/r2-$env-$i-$m.log | head -1)"; done; done; }
run firefox 5
run chromium 3
echo ABDONE
