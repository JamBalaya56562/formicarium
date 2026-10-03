# Contract Design Questions

## Sources

承認済みunit-of-work.md / dependency.md、components.md、requirements.md、stories.md、refined-mockups。Node/browserの汎用JS API、Worker、ref供給、既存terrariumの公開面、品質/公開証拠の境界を形式化する。

検証済み：mainでjjの基準commit読取りを実行した。`jj file show -r 60dd0dc448f3a67d226dc8a3c6b3afcf4709823d root:packages/terrarium/src/session.ts` はexit 0。#runToolはstdout/stderrの両sinkを同じwriteへ渡し、#loadは同じinodeのfileへFS.linkを使い、#saveはnodeからinodeを記録する。現在のterminal.ts読取りではwriteがtranscript/outputへ追記する。実際のbrowser実行と新ランタイムでの互換性は未検証。

## Contract Plan

1. U1のpublic ESM/type/asset/run/session契約と内部Workerメッセージを定義する。
2. U2→U3/U4のtool/ref/fixture供給とprovenance契約を定義する。
3. U3の既存要素/run/イベント/iframe公開契約とU1への翻訳を定義する。
4. U1/U2/U3→U4のcandidate/evidence/coverage契約を定義する。
5. U4の具体的承認・RC/stable判定と外部配布契約を定義する。公開権限・公式仕様の検証成功は先取りしない。

Node/browserで同じrun・sessionの意味を持たせ、binary stdout/stderrは分離する。timeout/中止/初期化失敗をguestの非0終了と区別し、古いrun結果を受け付けない。API形状・資産URL・同時実行・再試行・commit規則は既存要件を満たす技術判断として具体化する。新しい常駐サービス・guest登録表・汎用shellを作らない。

## Ambiguity Analysis

上流には「stderrを既存transcriptへ混ぜない」という記述があるが、基準terrariumは両streamを表示する。formicariumのnative比較用transcript（runtime/session.mjsはstdoutのみ）とterrariumの表示を同じものとして扱うとFR5の既存互換性を壊す。基準の表示を保持し、比較・証拠はstdout/stderrを別記録にする案を提示する。上流の説明を無断で書き換えず、人間の回答を契約の根拠として残す。

FR3.2はhard-linkを基準調査後に判断する。基準は同じinodeを再現するため、保持する案と初回で保証しない案の選択を人間に確認する。ページ再読込み永続化とmtimeの新しい忠実再現は追加しない。

## Q1 — Transcript Compatibility

terrariumの表示は基準どおりstdout＋stderrを維持し、native比較用stdoutとstderrの証拠を別に記録する案を推奨する。stdoutのみへ変える案は既存互換性の変更になる。

[Answer]: 基準どおり両方を表示（推奨）。人間の原文：すみません、上手く回答出来ないからどちらも推奨通りの選択肢でお願いします。

## Q2 — Hard-link State

同じ端末のrun間でhard-link関係を基準どおり保持する案を推奨する。初回で保証しない案は、リンク先の変更が同一内容へ反映されない互換性差分を受け入れることになる。実装方法と成功は未検証である。

[Answer]: 基準どおり保持（推奨）。人間の原文：すみません、上手く回答出来ないからどちらも推奨通りの選択肢でお願いします。
