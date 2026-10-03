# Architecture Decisions

## Sources

- [memory:M1] 承認済みrequirements.md、stories.md、refined-mockups。
- [memory:M2] CodeKB architecture.md/component-inventory.md、既存ADR 0003/0008/0009/0010（ドキュメント根拠）。
- [memory:M3] team-practices.md。判断案はcomponents.mdのcatalogueを参照する。

この記録のADR-001以降は本intent内の番号で、既存docs/decisions/0001–0012を改番/上書きしない。全ADRはProposedであり、本工程の人間承認で境界を確定する。日付：2026-10-07（ユーザーのAsia/Tokyo日付）。実装成功は未検証。

## ADR-001: 汎用実行・状態・環境ライフサイクルの責任を分ける

### Context

既存guest-ioは単一guest実行と手順内snapshotを扱い、Node/web Workerはregistry名を使う。今回のAPIは登録表の編集なしにguestを受け取り、別run間の状態と中止後の再実行を提供する必要がある。

### Decision

CoreAdapter、GuestExecution、SessionState、ExecutionLifecycleを論理境界とする。SessionStateだけが永続する端末内ファイル状態を所有し、ExecutionLifecycleがrun/Workerの寿命と状態操作の順序を所有する。GuestExecutionは新コアインスタンスで1回のguestを実行し、結果と状態変更の材料を返す。Node/browserの環境adapterはExecutionLifecycle内で分離する。

### Consequences

結果・ファイル状態・Worker終了の責任が一意になり、遅延通知を別runへ混ぜない検証を作れる。snapshotの引渡しと所有者での更新という境界が必要になる。公開method、型、同時呼出しの規則、timeout/失敗時の状態更新規則はContract Designで一つに固定する。コア固有知識はcore.mjsへ保ち、guestネットワーク/daemonを許可する根拠にはしない。

### Alternatives Rejected

- terrariumがsnapshotを所有：UIとNode consumerで状態規則が重複し、共通の読取/削除責任が曖昧になる。
- Node/browserで別々の終了・状態実装：環境差分は閉じやすいが、終了分類と状態の互換性が二重になる。環境adapterは分離し、共通責任は一つにする。
- 全処理を既存Workerへ集める：変更量は小さいが登録表/テスト手順/製品APIが混ざり、汎用guest差替えの境界を保ちにくい。

## ADR-002: 共通パッケージとterrariumのguest/ref配布を分ける

### Context

formicariumのnpmは共通JS/Worker/loader/wasm/types/notices/build-infoを提供し、aube/pitchforkのguest/fixtureはterrariumがref別に提供するという要件が承認済みである。

### Decision

PackageSupplyは共通候補の資産/exports/版/供給物情報を所有する。GuestDistributionはtool/refに対応するguest/fixture/取得元を所有する。TerrariumIntegrationが両者を利用して既存入口を保つ。GuestDistributionの登録は汎用JS APIの必須登録にしない。

### Consequences

コア版とguestrefを別に追跡でき、共通ライブラリをguest更新ごとに変更しない。2つの供給物の整合記録が必要になる。未知ref/fixtureを別版へ黙ってfallbackしない。LICENSE/notices、取得元commit、dirty状態を検証し、配布物に機密値を含めない。法的適合やスキャン成功は未検証である。

### Alternatives Rejected

- guest/fixtureもnpmへ同梱：導入経路は一本になるが、承認済みFR1.3/FR6に反する。
- loader/wasmもterrariumが所有：既存サイトへは近いが、空consumerの同梱資産のみでの実行と共通コア版の所有が崩れる。

## ADR-003: terrarium互換の翻訳境界を置く

### Context

低層APIはstdout/stderr/bytes/終了分類を扱う一方、terrariumには既存code/output/transcriptとready/exit/error、親origin検証がある。

### Decision

TerrariumIntegrationが既存入力の翻訳、tool変更reset、表示/transcript、要素/run()/iframeの通知を所有する。ExecutionLifecycleの結果を既存形式へ対応させ、元のraw bytesとstderrを受入れ証拠へ別に保存する。UIはterrariumに保ち、formicariumへDOM依存を導入しない。

### Consequences

既存利用コードの変更を抑え、共通APIをNode/browserで利用できる。イベント順序/回数/fieldsと失敗経路を基準commitと比較する必要がある。未承認originは実行も通知もしない。iframeの9条件と非実行oracle、隔離不足時の原因表示を契約/品質設計へ渡す。旧transcriptのstderr混入や新UI機能は追加しない。

### Alternatives Rejected

- 低層APIをterrariumイベントに統一：互換層は薄くなるが、CLI表示固有の契約が共通ライブラリへ漏れる。
- terrarium入口を新APIに一括変更：新実装は単純になり得るが既存入口維持の承認済み要件に反する。

## ADR-004: 配布候補と公開の証拠・判断を分ける

### Context

RCを公開してから実terrariumへ導入するため、RC公開前にRCの実terrarium受入れを要求すると循環する。stableにはその受入れと全必須NFRが必要である。

### Decision

PackageSupplyのPackageCandidateをReleaseAssuranceが検証し、ReleaseEvidence/ReleaseDecisionを所有する。RC公開前チェックと公開済みRCの受入れ後のstable条件を別判定にする。対象/操作承認なしに公開を行わず、模擬検証と実公開の証拠を分ける。

### Consequences

同梱内容、version/tag/channel、RC導入差分を追跡できる。候補が変われば必要な検証を行い、前の証拠を未確認の内容へ流用しない。coverage欠落/必須失敗が残るstable公開は止める。信頼したjob限定権限、長期npm tokenへ依存しない経路と未信頼変更阻止は後続で公式仕様/実設定を照合する。公開版の上書き/削除を復旧手段にしない。

### Alternatives Rejected

- PackageSupplyに検証/承認/公開すべてを持たせる：スクリプトはまとめやすいが、供給物の同一性と操作承認の責任が混ざる。
- RCにも実terrariumの受入れ完了を要求：条件は一様だが公開済みRCを入力にする受入れとの循環になる。
- ローカルpackの成功だけでstableへ進む：公開経路と実consumerの受入れを証明できない。

## Assumptions & Open Questions

この段階は論理コンポーネントと所有の設計であり、配備トポロジー、Unit、public schema、NFR実装方式、workflow権限設定は後続で確定する。既存ADRの制限と品質上限を保持する。構成検査はmainで行い、実装・公開・安全確認の成功とは区別する。
