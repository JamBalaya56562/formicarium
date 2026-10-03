#!/usr/bin/env bash
# 診断専用：static-musl の aube を x86-64 Linux コンテナで native に実行し、4 コマンドの時間を 10 回測る。
set -euo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
. "$root/scripts/lib/container.sh"
CONTAINER_EXTRA_ARGS="--network none" container_run busybox:latest test-results/jit/native-out '
  cp /work/dist/guests/aube /usr/local/bin/aube 2>/dev/null || { mkdir -p /usr/local/bin; cp /work/dist/guests/aube /usr/local/bin/aube; }
  chmod 0755 /usr/local/bin/aube
  export PATH=/usr/local/bin:/usr/bin:/bin AUBE_NO_UPDATE_CHECK=1
  now() { awk "{printf \"%d\", \$1*1000}" /proc/uptime; }
  t() { s=$(now); sh -c "$1" >/dev/null 2>&1 </dev/null; c=$?; e=$(now); echo "$((e-s)) $c"; }
  for i in 1 2 3 4 5 6 7 8 9 10; do
    rm -rf /w /root; mkdir -p /w /root; export HOME=/root
    cp -a /work/fixtures/aube-local-deps/. /w/; cd /w/app
    v=$(t "aube --version"); a=$(t "aube install"); rm -rf node_modules
    f=$(t "aube install --frozen-lockfile"); l=$(t "aube list")
    echo "trial=$i version=$v install=$a frozen=$f list=$l" | tee -a /out/native.txt
    cd /
  done
' dist/guests/aube fixtures/aube-local-deps
cat "$root/test-results/jit/native-out/native.txt"
