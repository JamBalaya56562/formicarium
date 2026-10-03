# 性能計測の手順

## 位置づけ

この PoC には、性能の合格基準（NFR の目標値）はない。FR6 の計測は、合否のためではなく、JIT 開発を後回しにするかどうかをユーザーが判断する材料である（`inception/requirements-analysis/requirements.md` の FR6、`construction/code-generation/code-summary.md`）。そのためこの手順書は、計測値の取り方を記すもので、合否の基準は持たない。

## テストの枠組みと設定

- `scripts/measure-aube.mjs`（Node.js の Worker と、Playwright の Chromium・Firefox・WebKit）
- 結果：`docs/results/aube-timings.json`（生データ）、`docs/results/README.md`（CheerpX 1.3.9 との比較表）

## 実行方法

```bash
node scripts/measure-aube.mjs --trials 10
```

- ほかの重い処理（コンテナでのビルド、テスト）を止めてから実行する。並行負荷があると値が大きく変わる。
- 結果の形式は `node --test tests/node/measure.test.mjs` で確認する。

## 期待する記録の内容（NFR3）

- 4 コマンド（`--version`、初回 `install`、frozen install、`list`）× 環境 × 試行回数ごとの実行時間
- ブラウザ名とバージョン、OS、ページが前面か背面か、試行回数

## 既知の制約

- 背面での計測はしていない。CheerpX の値（背面で計測）とは条件が違う（`docs/results/failures.md` の U-2）。
- 同じ環境でも値が大きくばらつく（例：Firefox の初回 install が 13 秒と 102 秒）。原因は調べていない。JIT の時期を決める前に、ばらつきの原因を調べることを勧める。
- Loop-back 1（2026-10-05）の後に再計測した。WebKit は速くなり、Chromium は遅くなった（`test-results.md` の「性能の再計測」）。Chromium の変化が Atomics.waitAsync の無効化（L-3）によるものかは未検証。
- 2026-10-05 から、計測スクリプトは各試行の前後にホストの固定計算の時間（`hostBenchMs`）も記録する。このマシンでは同じ計算の時間が 2.4 倍ほど変動することがあり、遅い時間帯に当たった試行はこの値で見分けられる。試行は 10 回を標準とする。
