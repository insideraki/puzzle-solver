# 引き継ぎ資料 v7

## プロジェクト概要
パズル&サバイバルの英雄特技（チェス配置）を最適化するWebツール
- 完全無料公開・広告収入目的
- Vercel（フロントエンド）のみで完結（バックエンド不要）
- 4言語対応（日本語・英語・中国語・ロシア語）

## 公開URL
- フロントエンド：https://puzzle-solver-bice.vercel.app

## GitHubリポジトリ
- フロントエンド：insideraki/puzzle-solver（Public）
- バックエンド：insideraki/puzzle-solver-api（Private）
- クローン先：C:\Users\AP100\Documents\GitHub\

## 技術スタック
- フロントエンド：React + Vite（Vercel）
- ソルバー：solver_final.c → Emscriptenでコンパイル → solver.js + solver.wasm
- Web Worker（public/solver.worker.js）でWASM実行（UIブロックなし）
- DB：なし

## ファイル構成
```
puzzle-solver/
  public/
    solver.js          ← WASMグルーコード
    solver.wasm        ← コンパイル済みソルバー（現在：旧版=count_pats_exact版）
    solver.worker.js   ← Web Worker
  src/
    App.jsx
    App.css
    main.jsx
puzzle-solver-api/
  solver_final.c       ← Cソルバーソース
```

## WASMコンパイル手順（AP100のPC・Docker必須）
```
cd C:\Users\AP100\Documents\GitHub\puzzle-solver-api
docker run --rm -v "C:/Users/AP100/Documents/GitHub/puzzle-solver-api":/src emscripten/emsdk emcc solver_final.c -O3 -s WASM=1 -s EXPORTED_FUNCTIONS="['_run_solve','_setup_unit','_set_log_callback','_malloc','_free']" -s EXPORTED_RUNTIME_METHODS="['ccall','cwrap','addFunction','removeFunction','setValue','getValue']" -s ALLOW_TABLE_GROWTH=1 -o solver.js
```
コンパイル後：solver.js と solver.wasm を puzzle-solver/public/ にコピー→GitHub Desktopでpush

## Claude Code起動手順
```
cd C:\Users\AP100\Documents\GitHub\puzzle-solver
claude
```

## デプロイフロー
GitHub Desktop → Commit to main → Push origin → Vercel自動デプロイ

---

## ゲームルール
- 7列×5行 = 35マス、駒の色：緑・青・紫・金・赤の5色
- 兵種：ファイター・シューター・ライダー
- 20パターン定義（横3・縦3・横4・縦4）
- 色の対応：赤=0, 青=1, 緑=2, 紫=3, 黄(金)=4
- WASM hand配列の順：(red, blue, green, purple, gold)

## 兵種設定
```
fighter: best4=[12,17], yp4=[14,19,15,20], rest4=[11,16,13,18], self=F, ally=S
shooter: best4=[11,16], yp4=[14,19,15,20], rest4=[12,17,13,18], self=S, ally=R
rider:   best4=[13,18], yp4=[14,19,15,20], rest4=[12,17,11,16], self=R, ally=F
```

## バフデータ（power値：1-10=2000, 11-20=5000）
```
1:S/HP/10, 2:F/HP/10, 3:R/HP/10, 4:部隊/DEF/5, 5:部隊/HP/5
6:S/DEF/10, 7:F/DEF/10, 8:R/DEF/10, 9:部隊/DEF/5, 10:部隊/HP/5
11:S/ATK/20, 12:F/ATK/20, 13:R/ATK/20, 14:部隊/DEF/20, 15:部隊/HP/20
16:S/ATK/20, 17:F/ATK/20, 18:R/ATK/20, 19:部隊/DEF/20, 20:部隊/HP/20
```

---

## 現在の動作状況（v7時点）
- WASMによるブラウザ内計算：正常
- Web Worker化：完了（計算中止ボタンあり）
- 常に2フィールド計算：有効
- 兵種選択UI（ファイター/シューター/ライダー/戦力重視）：正常
- ログ表示：ボックス内リアルタイム表示
- チェス使用数・残り数表示：正常
- バフ表示・シェアボタン・言語切替：正常

## ベンチマーク基準値
- 条件：AP100のPCブラウザ・各色5個・戦力重視モード
- 現在の基準：約2分（旧ソルバー＋Web Worker版）
- 計測はAP100のPCで行う

---

## Cソルバー高速化の経緯と方針

### 試したこと・結果
1. **インクリメンタルパターン検出**：実装したが逆に遅くなった（4分台）
   - 原因：place_update/remove_updateが全ノードで実行されるオーバーヘッドが
     count_pats_exact削減効果を上回った
   - 旧版のcount_pats_exactはベスト更新候補のときだけ呼ばれる（枝刈りで大幅削減）
   - インクリメンタル版はピース設置/除去のたびに毎回実行される

2. **色対称正規化**：インクリメンタル版と同時に試したため切り分けできず
   - 青・赤・緑は多くのパターンで対称（入れ替えても戦力値同じ）
   - 探索前に正規化（青≥赤≥緑）→探索空間を最大1/6削減
   - 結果フィールドを逆変換
   - 単体での効果は未検証

### 次の高速化アプローチ（未実装）
**方針：旧版ソルバー（count_pats_exact版）をベースに改善する**

候補1：**色対称正規化のみ**を旧版に追加して効果を検証
- インクリメンタルなしで色対称だけ試す
- 実装はrun_solve()内で数行追加するだけ

候補2：**count_pats_exact()のビットマスク高速化**
- 現在：全35マスをスキャン（重い）
- 改善：配置済みセルのビットマスクで判定（高速）
- 難易度高め

候補3：**枝刈りの強化**
- 残り駒数から達成可能なパターン数の上界を計算
- 現在より早く枝刈りできる可能性

### 色対称の詳細
- P1-3, P6-8, P11-20：青・赤・緑の3色入れ替え可能
- P4-5, P9-10：青と赤のみ入れ替え可能
- 紫・金は入れ替え不可

---

## 未実装リスト（優先度順）

### (A) Cソルバー高速化【AP100のPCで作業】
次のステップ：色対称正規化のみを旧版solver_final.cに追加してコンパイル→ベンチマーク
旧版solver_final.c（count_pats_exact版）はGitHubのcad3bb3コミット時点のもの

### (B) F1/F2配分の改善
- 意味のある境界値：0個, 4個（4連1個）, 7個（L字2個）, 8個（4連2個）
- F1/F2への各色配分候補を境界値で列挙
- F1×F2の全兵種組み合わせ（最大9通り）を試す
- solver.worker.jsのオーケストレーション層で実装
- ※Cソルバー高速化後に実装

### (C) 広告実装
- Google AdSenseで始める
- ad-spaceクラスのプレースホルダーあり

### (D) スマホ用テンキー入力
- 色アイコンタップ→テンキーポップアップ→確定で閉じる

### (E) 兵種選択削除＋常時3兵種計算＋カルーセル
- ※Cソルバー高速化後に実装

---

## 数量別加工費掛け率（板金見積もり用）
1個=1.60, 2個=1.50, 3個=1.30, 4個=1.10, 5個=1.00,
10個=0.80, 20個=0.64, 30個=0.59, 50個=0.51, 75個=0.47, 100個=0.43
