## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-07T19:21:19Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | runtime/core.mjs > loadPackageCore / createCoreResourceOwner / installVerifiedLoaderURLBridge; runtime/node/api.mjs > resource control; runtime/web/api.mjs > resource control / childControl | 旧所見は照合済みloader bytesを使わず元URLを別importしていた点。検証済み（ソース読取り）：現行loadPackageCoreは照合後、owner.allocate(new Uint8Array(loader))のmoduleURLだけをimportする。Nodeはhost所有0700一時領域の排他的0400コピー、browserはhost所有Blobを使う。pthreadは同じコピーまたはsame-origin HTTP bootstrapを介した同じ所有Blobに結合される。hostはresource/child identityとURLを検査し、root終了後に資源を解放する。main-verificationに実loader mutationのNode・3browser Red/Green、marker0、CSP許可/拒否、pthread・資源解放の観測がある。今回もruntime digest一致を確認し、追加Node oracleが正常・abort・timeout・disposeのsettle後に所有領域の空を要求する。 | 元URL再取得の欠陥は解消。今回の範囲で追加修正なし。CI・全体guest回帰・実Safariの未検証条件を後続へ保持する。 | Resolved |
| R-02 | Major | runtime/guest-io.mjs > runGuest preRun / mkdirParents / mkdirIfMissing; tests/package/fixtures.mjs > memoryFs.mkdir; tests/package/consumer.test.mjs / consumer.spec.mjs > removed nested cwd | 旧所見はsetCwd後の祖先removeで途中親を再作成できない点。検証済み（ソース読取り）：現行preRunはmkdirParents(FS,cwd)を先に呼び、0755で不足親を順に作成してからcwdを作る。既存modeを保持しfile/symlink衝突を拒否する。偽FSにも親不存在の拒否条件がある。main-verificationに修正前Node unit/consumerと3browserのCORE_INIT Red、修正後公開操作列のGreen、異常runのrollback・次run・mode・seed・resetの観測がある。今回もruntime digest一致と保持されたconsumer oracleを確認した。 | 途中親不足の欠陥は解消。今回の範囲で追加修正なし。 | Resolved |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| required-sections | 検証済み：plan / unit-test-instructions / code-summary全PASS、H2数6 / 5 / 8、findings 0 | 現行文書構造を確認した。 |
| traceability | 検証済み：FAIL、missing_from_upstream_ids 25件。他の不整合配列は空 | 25件は共有story-mapでU3/U4主担当のAC4.1/4.2、AC5.1/5.2、AC6.1–6.4。U1の28AC＋16詳細NFR＋13BRに欠落を示す結果ではなく、担当外実装を追加する理由にしない。 |
| Differential source review | 検証済み（読取り）：tests/package/consumer.test.mjsのwithCleanupOracleと2対照テスト、Steps23–25、summary/main-verificationの追加記録を確認 | 私有TMPDIRをfinallyで元の存在状態・値へ復元。実行出力時のloader digest・0700/0400確認と各settle後空を要求する。他ownerは私有root外に存在し、その削除と独立。私有ownerの意図した未回収はERR_ASSERTIONとなるpositive controlで検出する。全体tmpの古い資源を削除して合格させない。 |
| Causal evidence | ドキュメント根拠：旧oracleの別owner削除による決定論的Red1fail、175.344208ms。Green scoped2pass、2043.586792ms。v7 Node pack/consumer/nested20pass、5741.012833ms | 初回checkpointで消えたdirの所有者は未同定。mutation fixtureは既にresourcesを明示しdisposeをawaitしているため、localOwner未awaitという初期因果推測は訂正され、無関係な製品修正はされていない。 |
| Candidate correspondence | 検証済み（今回のdigest照合）：workspace runtime13＋README、実tgzともv7 manifest一致。SHA256969e9fab854d4499da1d38087bd601b65042b6d50b086c8fc8ddaefd0752f810 | 今回はtest oracle変更で製品candidateを変更していない。source-manifestのtests/package/ directory claimが対象を含む。 |
| Coverage provenance | 検証済み（今回のJSON読取り）：v8/v9 metadata全体deepEqual、v9 report候補SHA一致、1253realm、695/758行91.68%、skipped0、threshold80 | ドキュメント根拠：fresh v9 Node107pass、6057.623125ms。Worker追加なしで予定Node26不変。browserは未変更の既存v8の99件収集を明示的に再利用しており、今回再実行済みとは扱わない。 |
| Tests / lint / remaining limits | 既存main出力を使用。reviewerはbuild/tests/lintを実行せず、jj/git操作もなし | 既存build/runner/session30pass・2failはbaselineと同じpitchfork成果物欠落。全体guest回帰、CI、実Safari、公開は未検証。承認済みcheckpointの再検証はこのレビュー後のmain担当であり、未実施を合格としない。 |

### Summary

既存R-01/R-02はResolved、新たな製品所見はなくREADY。私有root・実loader稼働中観測・4終了経路の空確認・他owner独立・意図した漏れ対照により、旧共有tmp一覧比較の誤失敗を修正しつつ、所有資源の未回収を検出するoracleを維持している。runtime/tgz、品質基準、時間予算を変更していない。

coverageは新v9 Node収集と同一metadataの保存済みv8 browser収集の結合であり、browserの新実行を認定しない。既存全体guest回帰・CI・実Safari・公開と、今回のcheckpoint再検証は未検証として保持する。一回のadvisoryで、レビュー対象・製品への変更や修正ループは行っていない。
