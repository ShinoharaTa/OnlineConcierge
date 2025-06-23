# 篠川 Nostr Bot

フィルタ・アクションパターンを使用した疎結合なNostr Botシステム

## 🚀 クイックスタート

### 環境設定

1. **環境変数設定** (`.env`ファイル作成)
```env
# 必須
HEX=your_main_bot_private_key

# オプション
OJI_HEX=your_ojisan_bot_private_key
PASSPORT_HEX=your_passport_bot_private_key
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

## 🤖 Bot機能一覧

### 1. SalmonBot
- **トリガー**: 「サモン！」で始まる投稿
- **応答**: 「サーモン！」

### 2. CalendarBot  
- **トリガー**: Bot宛メンション + 「予定 [内容]」
- **機能**: AI解析 → Google Calendarテンプレート URL生成

### 3. OjisanBot（オプション）
- **トリガー**: 確率的（6%）
- **機能**: AI生成おじさん構文で返信

### 4. PassportBot（オプション）
- **機能**: 定期パスポートメッセージ送信

## 🏗️ アーキテクチャ

### コアシステム (`src/core/`)
- **NostrClient**: Nostr接続・イベント管理
- **BotHandler**: フィルタ・アクションインターフェース  
- **BotManager**: Bot管理・イベント振り分け

### 個別Bot機能 (`src/bots/`)
- 各Bot機能が独立したモジュール
- フィルタとアクションの組み合わせで動作

### テストシステム (`src/test/`)
- 模擬イベントによる機能テスト
- テストモードでの安全な開発

## 📝 Bot管理

実行時にBotをメンション制御：
```
!bots              # Bot状態表示
!enable BotName    # Bot有効化
!disable BotName   # Bot無効化
```

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