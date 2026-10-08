# Infrastructure Design Questions — u1-runtime-package

## Sources and Existing Decisions

Guide meを継続。npm libraryとGitHub Actions検証、U4所有のTrusted Publishing、ローカルpack先行、main逐次試験、公開操作の別承認は決定済み。新cloud/常駐サービスを追加しない。

## Questions

None. 未回答の製品判断なし。CI実権限・remote・実配布は未検証で、本stageの完了はそれらの成功を意味しない。

## Ambiguity Analysis

NFR Designのcleanup予算所見は未解消として実装計画へ渡す。840秒の外側上限を変更して解消しない。U1はローカル候補と検証を提供、U4が統合前CI/公開認証/全体判定を所有する。
