# 篠川Nostr Bot - テストモードガイド

## 📋 概要
このガイドでは、実際のNostrリレーに投稿せずにBot機能をテストする方法を説明します。

## 🧪 テストモードの特徴

### ✅ 安全なテスト
- **投稿しない**: 実際のNostrリレーに投稿されません
- **ログ確認**: すべての送信予定メッセージがコンソールに表示
- **実際の受信**: リレーからの受信は正常に動作

### 🔧 動作原理
```typescript
// テストモード時の送信処理
if (this.config.testMode) {
  console.log("🧪 [TEST MODE] 送信予定メッセージ:");
  console.log(`📝 内容: ${content}`);
  return Promise.resolve(); // 実際は送信しない
}
```

## 🚀 テスト実行方法

### 基本コマンド

```bash
# 新アーキテクチャでテストモード起動
npm run dev

# 旧システムでテストモード起動  
npm run dev:old

# 個別機能テスト（模擬イベント使用）
npm test                 # 全Bot機能テスト
npm run test:salmon      # サモンBotのみ
npm run test:calendar    # カレンダーBotのみ
npm run test:ojisan      # おじさんBotのみ
npm run test:management  # Bot管理機能のみ
```

### 環境変数設定

```bash
# 必須
HEX=your_main_bot_private_key

# オプション（機能テスト用）
OJI_HEX=your_ojisan_bot_private_key
PASSPORT_HEX=your_passport_bot_private_key
OPENAI_API_KEY=your_openai_api_key

# Google Calendar API（カレンダーBot用）
# credentials.json ファイルも必要
```

## 📱 テスト方法

### 1. リアルタイムテスト（受信のみ）
```bash
npm run dev
```
- 実際のNostrリレーに接続
- 投稿の受信は正常動作
- Bot応答は**コンソールログのみ**
- Ctrl+Cで終了

### 2. 模擬イベントテスト
```bash
npm test
```
- 事前定義されたテストケースを実行
- 全ての条件分岐をテスト
- 自動で完了

## 🧪 テスト内容

### SalmonBotテスト
```
📤 テストイベント: "サモン！"
🧪 [TEST MODE] 送信予定メッセージ:
📝 内容: サーモン！
```

### CalendarBotテスト
```
📤 テストイベント: "予定 明日の午後2時から会議"
👤 送信者: test_user_in_sa... (safelist: true)
🧪 [TEST MODE] 送信予定メッセージ:
📝 内容: 登録したで！！

↓追加できなかったとき用
https://www.google.com/calendar/render?action=TEMPLATE&text=会議...
```

### OjisanBotテスト
```
📤 テストイベント 1: "今日はいい天気ですね！お散歩日和です。"
🧪 [TEST MODE] 送信予定メッセージ:
📝 内容: いい天気だねぇ😊✨ お散歩なんて素敵だなぁ〜👍
```

## 🔧 カスタムテスト

### 独自テストケースの追加
```typescript
// src/test/BotTester.ts に追加
async testCustomBot(): Promise<void> {
  TestHelper.logTestStart("CustomBot");
  
  const event = TestHelper.createMockEvent("カスタムテスト");
  await this.manager.handleEvent(event);
  
  TestHelper.logTestEnd("CustomBot");
}
```

### テスト実行
```bash
# TypeScriptコンパイル後
tsc && node dist/testIndex.js
```

## 🚨 注意事項

### ⚠️ Google Calendar API
- テストモードでも**実際のGoogle Calendar APIが呼ばれます**
- カレンダー登録機能は実際に実行される可能性があります
- 必要に応じてGoogle Calendar APIも分離することを推奨

### ⚠️ OpenAI API
- テストモードでも**実際のOpenAI APIが呼ばれます**
- AIレスポンス生成にはコストが発生します
- 頻繁なテストには注意が必要

### ⚠️ 環境変数
- 本番用とテスト用の環境変数を分離することを推奨
- `.env.test` ファイルを使用した環境分離も検討

## 📊 テスト結果の確認

### 正常ケース
```
🧪 [TEST MODE] 送信予定メッセージ:
📝 内容: サーモン！
💬 返信先: test_eve...
👤 宛先: test_pub...
🔑 送信者: bot_pubk...
──────────────────────────────────────────────────
```

### エラーケース
```
Error in bot SalmonBot: [エラー詳細]
```

## 🔄 本番環境への切り替え

### 本番実行
```bash
# test=true を外す
npm run start:new

# または環境変数を明示的に設定
TEST_MODE=false npm run start:new
```

### 設定確認
```bash
# テストモード有効時の表示
🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪
🧪 TEST MODE ENABLED - Nostr投稿は実行されません
🧪 すべての送信はコンソールログとして表示されます
🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪
```

## 📝 トラブルシューティング

### よくある問題

1. **HEX環境変数が設定されていない**
   ```
   ❌ HEX environment variable is required
   ```
   → `.env` ファイルでHEXを設定

2. **Google Calendar認証エラー**
   ```
   Error: credentials.json not found
   ```
   → Google Calendar API認証情報を設定

3. **テストが反応しない**
   → フィルタ条件を確認
   → イベント内容がBot条件に合致しているか確認

## 🎯 推奨ワークフロー

1. **開発中**: `npm run dev` でリアルタイムテスト
2. **機能確認**: `npm test` で全機能テスト
3. **デバッグ**: 個別テストコマンドで問題箇所特定
4. **リリース前**: テストモード無効で最終確認
5. **本番運用**: `npm run start:new` で本番実行 