# 引き継ぎ資料 v6（Claude Code対応版）

## プロジェクト概要
パズル&サバイバルの英雄特技（チェス配置）を最適化するWebツール
- 完全無料公開・広告収入目的
- Vercel（フロントエンド）のみで完結（バックエンド不要）
- 4言語対応（日本語・英語・中国語・ロシア語）

## 公開URL
- フロントエンド：https://puzzle-solver-bice.vercel.app
- バックエンドAPI：https://puzzle-solver-api.onrender.com（※WASM化により不要。様子を見て退会）

## GitHubリポジトリ
- フロントエンド：insideraki/puzzle-solver（Public）
- バックエンド：insideraki/puzzle-solver-api（Private）
- クローン先：C:\Users\AP100\Documents\GitHub\（AP100のPCのみ）

## 技術スタック
- フロントエンド：React + Vite（Vercel）
- ソルバー：solver_final.c → Emscriptenでコンパイル → solver.js + solver.wasm
- ユーザー端末のブラウザ上でWASM直接実行（サーバー負荷ゼロ）
- DB：なし

## ファイル構成
### フロントエンド（puzzle-solver）
```
public/
  solver.js          ← WASMグルーコード
  solver.wasm        ← コンパイル済みソルバー
  solver.worker.js   ← Web Worker（ソルバー実行）
src/
  App.jsx            ← メインコンポーネント
  App.css            ← スタイル
  main.jsx           ← エントリーポイント
index.html
package.json
vite.config.js
```

### バックエンド（puzzle-solver-api）※現在不使用
```
solver_final.c   ← Cソルバーのソース（WASMコンパイル時に使用）
```

## WASMコンパイル手順（AP100のPCのみ・Docker必須）
```
# puzzle-solver-apiフォルダでCMDを開いて実行
cd C:\Users\AP100\Documents\GitHub\puzzle-solver-api
docker run --rm -v %CD%:/src emscripten/emsdk emcc solver_final.c -O3 -s WASM=1 -s EXPORTED_FUNCTIONS="['_run_solve','_setup_unit','_set_log_callback','_malloc','_free']" -s EXPORTED_RUNTIME_METHODS="['ccall','cwrap','addFunction','removeFunction','setValue','getValue']" -s ALLOW_TABLE_GROWTH=1 -o solver.js
```
コンパイル後：solver.js と solver.wasm を puzzle-solver/public/ にコピー→GitHub Desktopでpush

## デプロイフロー
1. ローカルでファイルを編集
2. GitHub Desktopで「Commit to main」→「Push origin」
3. Vercelが自動でビルド・デプロイ（数分）

---

## ゲームルール
- 7列×5行 = 35マス
- 駒の色：緑・青・紫・金・赤の5色
- 兵種：ファイター・シューター・ライダー
- 20パターン定義（横3・縦3・横4・縦4）

## 色の対応関係
- フロントエンド入力：緑・青・紫・金・赤
- C側内部：赤=0, 青=1, 緑=2, 紫=3, 黄(金)=4
- APIリクエスト/WASM hand配列：(red, blue, green, purple, gold)の順

## 兵種設定
```
fighter: best4=[12,17], yp4=[14,19,15,20], rest4=[11,16,13,18], self=F, ally=S
shooter: best4=[11,16], yp4=[14,19,15,20], rest4=[12,17,13,18], self=S, ally=R
rider:   best4=[13,18], yp4=[14,19,15,20], rest4=[12,17,11,16], self=R, ally=F
```

## バフデータ（BUFFS）
```
1:S/HP/10,   2:F/HP/10,   3:R/HP/10,   4:部隊/DEF/5,  5:部隊/HP/5
6:S/DEF/10,  7:F/DEF/10,  8:R/DEF/10,  9:部隊/DEF/5, 10:部隊/HP/5
11:S/ATK/20, 12:F/ATK/20, 13:R/ATK/20, 14:部隊/DEF/20,15:部隊/HP/20
16:S/ATK/20, 17:F/ATK/20, 18:R/ATK/20, 19:部隊/DEF/20,20:部隊/HP/20
（power値：1-10=2000, 11-20=5000）
```

---

## 現在の動作状況（v6時点）
- WASMによるブラウザ内計算：正常
- Web Worker化：完了（UIが固まらない・計算中止ボタンあり）
- 常に2フィールド計算：有効（特技2が組めない場合は特技1のみ表示）
- 兵種選択UI（ファイター/シューター/ライダー/戦力重視）：正常
- ログ表示：ボックス内リアルタイム表示
- チェス使用数・残り数表示：正常
- バフ表示・シェアボタン・言語切替：正常
- ベンチマーク：PCブラウザ・各色5個・戦力重視で3分18秒

---

## 未実装リスト（優先度順）

### (A) Cソルバー＆アルゴリズム再構成【最優先・AP100のPCで作業】
以下を全て実装してからベンチマーク計測する：

1. **インクリメンタルパターン検出**（solver_final.c）
   - count_pats_exact()を廃止
   - ピース設置/除去時にそのセルを含む配置のみ更新
   - solver_final.cの最新版（インクリメンタル版）はすでに作成済み
   - → AP100のPCでDockerコンパイルしてベンチマーク計測するだけ

2. **色対称正規化**（solver_final.c）
   - 青・赤・緑は多くのパターンで対称（入れ替えても戦力値同じ）
   - 探索前に手持ちを正規化（青≥赤≥緑にソート）→探索空間を最大1/6削減
   - 結果フィールドを逆変換して元の色に戻す

3. **境界値ベースのF1/F2配分＋全兵種組み合わせ**（solver.worker.js）
   - 意味のある境界値：0個, 4個（4連1個）, 7個（L字2個）, 8個（4連2個）
   - F1/F2への各色配分候補を境界値で列挙
   - F1×F2の全兵種組み合わせ（最大9通り）を試す
   - 最大合計戦力の配分を採用
   - ※(1)(2)の高速化が完了してから実装（でないと計算時間が現実的でない）

### (B) 広告実装
- Google AdSenseで始める
- 位置：入力エリアとカルーセルの間（現在ad-spaceクラスでプレースホルダーあり）

### (C) スマホ用テンキー入力
- 色アイコンをタップ→テンキーポップアップ表示
- テンキーで数字入力（現在の数字を置き換え）
- 確定ボタンで閉じる
- ✕または背景タップでキャンセル

### (D) 兵種選択削除＋常時3兵種計算＋カルーセル
- 兵種選択ボタンを全削除
- 常にfighter/shooter/riderの3兵種を計算
- 結果をカルーセルで3パターン並べてユーザーが選ぶ
- ※(A)の高速化完了後に実装

---

## Claude Codeでの作業手順

### 初回セットアップ
```
# ターミナルで実行
cd C:\Users\AP100\Documents\GitHub\puzzle-solver
claude
```

### よく使うコマンド（Claude Codeに話しかけるだけ）
- 「solver_final.cを修正して」→ ファイルを直接編集してくれる
- 「App.jsxの○○を変更して」→ 直接編集
- 「変更をコミットしてpushして」→ git操作もやってくれる

### 注意点
- Claude Codeはこのチャットの記憶を持っていない
- この引き継ぎ資料をClaude Codeに読み込ませてから作業開始すること
- 読み込み方：「この引き継ぎ資料を読んで」と言いながらファイルを渡す

---

## 数量別加工費掛け率（板金見積もり用・参考）
1個=1.60, 2個=1.50, 3個=1.30, 4個=1.10, 5個=1.00,
10個=0.80, 20個=0.64, 30個=0.59, 50個=0.51, 75個=0.47, 100個=0.43
