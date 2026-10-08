# Functional Design Questions — u1-runtime-package

## Sources

承認済みrequirements.md、unit-of-work.md、unit-of-work-story-map.md、components.md、contract-summary.md C1/C2/C8と全工程の回答済み質問を参照した。回答方法は既存のGuide meを維持する。公開API、出力callback例外、hard-link、正常非0終了のcommit、timeout/abortのrollback、資産配置の既定方針は再質問しない。実装・動作は未検証。

## Design Plan

共通状態モデル、run/Workerの状態遷移、入力検証と原子的snapshot、公開入口と配布ファイル一覧を設計する。U1の9ストーリーを受入条件へ対応させる。製品コードは本工程では生成しない。

## Q1 — Initial Entries with Missing Parent Directories

初期ファイルとして `/work/project/config.json` だけを渡し、親の `/work/project` を指定しなかった場合の扱いは、既存契約で未指定である。cwd/home自体を作成する規則は確定済み。この質問はそれ以外の不足する親ディレクトリに限る。

A. 不足する親ディレクトリを自動作成する（推奨）。初期入力を簡潔にし、自動作成時のmodeは0755とする。明示した親のmodeは保持し、親がfile/symlinkならINVALID_INPUTで全体を拒否する。
B. 親ディレクトリの明示を必須にする。cwd/home以外の親が不足した入力はINVALID_INPUTで全体を拒否する。
X. Other (please specify)

[Answer]: 不足する親を自動作成。人間の原文：1
