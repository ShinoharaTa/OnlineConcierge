# 篠川 Nostr Bot

フィルタ・アクションパターンを使用した疎結合なNostr Botシステム

## 🚀 クイックスタート

### 環境設定

1. **環境変数設定** (`.env`ファイル作成)
```env
# 必須
HEX=your_main_bot_private_key

# オプション（Bot機能拡張用）
OJI_HEX=your_ojisan_bot_private_key
PASSPORT_HEX=your_passport_bot_private_key
PASSPORT_TARGET_NPUB=target_user_npub  # デフォルト値あり
OPENAI_API_KEY=your_openai_api_key
```

2. **依存関係インストール**
```bash
npm install
```

### 実行方法

```bash
# 本番実行
npm start

# 開発・テスト（投稿無効化）
npm run dev

# 機能テスト
npm test
```

## 🤖 Bot機能一覧と使い方

### 1. SalmonBot 🐟
**常時有効** - 環境変数不要

- **使い方**: Nostr上で「サモン！」で始まる投稿をする
- **応答**: Botが「サーモン！」で返信
- **例**:
  ```
  ユーザー: サモン！
  Bot: サーモン！
  ```

### 2. CalendarBot 📅
**常時有効** - 環境変数不要

- **使い方**: Botにメンション + 「予定 [内容]」で投稿
- **機能**: Googleカレンダー登録用URLを自動生成
- **例**:
  ```
  ユーザー: @bot 予定 明日の会議
  Bot: 📅 カレンダー登録用URLを作成しました！
       📝 タイトル: 明日の会議
       ⏰ 日時: 2024/01/15 14:00:00
       🔗 下のリンクをクリックしてカレンダーに追加してください：
       https://www.google.com/calendar/render?action=TEMPLATE&...
  ```

### 3. OjisanBot 👴
**オプション** - `OJI_HEX`環境変数が必要

- **動作条件**: 
  - 環境変数`OJI_HEX`が設定されている場合のみ有効
  - 6%の確率で自動反応
  - 10文字以上の投稿に対して反応
- **機能**: おじさん構文で返信
- **有効化**: `.env`ファイルに`OJI_HEX=your_private_key`を追加

### 4. PassportBot 🎫
**オプション** - `PASSPORT_HEX`環境変数が必要

- **機能**: 定期的にパスポートメッセージを送信
- **設定可能な環境変数**:
  - `PASSPORT_HEX`: パスポート送信用の秘密鍵（必須）
  - `PASSPORT_TARGET_NPUB`: 送信先のnpub（オプション、デフォルト値あり）
- **スケジュール**: 毎日午前1時（現在は無効化中）

## 🎮 運用中のBot管理

### Bot状態確認・制御コマンド

Botにメンションして以下のコマンドを送信：

```bash
# Bot一覧と状態確認
!bots

# 特定のBotを有効化
!enable BotName

# 特定のBotを無効化  
!disable BotName
```

**使用例**:
```
ユーザー: @bot !bots
Bot: Bot状態:
     SalmonBot: 有効
     CalendarBot: 有効
     OjisanBot: 無効
     PassportBot: 有効

ユーザー: @bot !enable OjisanBot
Bot: OjisanBotを有効にしました

ユーザー: @bot !disable SalmonBot
Bot: SalmonBotを無効にしました
```

### Bot管理可能な名前一覧
- `SalmonBot`: サーモン応答Bot
- `CalendarBot`: カレンダーURL生成Bot
- `OjisanBot`: おじさん構文Bot（環境変数必要）

## 🔧 運用時の注意事項

### 環境変数による機能制御
- **SalmonBot・CalendarBot**: 常に有効（環境変数不要）
- **OjisanBot**: `OJI_HEX`がある場合のみ登録・有効化可能
- **PassportBot**: `PASSPORT_HEX`がある場合のみ機能が有効

### ログで確認できる情報
```
OjisanBot registered and enabled           # 環境変数ありで有効
OjisanBot registered but disabled (OJI_HEX not found)  # 環境変数なし
Passport feature configured                # パスポート機能有効
Passport feature disabled (PASSPORT_HEX not found)     # パスポート機能無効
```

### 自動再起動
- 30分間隔でプロセスが自動再起動
- Bot状態は再起動時にリセットされ、環境変数設定に基づいて初期化

## 🏗️ アーキテクチャ

### コアシステム (`src/core/`)
- **NostrClient**: Nostr接続・イベント管理
- **BotHandler**: フィルタ・アクションインターフェース  
- **BotManager**: Bot管理・イベント振り分け

### 個別Bot機能 (`src/bots/`)
- 各Bot機能が独立したモジュール
- フィルタとアクションの組み合わせで動作
- 各Botが独自の環境変数を管理

### テストシステム (`src/test/`)
- 模擬イベントによる機能テスト
- テストモードでの安全な開発

## 🔧 開発

### 新しいBot追加
```typescript
// 新しいBotを作成
export function createCustomBot(): BotHandler {
  return {
    name: "CustomBot",
    filter: new RegexFilter(/^カスタム/),
    action: new TextReplyAction("カスタム応答"),
    enabled: true,
  };
}
```

### テスト実行
```bash
npm test                # 全機能テスト
npm run test:salmon     # 個別テスト
```

## 📚 ドキュメント

- [詳細ドキュメント](./DOCUMENTATION.md)
- [アーキテクチャ設計](./REFACTORED_ARCHITECTURE.md)  
- [テストガイド](./TEST_GUIDE.md)

## 🔗 関連リンク

- [Nostr Protocol](https://nostr.com/)
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools)

---

**注意**: 本番運用前にテストモードで動作確認を行ってください。