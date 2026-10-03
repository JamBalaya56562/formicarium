# User Stories Plan and Questions

## Sources

- [memory:M1] 承認済み requirements-analysis/requirements.md：利用者、FR/NFR、範囲と公開順序。
- [memory:M2] 承認済み practices-discovery/team-practices.md：最小tarball先行、test-after、品質条件。

## Story Plan

- Persona：JS API利用者、terrarium利用者・保守者、リリース担当の3役割。根拠は要件書のIntent Analysis。架空の顧客調査・人数・利用頻度を事実として追加しない。
- Format：USx.yとACx.y.zの固定ID、利用者・目的・価値、Given/When/Thenの正常系/失敗系。INVESTで依存関係と分割を確認する。
- Priority：承認済みFRはすべて初回Must。最小tarball先行は実装順序であり、残りのMustを省くMVP判断ではない。MVP境界はDelivery Planningで正式に定める。
- Granularity：導入、実行結果、失敗、中止、ファイル継続/分離、既存入口、埋込み、ref配布、品質証拠、公開対象、RC/stable/公開経路の利用シナリオごとに分割する案。件数は分割時に確定する。
- Scope：承認済みFR/NFRの具体化に限定する。外部公開は後続の具体的な承認まで実施しない。

## Q1 ストーリーの整理方法

3役割を保ち、どの軸で整理しますか？

A. 利用手順ごと（推奨）：導入→実行→terrarium→公開の順に、個別に検証できる粒度へ分ける。
B. 要件の機能群ごと：FR1–FR10を中心に整理し、各機能群の中で利用者と受入れ基準を分ける。
X. Other (please specify)

[Answer]: A. 利用手順ごと（推奨）
