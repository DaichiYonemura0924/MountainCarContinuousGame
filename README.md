# MountainCarContinuous Browser Game

Pythonで実装したMountainCarContinuousと同じ状態更新式を、
ブラウザ上で遊べるゲームとして再実装した静的Webサイトです。

サーバー側のプログラムは不要です。
GitHub Pagesへ公開すれば、URLを開くだけでPC・スマートフォンから遊べます。

## Directory Structure

```text
mountain-car-continuous-game/
├── index.html
├── style.css
├── game.js
├── README.md
└── .gitignore
```

## 操作方法

- スライダー：エンジン出力を `-1.0` から `1.0` の範囲で連続指定
- `-1.0` ボタン：最大出力で左へ進む
- `0.0` ボタン：エンジン出力を0にする
- `+1.0` ボタン：最大出力で右へ進む
- Reset：ゲームを最初からやり直す
- キーボード補助操作
  - `←`：-1.0
  - `→`：+1.0
  - `Space`：0.0
  - `R`：リセット

初期状態では「操作を離したとき自動で0に戻す」が有効です。
チェックを外すと、スライダーで指定した出力を維持します。

## 物理式

`game.js`では、次の順序で状態を更新しています。

```text
velocity += action * power - cos(3 * position) * gravity
velocity = clip(velocity, -max_speed, max_speed)

position += velocity
position = clip(position, min_position, max_position)

if position <= min_position and velocity < 0:
    velocity = 0
```

主要パラメータは `game.js` 冒頭の `CONFIG` にあります。

```javascript
const CONFIG = Object.freeze({
  minPosition: -1.2,
  maxPosition: 0.6,
  maxSpeed: 0.07,
  goalPosition: 0.45,
  power: 0.0015,
  gravity: 0.0025,
});
```

Python版の設定値が異なる場合は、ここを変更してください。

## PCでの動作確認

プロジェクトディレクトリへ移動します。

```bash
cd mountain-car-continuous-game
```

Pythonの簡易Webサーバーを起動します。

```bash
python3 -m http.server 8000
```

ブラウザで次を開きます。

```text
http://localhost:8000
```

サーバーを停止するときは、コマンドを実行したターミナルで
`Ctrl+C` を押します。

## GitHubへPushする

GitHub上で空のリポジトリを作成してから、次を実行します。

```bash
cd mountain-car-continuous-game

git init
git add .
git commit -m "Create MountainCarContinuous browser game"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

`USERNAME`と`REPOSITORY`は、自分のGitHubユーザー名と
作成したリポジトリ名に置き換えてください。

## GitHub Pagesで公開する

GitHubのリポジトリ画面で次を選択します。

```text
Settings
→ Pages
→ Build and deployment
→ Source: Deploy from a branch
→ Branch: main
→ Folder: / (root)
→ Save
```

公開URLは通常、次の形式になります。

```text
https://USERNAME.github.io/REPOSITORY/
```

## ファイルの役割

### index.html

ゲーム画面、操作スライダー、ボタン、状態表示を定義します。

### style.css

画面レイアウト、配色、スマートフォン表示を定義します。

### game.js

以下を担当します。

- MountainCarContinuousの状態更新
- Canvasへの山・車・ゴール描画
- スライダー入力
- ゴール判定
- リセット処理
- PCとスマートフォンの操作

## Python版と結果を厳密に一致させる場合

次の項目をPython版と照合してください。

- `min_position`
- `max_position`
- `max_speed`
- `goal_position`
- `power`
- `gravity`
- 初期位置の範囲
- 最大ステップ数
- 終了条件
- 状態更新順序

JavaScriptの数値型は64-bit浮動小数点数です。
Python版で状態を`float32`へ明示的に丸めている場合、
長時間の軌道では微小な差が生じる可能性があります。
