**Collaborator:** aidlc-developer-agent

## Contribution

ユーザーのRun it hereに基づく同一会話内の代替確認。別開発担当による独立した寄稿ではない。

ドキュメント根拠：承認済みFR1–FR10、component-inventory.mdのguest-io/node-runtime/web-runtime/registry、stories.mdの依存とINVEST注記。実装・工数は未検証。

- public exports/型・snapshot・Workerライフサイクル・assetURLは後続Contract Designで固定する。ACにある複数の実装選択肢をテストが任意に選ぶことは許さず、設計で選んだ一つの契約をテストの前提にする。
- US4.1とUS5.1は複数入口/ブラウザー/guestをまとめており相対規模L。他は暫定M。これは設計前の分割候補であり実測工数ではない。Unit/Delivery Planningで入口・検証環境ごとの担当と実行コマンドを切り分ける。
- US6.4は公開済みRCをfixtureとして固定して判定できる。公開権限・terrarium書込み権限は成功済みと仮定せず、実装と受入れの障害として明示する。
- コア固有依存をcore.mjsへ保つことはゲストをcore.mjsへ固定登録する意味ではない。US2.1/US5.3の差替え確認を維持する。

## Positions

- AGREE: tarball先行・guest/ref配布分離・Node/browser入口と結果型を同じ契約へ対応させる。
- AGREE: 実公開の承認と段階承認を分け、RCの実terrarium検証をstable条件とする。
- AGREE (統合後): AC2.3.3などの設計選択肢はContract Design後に一つの固定前提へ具体化してから実装・検証する必要がある。stories.mdへこの決定期限と相対規模を明示する。
