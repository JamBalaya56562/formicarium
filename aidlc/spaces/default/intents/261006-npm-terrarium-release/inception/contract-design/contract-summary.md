# Contract Summary

## Sources

- [memory:M1] 承認済みunit-of-work.md / unit-of-work-dependency.md：U1 library、U2 packaging、U3 ui、U4 packaging、5辺。
- [memory:M2] components.md / decisions.md：8componentの所有境界。SessionStateが状態、ReleaseAssuranceが証拠・公開判断を所有する。
- [memory:M3] requirements.md FR1–FR10/NFR1–NFR7、stories.mdの18ストーリー、refined-mockups：互換性・品質・公開条件。
- [Q1][Q2] contract-design-questions.md。人間は両方の推奨案を選択し「はい、了解しました。承認するので続けて下さい。」と継続を指示した。
- [observed] mainの `jj file show -r 60dd0dc448f3a67d226dc8a3c6b3afcf4709823d root:packages/terrarium/src/session.ts` はexit 0。stdout/stderrが同じwriteへ流れ、inodeによりhard-linkを再生成することをソースで観測した。terminal.ts/web/terminal.mjs/catalog.tsを読取り、public fields・origin判定・ref不足の拒否を観測した。実行互換性は未検証。

以下は実装前の提案契約。コード・npm pack・型consumer・Worker/browser・coverage・実公開の成功を意味しない。JS APIとshared modelに適したTypeScript/JSON形式を使い、存在しないRESTサービスは定義しない。

## Contracts Table

| # | Provider Unit | Consumer | Mechanism | Owner |
|---|---|---|---|---|
| C1 | U1 | External: Node/browser JS consumer、U3 | ESM + Promise + byte callbacks | U1 ExecutionLifecycle / SessionState |
| C2 | U1 | External: package installer/bundler、U3、U4 | npm tarball / assets / declarations | U1 PackageSupply |
| C3 | U2 | U3、U4 | static manifest + HTTP assets / shared model | U2 GuestDistribution |
| C4 | U3 | External: existing element/page consumer | custom element / Promise / DOM events | U3 TerrariumIntegration |
| C5 | U3 | External: approved iframe parent | postMessage / exact origin | U3 TerrariumIntegration |
| C6 | U1、U2、U3 | U4 | candidate-bound validation evidence | U4 ReleaseAssurance（spec所有）、各provider（結果所有） |
| C7 | U4 | External: release operator / CI | approval-bound release decision | U4 ReleaseAssurance |
| C8 | U1 | U1 host adapter（内部補助境界） | Worker structured clone / run generation | U1 ExecutionLifecycle |

Unit辺U3→U1はC1/C2、U3→U2はC3、U4→U1はC2/C6、U4→U2とU4→U3はC6に対応する。C8は公開exportにしない。

## C1 — Public Execution and Session Contract

Node/browser両入口に同じ意味のcreateSessionを置く。ゲスト登録表を必須にしない。stdout/stderrの正本はbytes。decodeUtf8はconsumerが明示的に使う表示補助で、byte基準を置き換えない。

```typescript
export interface Assets {
  loaderURL: string | URL;
  wasmURL: string | URL;
  workerURL: string | URL;
  buildInfoURL: string | URL;
}
export type FsEntry =
  | { path: string; type: 'dir'; mode: number }
  | { path: string; type: 'file'; mode: number; inodeId: string; data: Uint8Array }
  | { path: string; type: 'symlink'; target: string };
export interface SessionOptions {
  assets?: Assets;
  cwd?: string;                     // default /work
  home?: string;                    // default /root
  entries?: readonly FsEntry[];     // copied initial state, default []
}
export interface RunOptions {
  guest: Uint8Array;                // static-musl x86-64 ELF, copied
  args?: readonly string[];         // default []
  env?: Readonly<Record<string, string>>; // default {}
  timeoutMs?: number;               // positive finite integer, default 600000
  signal?: AbortSignal;
  onOutput?: (chunk: OutputChunk) => void;
}
export interface OutputChunk {
  runId: string;
  sequence: number;
  stream: 'stdout' | 'stderr';
  bytes: Uint8Array;
}
export interface RunResult {
  runId: string;
  exitCode: number;
  stdout: Uint8Array;
  stderr: Uint8Array;
  elapsedMs: number;
}
export type ErrorCode = 'INVALID_INPUT' | 'ASSET_LOAD' | 'UNSUPPORTED_ENV'
  | 'CORE_INIT' | 'EXECUTION' | 'SNAPSHOT' | 'TIMEOUT' | 'ABORTED'
  | 'BUSY' | 'DISPOSED' | 'NOT_FOUND' | 'NOT_FILE';
export interface ExecutionError extends Error {
  code: ErrorCode;
  runId?: string;
  stdout: Uint8Array;
  stderr: Uint8Array;
  cause?: unknown; // local safe cause; never serialize secrets
}
export interface Session {
  run(options: RunOptions): Promise<RunResult>;
  readFile(path: string): Promise<Uint8Array>;
  remove(path: string): Promise<void>;
  listEntries(path?: string): Promise<readonly FsEntry[]>;
  setCwd(path: string): Promise<void>;
  reset(): Promise<void>;
  dispose(): Promise<void>;
}
export function createSession(options?: SessionOptions): Promise<Session>;
export function decodeUtf8(bytes: Uint8Array): string;
```

**入力とstate。** cwd/homeは絶対POSIXディレクトリ。既定persist rootsは/workと/root。cwdが/work内の子に変わっても/work全体を保持する。別のcwd/homeを設定する場合は、その初期ディレクトリをrootとし、互いの重複は一度だけ保存する。/、/guest、/dev、/proc、/tmpとその子をpersist rootに指定しない。seed entriesはroot内のみ、重複path・NUL・`..` component・無効type/mode/inodeを拒否する。public pathは絶対pathでroot内に限定し、`..`を拒否する。symlinkのtargetを親から解決してroot外へ出る入力を拒否する。alias経由の公開読取/削除はfollowせず、readFileは通常fileのみ。guest ELFは/guestへ配置し、状態seedと衝突させない。HOMEはsession.homeに固定し、env.HOMEの不一致はINVALID_INPUT。初期作業ディレクトリが未seedでも作成する。許可外の公開FS操作を成功扱いしない。これらはhost filesystemをguestへmountする許可ではない。

FsEntryはfile bytesとmode、directory mode、symlink targetを保存する。同じinodeIdのfileは同じdata/modeを持つことを検査し、同一リンクとして次runへ復元する。inodeIdの意味は同じsession内のみで、別端末と共有しない。mtime忠実再現・ページ再読込み永続化は保証しない。guestの一時/dev/proc/tmp、guest binaryはsnapshotに含めない。snapshot範囲内のhard-link・symlink・削除・modeを維持する。実装可否はFunctional Designとnative/guest回帰で検証する。

**公開FS操作の結果。** 下表の操作はSessionStateに対するもので、guest/coreを起動しない。まずDISPOSED/BUSYとC1のpath境界を検査する。途中のpath componentがsymlinkならfollowせずINVALID_INPUTで拒否する。最終componentのsymlinkは表の規則で扱い、外部状態へ解決しない。pathの末尾slashと`.` componentは正規化し、`..`は正規化で消さず拒否する。空文字pathはINVALID_INPUTで、listEntriesの省略とは異なる。

| 操作・対象 | 成功結果・状態変更 | 不存在時 | その他の拒否 |
|---|---|---|---|
| readFile(path): file | 内容のコピーUint8Array。状態は変更しない | NOT_FOUND | dir/symlinkはNOT_FILE |
| remove(path): file | そのpathだけ削除。他のhard-link pathと内容は保持 | 冪等成功、変更なし | persist root自体はINVALID_INPUT |
| remove(path): dir | dirと全子孫を再帰的・原子的に削除 | 冪等成功、変更なし | persist root自体はINVALID_INPUT |
| remove(path): symlink | link entryだけ削除。targetは変更しない | 冪等成功、変更なし | persist root自体はINVALID_INPUT |
| listEntries(): path省略 | 現在のsession cwdを対象に、下記と同じ列挙 | cwdが不在ならNOT_FOUND | cwdはC1で検証済みの絶対path |
| listEntries(path): dir | 直下の子だけを返す。対象dir自身と孫以降は含めない。空dirは[] | NOT_FOUND | root外/不正pathはINVALID_INPUT |
| listEntries(path): file/symlink | []。リンク先を列挙しない | NOT_FOUND | 中間symlinkはINVALID_INPUT |

listEntriesは絶対path順（JSの文字列のcode-unit昇順）に整列したFsEntryのコピーを返す。hard-linkのinodeIdは同じsessionで一貫し、返却entryやdataを変更しても所有stateへ反映しない。removeの検査失敗は部分削除を残さず、各成功操作は同じstateに即時反映し次runへ渡す。rootを削除したい用途はresetで初期seedへ戻す。cwdの子を削除してcwd pathが不在になった場合、setCwd/listEntries/readFileはそれぞれ通常の不存在規則に従い、run開始時の作業dir作成規則は既定どおり適用する。

**単一runと終了。** sessionごとにactive runを一つに限定する。同時runとactive中のFS操作/reset/setCwdはBUSYでrejectし、暗黙queueしない。U3は自分の既存command queueから逐次呼ぶ。別sessionは別Worker/stateを持つ。args/env/guest/entriesは受付時にコピーし、consumerへの返却bytes/entriesもコピーする。run毎に新しいguest/coreインスタンスを使う。

timeoutはrun受付から資産取得・初期化・guest実行・snapshotまでの全経過で測る。default600000、長いaube受入れには既存browser840000を明示し、テスト上限を緩めない。資産取得と初期化にもsignal/期限を伝える。signalが既にabortならguestを起動しない。disposeはactive runをABORTEDでsettleし、Worker終了を待ち、所有stateを破棄する。disposeは冪等で、以後の操作はDISPOSED。timeout/abort/disposeはtimer・listener・fetch・Workerを後始末し、各Promiseを一度だけsettleする。異常時の自動再実行はしない。正常なguest非0終了はresolveし、exitCodeを保持する。

正常onExitで完全snapshotを取得したときのみSessionStateへ原子的に反映する。非0終了も正常終了として反映する。入力/初期化/core失敗、snapshot失敗、timeout、中止はcommitせず前runのstateを保持する。resetは初期seed/cwd/homeへ戻す。dispose後は再利用せず新sessionを作る。非対応network/daemonは契約に従う失敗または有限終了であり、常駐実行を成功として残さない。具体oracleを品質設計で固定する。

onOutputはstream別のbytesを受付順sequenceで渡し、戻り値を待たない。callbackがthrowしたrunはEXECUTIONでrejectしcommitしない。正常終了時は全chunkをflushした後にstdout/stderr結果を返す。失敗・timeout/abort時のpartial bytesは既にhostへ届いた範囲であり、未送信bytesの完全性を保証しない。出力callbackは診断ログへの無条件転記を意味しない。機密env/入力の値をerror message/causeや証拠へ写さない。raw bytesが機密を含む場合は公開証拠用fixtureに機密を使わず、private結果をpublicログへ載せない。

## C2 — Package Supply and Assets

```json
{
  "schemaVersion": 1,
  "package": "@aletheia-works/formicarium",
  "exports": {
    ".": "shared byte helper and public types",
    "./node": "createSession with Node Worker adapter",
    "./browser": "createSession with browser Worker adapter",
    "./assets/blink.mjs": "core loader",
    "./assets/blink.wasm": "core wasm",
    "./assets/build-info.json": "core provenance"
  },
  "requiredContents": ["first-party JS", "Node Worker", "browser Worker", "core loader", "core wasm", "declarations", "LICENSE", "third-party notices", "build-info"],
  "excludedContents": ["aube ELF", "pitchfork ELF", "guest fixtures", "development probe ELF", "private workspace records"],
  "supportedNode": ">=24"
}
```

実際のexport targets/files一覧をU1のFunctional Design/pack manifestで固定する。上のexport keys・役割は契約、配置の文字列は実装ファイル名ではない。rootはNode builtinをimportしないshared helper/typesだけを公開する。Nodeはpackage内URLから既定assetsを解決し、browser consumerはbundler/CDNによる同梱配置を明示するAssetsを渡す。browserでassets省略時はpackage moduleに相対の同梱位置を使い、元repo/distを参照しない。workerURLはsame-origin module Workerを起動できるURL。loader/wasm/build-infoは明示URLと配信側CORS/CORP/隔離条件に従う。blob/CDNを自動迂回して安全条件を隠さない。Nodeのfile URLとbrowserのURLの扱いはadapter内に閉じる。

loader・wasm・build-infoは同じビルドの組を使う。core固有locateFile/argv/worker補助資産の知識はCoreAdapterに閉じ、consumerへEmscripten factoryを要求しない。PackageCandidateは版、tarball sha256、配布JS一覧とcontent digests、asset/build-info/notice digestsを持つ。dirty=false、blink.lock commitとの対応を確認する。欠落/不一致/HTTP失敗はASSET_LOAD、隔離や必須機能不足はUNSUPPORTED_ENV、factory失敗はCORE_INIT。取得・開始の暗黙retryなし。再配置した空consumer・型consumer・欠落asset fixtureで検証する。browser Workerのdelete Atomics.waitAsyncを維持する。

## C3 — Ref-bound Guest Distribution

```typescript
interface GuestSelection {
  tool: 'aube' | 'pitchfork';
  ref?: string;              // branch/tag/commit/pr-N; omitted = catalogue default
  fixture?: string;          // undefined = default; '' = none
  base: string;
}
interface GuestBuild {
  schemaVersion: 1;
  tool: 'aube' | 'pitchfork';
  ref: string;               // selected key, never silent fallback
  source: { url: string; ref: string; commit: string };
  guest: { url: string; sha256: string; format: 'static-musl-x86_64' };
  fixtures: Record<string, { url: string; sha256: string }>;
  buildInfo: { url: string; sha256: string };
  built_at: string;
}
interface SelectedGuest {
  build: GuestBuild;
  guest: Uint8Array;
  entries: readonly FsEntry[];
  cwd: string;
}
// U2 resolver contract consumed by U3; catalogue adapter remains in terrarium.
declare function resolveGuest(input: GuestSelection): Promise<SelectedGuest>;
```

既存tools.json/dist/builds.jsonのChoice/tool/ref/source/describeを維持し、aube/pitchforkだけに新guest metadataを追加する。他ツールの既存buildを同じ形式に強制移行しない。新対象buildのsource.commitは必須であり、欠落を「別refを使った成功」にしない。keyのbranch/tag/commit/pr-Nはcatalogueの登録keyで照合し、任意文字列をそのままURL pathへ連結しない。URLはmanifestのbase相対で解決し、供給allowlist内に限定する。

guest/fixture/build-infoのsha256とtool/ref/commitを照合してからU1へ渡す。fixtureはUTF-8文字列または明示bytesからFsEntryへ変換し、C1のpath境界検証を通す。fixture=''は空seed、undefinedはtool既定。fixtureとcwd既定は基準terrariumを保持する。欠落tool/ref/fixture、404、digest/format不整合を原因付きerrorにし、fallback/retryしない。guestrefを共通core版と混同しない。変更のないaubeを再buildしない。U4は同じSelectedGuestのprovenance/digestsを受入れ証拠へbindする。

## C4 — Existing Terrarium Element and Page

```typescript
interface ReadyDetail { tool: string; ref: string; commit: string | null; seconds: number }
interface ExitDetail { command: string; code: number; output: string }
interface ErrorDetail { message: string }
interface TerrariumTerminalContract {
  readonly ready: Promise<ReadyDetail>;
  readonly transcript: string;
  run(command: string): Promise<ExitDetail>;
  focus(): void;
}
// tag: terrarium-terminal
// attributes: tool, ref, fixture, cwd, run, base
// events (CustomEvent; bubbles=true, composed=true):
// terrarium-ready => ReadyDetail
// terrarium-exit => ExitDetail
// terrarium-error => ErrorDetail
// page query: tool/ref/fixture/cwd, repeated run, embed, origin
```

基準のreadyは接続前reject、boot成功で一度resolve/ready通知、boot失敗でreject/error通知。run()はreadyを待って既存chainで逐次処理し、失敗後もchainを再利用できる。正常な非空commandはExitDetailとterrarium-exitを返し、非0もexit扱い。空commandはcode0/output空でexitイベントを追加しない。入力/開始/timeout/abort失敗はerrorを通知しrunをreject、guest正常終了と偽装しない。新失敗条件の通知回数は一度。基準に存在するcommand失敗のcode/output/eventsはfixtureで維持する。guest出力はC1.onOutputのstream別decoderを使い、受信sequenceどおり両streamを表示・output/transcriptへ追記する。native比較用stdout-only記録と別にする。bytesを表示した後でもC1結果の正本を失わない。partial outputを二重表示しない。

これはQ1による上流説明の解消であり、既存UI表示をstdout-onlyへ変更しない。上流「stderrを既存transcriptへ混ぜない」はformicarium native比較の記録へ適用し、terrarium基準の表示には適用しない。変更の根拠は[Q1]と観測ソース。Q2に従ってhard-linkをC1で保持する。modeも保持する。新UI再設計・ログformat一括変更をしない。

tool切替は基準のref/fixture/cwd/queued run resetを維持する。切替・要素終了では古いsessionをdisposeし、古い結果/readyを新端末へ通知しない。run属性は改行で逐次、pageの複数runは既存順。base/default、fixture=''、cwd、commit表示は基準比較する。

既存builtins cd/ls/cat/rm/pwdをU1の公開FS操作へ翻訳する。cdは端末cwdとC1.setCwdを同期し、catは通常file bytesを表示、rmは対象stateを削除、ls/pwdは同じstate/cwdから計算する。基準許可構文をliteral argとして維持し、pipe/redirection/expansionなどをshellとして実行しない。unsupported構文は明示error、未知commandは基準code127/message。既存splitArgsの単/二重引用符・非空wordは互換fixtureで固定し、より広いPOSIX shellを追加しない。FS root外の要求はC1境界で拒否する。

| builtin | C1への翻訳 | 基準の観測可能な結果 |
|---|---|---|
| ls [path] | 最初の非option引数、なければ現在cwdを絶対pathへ解決しlistEntries。子nameを表示、dirは末尾/、symlinkはname → target、昇順 | 子があれば改行区切りと末尾改行、空なら出力なし、code0。file/symlink対象は[]で出力なし。NOT_FOUNDはcode0/出力なしへ翻訳。INVALID_INPUT/BUSY等は空成功へ変換しない |
| rm [-rf] [paths...] | option文字列を基準どおり除き、各対象をcwdから絶対pathへ解決してremoveを逐次await | fileをunlink、dirは再帰削除、symlinkはlinkだけ削除。不在・対象なしはcode0/出力なし。他hard-link pathは維持。root外/保護rootはC1拒否を明示し、基準の境界外削除を再現しない |

後続の互換fixtureに、lsの省略path/空dir/直下と孫/通常file/symlink/不在、rmの通常file/再帰dir/linkとtarget/不在/保護root/他hard-link残存、返却copy変更の非反映を含める。これは検証計画であり、今回テスト成功とは扱わない。

## C5 — Iframe Message Contract

```typescript
type ParentToTerrarium = { type: 'terrarium:run'; command: string };
type TerrariumToParent =
  | { type: 'terrarium:ready'; tool: string; ref: string; commit: string | null }
  | { type: 'terrarium:exit'; command: string; code: number; output: string }
  | { type: 'terrarium:error'; message: string };
// receive only when event.source === window.parent AND event.origin === targetOrigin
// send only to exact targetOrigin; never '*'; unknown origin => no send or run
```

targetOriginは基準のorigin query→ancestorOrigins→referrerから得る。opaque/null/wildcard/無効originを承認originとして使わない。message typeとcommand型を検査し、未知fieldsは無視できるが未知typeは実行しない。approved parentでも隔離条件を確認する前にrunを始めない。

| 条件 | Chromium | Firefox | WebKit |
|---|---|---|---|
| 同一origin・親/iframe/資産の隔離条件あり | 成功 | 成功 | 成功 |
| 外部origin GitHub Pages・credentialless/allow・必要条件あり | 成功 | 未対応通知、guest未実行 | 未対応通知、guest未実行 |
| 必要条件なし | 原因通知、guest未実行 | 原因通知、guest未実行 | 原因通知、guest未実行 |

未承認parentからのrunは全セルで拒否し、未承認親へ通知もしない。非実行はmarker書込み等oracleで検証し、通知だけで合格にしない。実機SafariやCORP別配信先は初回必須に追加しない。browserが隔離失敗を読める段階で一度原因通知し、service-worker再読込待ちを成功としない。資産URLのhost通信はguest network許可ではない。

## C6 — Candidate-bound Quality Evidence

```typescript
interface CandidateIdentity {
  candidateId: string;
  version: string;
  sourceCommit: string;
  tarballSha256: string;
  core: { sourceCommit: string; dirty: false; buildInfoSha256: string };
  firstPartyJs: readonly { path: string; sha256: string }[];
  exclusions: readonly { path: string; reason: string }[];
}
interface CheckEvidence {
  checkId: string;
  candidateId: string;
  tarballSha256: string;
  command: string;
  environment: string;
  status: 'passed' | 'failed' | 'unverified';
  exitCode: number | null;
  termination: 'exit' | 'init-failure' | 'execution-failure' | 'timeout' | 'aborted' | 'not-run';
  stdoutArtifact: string | null;
  stderrArtifact: string | null;
  artifactDigests: Readonly<Record<string, string>>;
  guestBuilds: readonly { tool: string; ref: string; sourceCommit: string; sha256: string }[];
  browser: string | null;
  terrarium: { baselineCommit: string; integrationCommit: string; diffSha256: string; installedVersion: string } | null;
  unverified: readonly string[];
}
interface CoverageEvidence {
  candidateId: string;
  tarballSha256: string;
  inventorySha256: string;
  files: readonly { path: string; totalLines: number; coveredLines: number; realms: readonly string[]; collection: 'measured' | 'not-executed' | 'missing' }[];
  reportArtifact: string;
  commands: readonly string[];
}
interface ReleaseEvidence {
  schemaVersion: 1;
  evidenceId: string;
  candidate: CandidateIdentity;
  checks: readonly CheckEvidence[];
  coverage: CoverageEvidence | null;
  rcAdoption?: StableRcAdoption;
}
interface StableRcAdoption {
  rc: {
    evidenceId: string;
    evidenceSha256: string;
    candidateId: string;
    version: '0.1.0-rc.1';
    tarballSha256: string;
    publishedPackage: { version: '0.1.0-rc.1'; tarballSha256: string; registryIntegrity: string };
    requiredAcceptanceCheckIds: readonly string[];
  };
  stable: { candidateId: string; version: '0.1.0'; tarballSha256: string };
  diff: { artifact: string; sha256: string; validationCheckIds: readonly string[] };
  status: 'passed' | 'failed' | 'unverified';
}
```

U4はspecとReleaseEvidenceを所有し、各Unitは観測結果を生成する。candidateId/tarball/core/guest/terrariumの不一致、欠落artifact、digest不一致はfailed/unverifiedでありpassを推測しない。秘密値をcommandsやraw artifactsに保存しない。秘密を含まない受入れfixtureを使い、公開用証拠を確認する。

ReleaseEvidenceは保存済みの証拠集約envelopeで、evidenceIdを記録全体の一意IDとする。checksとcoverageを同じcandidateへまとめ、C7のevidenceIdsはこのenvelopeのevidenceIdだけを参照する。CheckEvidence.checkIdはチェック種別の識別子でありevidenceIdsの参照先ではない。同じenvelope内でcheckIdは一意。再実行結果は新しいevidenceIdのenvelopeに記録し、古い記録を上書きしない。coverageは独立した不明IDを持たせず、このenvelopeのcoverageとして識別する。nullは未収集でありcoverage成功ではない。

全checksとcoverageのcandidateId/tarballSha256はenvelope.candidateと一致させる。保存先のindexはevidenceIdからenvelope artifactの場所とsha256を対応させ、読取時にdigestを検査する。ID不明、重複ID、記録欠落、破損、candidate/内容不一致は判定をblockedにする。複数envelopeを参照する場合も同じ候補へ限定し、同じcheckIdの最新合格だけを選んで矛盾する失敗を隠さない。どの実行を採用したかと再実行理由を明示し、必須checkのfailed/unverifiedやcoverage欠落が未解消ならpassにしない。required check一覧と版/候補への対応はU4の判定条件として事前固定する。

ここで同一候補に限定するのは直接checks/coverageとC7.evidenceIdsで採用するenvelopeである。stable候補から異なるRC候補の履歴を参照する唯一の経路をrcAdoptionとし、元のRC envelopeを転記・改版・再ラベルしない。rcAdoptionはstable版envelopeだけに置ける。rc側は公開済みRCの実terrarium受入れを保存したenvelopeをevidenceId/digestで参照し、そのcandidate/version/tarballと実際に導入した公開npmの内容を照合する。単なるローカルpack、別RC、未公開版の結果はRC受入れへ採用しない。参照先RC envelopeはrcAdoptionを持たず、参照循環/再帰的採用を許可しない。

requiredAcceptanceCheckIdsはU4が事前固定したFR7/FR5の実terrarium受入れ・browser/iframe対象の一覧と一致させ、任意の成功checkだけを選ばない。全checkが参照先RC envelopeに一意に存在しpassed、terrarium.installedVersionが0.1.0-rc.1、基準commit/実導入差分・guestref/browser/出力artifactが揃うことを検査する。RC envelopeのchecks/coverageはRC candidateへ結合されたままとする。

stable側のcandidateId/version/tarballはrcAdoptionを含むenvelope.candidateと一致する。diff artifactはRC候補とstable候補のsource、pack内容、core、第一者JS、型/資産/noticesと関連するU2/U3連携差分を比較し、両identityと変更/不変一覧・必要な再検証を記録する。validationCheckIdsはこのstable envelope内のcheckIdを参照し、固定された差分検証条件の全件をpassedで満たす。名前だけの版差分でも、pack/型/最小consumer等の必要チェックを省略しない。変更がある経路はその候補で再検証し、RCの実結果を変更後の成功証拠として流用しない。stableの直接coverageと全必須NFR検証はstable候補に結合する。

diff/RC envelopeのdigest・identity・公開済み版の一致、必須RC受入れとstable差分検証を観測してからrcAdoption.status=passedを記録する。statusの文字列だけでは条件達成としない。未知ID、別RC/candidate、破損、必須checkのfailed/unverified/欠落、未検証差分、公開物との不一致はfailed/unverifiedとしてstable判定をblockedにする。これによりRC受入れの履歴とstableの直接検証を別identityのまま結合する。

coverage対象は固定された第一者配布JS全体。未変更runtimeも含め、未importは分母に残す。not-executedは0、missingは必須失敗/未検証であり、realm未収集が残る間はcoverage gateをpassにしない。Node/Worker/browserの実行line unionを同じsource path/lineへmergeし、重複して分母を足さない。threshold80%を固定し、達成のためにexclusionsを変えない。第三者/生成blink/wasm/guest/types/test/demo専用は理由付き除外と別検証。収集方式・source mapはNFR Designで実試験により選び、まだ動くと主張しない。

US5.1とUS6.4の記録はnative stdout基準、別stdout/stderr byte fixture、browser/iframe互換性、指定上限、未検証を区別する。公開済みRCの実terrarium記録はinstalledVersionと差分を必須にし、ローカルpack記録を代用しない。CIのintegration判定はその候補の必須checksと固定coverageを満たすことが必要。コア/guest同一性を確認し変更のないaubeは再buildしない。

## C7 — Approval and Release Decision

```typescript
interface ReleaseApproval {
  approvalId: string;
  humanInput: string;
  operation: 'create-public-repository' | 'push-public-source' | 'publish-rc' | 'publish-stable';
  target: string;
  candidateId: string;
  version: string | null;
  sourceCommit: string;
  approvedAt: string;
}
interface ReleaseDecision {
  schemaVersion: 1;
  decisionId: string;
  candidateId: string;
  approvalIds: readonly string[];
  evidenceIds: readonly string[];
  version: '0.1.0-rc.1' | '0.1.0';
  tag: string;
  distTag: 'next' | 'latest';
  channel: 'rc' | 'stable';
  allowed: boolean;
  missing: readonly string[];
  outcome: 'not-run' | 'blocked' | 'published' | 'failed';
}
```

repository作成/push承認は対象source/history/除外一覧とcommitへbindする。版/操作承認はcandidate/内容/公開先へbindし、同じ版でも候補が変われば古い承認を流用しない。stage設計承認を外部操作承認としない。tagはv0.1.0-rc.1/v0.1.0、package.versionとReleaseDecision.versionの対応を検査。RCはnext、stableはlatest、GitHub Releaseは同じtag/内容へ対応させる。

ReleaseDecision.evidenceIdsの各値はC6 ReleaseEvidence.evidenceIdへ解決する。checkId・coverage reportのpath・candidateIdを代わりに入れない。全参照をindex/digestで解決し、envelopeのcandidate.candidateIdがdecision.candidateId、versionがdecision.version、tarball/content identityが判定対象候補と一致することを検査する。未解決ID、ID重複、不一致、必須証拠欠落はallowed=false/outcome=blockedとし、missingに具体的なID/条件を記録する。coverageは解決したenvelopeのcoverageを固定一覧と照合する。実装時には未知evidenceId・checkIdの誤指定・別候補・coverage=null・digest破損の拒否fixtureを作り、正しい保存/参照の成功fixtureとともに検証する。

stableのevidenceIdsにはstable候補の直接envelopeだけを指定し、公開済みRCの受入れenvelopeを混ぜない。少なくとも一つの直接envelopeにC6の検査を満たすrcAdoptionが必要。そこからrc.evidenceId/evidenceSha256を解決してRC履歴を検証し、採用したRCとstable差分のidentityをdecisionの根拠として記録する。直接の同一candidate/version規則はこの明示的な履歴参照には適用せず、rcは0.1.0-rc.1、stableは0.1.0という各固有identityを検査する。RCの承認・coverage・公開前checkをstableの直接条件へ代用しない。RC公開の判定はrcAdoptionを要求しない。

後続の判定fixtureは、(a)実公開RC受入れenvelope＋そのdigest＋同じstable候補のpassed差分検証が揃う成功、(b)RC envelopeをstable.evidenceIdsへ直接入れた拒否、(c)未知/別RC・改変digest・公開tarball不一致、(d)差分未実施/必須check欠落/失敗、(e)RC結果のstableへの再ラベル拒否、(f)RC公開時はstable採用記録を不要とする条件を含める。これは契約・検証計画であり実判定成功は未検証。

RC必須：具体的な版/操作承認、pack/資産/型/最小Node/browser consumer、公開対象/供給物/信頼経路の公開前checks。公開済みRCの実terrarium受入れはRC公開時の必須ではない。stable必須：公開前checksに加え公開済みRCの実terrarium受入れ、全必須NFR、stable候補差分の必要検証、stableの具体的な版/操作承認。候補不一致やfailed/unverified/missing必須checkがあればallowed=false。

公開元/タグ/権限/Trusted Publisher対応を実設定と公式仕様で照合してから実経路を有効にする。未信頼変更・必須check失敗から公開jobへ入れない。npm長期tokenに依存しない。具体workflow/認証はInfrastructure/CI/Deployment stagesで実装・検証し、ここでは設定済みと主張しない。模擬結果と実npm/GitHub結果を分け、公開失敗は追加公開を止め、既知の版を案内する。既存版を上書き/削除しない。再試行は実配布先の版/内容を照合し、人間の同一承認の対象と一致する場合だけ具体的に判断する。暗黙publish retryなし。

## C8 — Internal Worker Protocol

```typescript
type WorkerRequest = {
  protocolVersion: 1; type: 'run'; sessionId: string; runId: string; generation: number;
  assets: Assets; guest: Uint8Array; args: readonly string[];
  env: Readonly<Record<string, string>>; cwd: string; home: string;
  entries: readonly FsEntry[]; snapshotRoots: readonly string[];
};
type WorkerMessage =
  | { protocolVersion: 1; type: 'output'; sessionId: string; runId: string; generation: number; chunk: OutputChunk }
  | { protocolVersion: 1; type: 'done'; sessionId: string; runId: string; generation: number; result: RunResult; snapshot: readonly FsEntry[] }
  | { protocolVersion: 1; type: 'error'; sessionId: string; runId: string; generation: number; code: ErrorCode; message: string; stdout: Uint8Array; stderr: Uint8Array };
```

hostは受付時コピーをWorkerへstructured cloneする。consumer所有bufferをtransferしてdetachしない。same session/run/generationかつprotocolVersion一致だけを受け取り、古い/duplicate終端を無視する。sequenceの逆転/未知type/形状不正はEXECUTIONとして終了しcommitしない。doneは全output flush後に送信し、hostはsnapshotを検査してからcommit/resolveする。errorは安全なcode/message/partial bytesのみ、env/任意cause stackを送らない。hostがtimeout/abortを決め、CPU-bound workerがcancel messageを処理できることに依存せずterminateする。Worker error/messageerrorや終了通知欠落を検出し、期限までにsettleする。core初期化adapterとdelete Atomics.waitAsyncの処理はU1の既存境界へ閉じる。

## Contract Ownership Rules

U1はC1/C2/C8、U2はC3、U3はC4/C5、U4はC6/C7を所有する。変更提案はproviderと全consumerの対応を確認してから契約・型・fixtureを一緒に更新する。内部schemaVersion/protocolVersionは1。未知optional fieldsはconsumerが無視できるよう設計し、required field/type/enum意味/終了規則の変更はbreakingとして扱う。未知message type/protocol majorは黙って実行しない。

public npmはRC中でも承認済みcandidateの契約を固定し、破壊的変更は新しい候補版とconsumer移行・再受入れを必要とする。stable0.xのminorでbreakingを導入する場合も人間の範囲承認・文書・互換性試験が必要で、patchで既存fieldsを削除しない。U3の既存public fieldsは本intentで破壊しない。公開した版の上書き/削除をversioningとして使わない。

## Trade-offs and Decision Rationale

| 判断 | 採用案 | 比較案と不採用理由 | 含意 |
|---|---|---|---|
| 出力 | bytes正本、terrariumはstream順序を保つ両方表示、native比較別 | textだけでは非UTF-8を失う、stdout-only UIはQ1互換性を壊す | callback/decoderと結果の二重表示を防ぐ |
| 同時実行 | session内BUSY拒否、U3が既存queue | library暗黙queueは中止範囲を曖昧化、同一state並列はcommit競合 | session間独立、明示Promise失敗 |
| commit | 完全な正常exit snapshotのみ原子反映、非0も反映 | timeout途中stateは不完全、非0をrollbackすると通常CLI変更を失う | abnormal時は前state、再実行可能 |
| links | Q2どおりhard-linkとsymlinkの状態保持 | 全fileコピーはリンク変更意味を失う、全host FS共有は範囲外 | inodeIdはsession内、公開path境界検証 |
| 配布 | 同梱共通core + U2 ref guest、explicit assets | guest同梱はFR1.3違反、repo外相対は空consumer不可 | digest/URL/隔離の検証が必要 |

これらは既承認要件と[Q1][Q2]を満たす技術契約案であり、新しい常駐サービス・shell・性能SLOを追加しない。

## Open Questions

| Contract | Question | Blocks |
|---|---|---|
| None | 未回答の契約方針はなし。実装成功は未検証 | None |

## Assumptions & Open Questions

Functional Designは契約に従うmodule配置・full schema・snapshot実装・互換fixtureを定義する。NFR Designはcoverage収集方式を実試験で選び、Infrastructure/Deploymentは実権限と公式公開仕様を照合する。これらは本契約の観測可能な意味を変更する許可ではない。API/pack/Worker/hard-link/iframe/CI/publicationはまだ未実装・未検証。Q1による上流説明の訂正はこの契約とQ&Aに保持し、凍結された承認済み上流ファイルを無断変更しない。
