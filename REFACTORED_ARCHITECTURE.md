# 篠川Nostr Bot - リファクタリング後アーキテクチャ

## 概要
既存のモノリシックなBotを疎結合なアーキテクチャに分離し、フィルタ・アクションパターンを使用した拡張可能なシステムに再設計しました。

## 新しいアーキテクチャ

### 🔧 コアシステム (`src/core/`)

#### NostrClient
Nostr関連の共通機能を管理するクラス
- **接続管理**: リレーへの接続とプール管理
- **イベント送信**: テキストイベントの送信
- **ユーザー情報取得**: プロフィールメタデータの取得
- **返信判定**: 自分への返信かどうかの判定

#### BotHandler インターフェース
各Bot機能を定義するためのインターフェース
- **BotFilter**: イベントが処理対象かどうかを判定
- **BotAction**: マッチしたイベントに対するアクションを実行
- **BotHandler**: フィルタとアクションを組み合わせたBot定義

#### BotManager
Bot の管理とイベント振り分けを行うマネージャ
- **Bot登録・削除**: 動的なBot管理
- **イベント配信**: 各Botにイベントを振り分け
- **有効/無効切り替え**: 実行時のBot制御

### 🤖 個別Bot (`src/bots/`)

#### SalmonBot
```typescript
// フィルタ: "サモン！"で始まる投稿
// アクション: "サーモン！"で返信
const salmonBot = createSalmonBot();
```

#### CalendarBot
```typescript
// フィルタ: 返信 && "予定"コマンド
// アクション: AI解析 → Google Calendar登録
const calendarBot = createCalendarBot(safelist);
```

#### OjisanBot
```typescript
// フィルタ: 確率的フィルタ（6%）+ 制限条件
// アクション: AI生成おじさん構文で返信
const ojisanBot = createOjisanBot(ojisanPrivateKey);
```

#### PassportBot
```typescript
// スケジュール実行専用
// アクション: パスポートメッセージ送信
const passportAction = createPassportAction(targetNpub, passportPrivateKey);
```

### 📁 ディレクトリ構造
```
src/
├── core/                    # コアシステム
│   ├── NostrClient.ts       # Nostr接続管理
│   ├── BotHandler.ts        # Bot インターフェース
│   ├── BotManager.ts        # Bot 管理
│   └── index.ts             # エクスポート
├── bots/                    # 個別Bot機能
│   ├── SalmonBot.ts         # サモン機能
│   ├── CalendarBot.ts       # カレンダー機能
│   ├── OjisanBot.ts         # おじさん機能
│   ├── PassportBot.ts       # パスポート機能
│   └── index.ts             # エクスポート
├── newIndex.ts              # 新メインエントリー
├── index.ts                 # 旧メインエントリー（後方互換）
├── googleCalendar.ts        # Google Calendar API
├── ojisan.ts                # おじさん構文AI
└── utils.ts                 # ユーティリティ
```

## 使用方法

### 基本的な使用
```typescript
import { NostrClient, BotManager } from "./core/index.js";
import { createSalmonBot, createCalendarBot } from "./bots/index.js";

// 1. NostrClient初期化
const client = new NostrClient({
  privateKey: "your_private_key",
  relays: ["wss://relay.example.com"]
});

// 2. BotManager初期化
const manager = new BotManager(client);

// 3. Botを登録
manager.register(createSalmonBot());
manager.register(createCalendarBot(safelist));

// 4. 開始
manager.start();
```

### 実行時Bot管理
```typescript
// Bot状態確認
manager.getHandlers();

// Bot有効/無効切り替え
manager.setEnabled("OjisanBot", true);
manager.setEnabled("SalmonBot", false);

// Bot追加・削除
manager.register(newBot);
manager.unregister("BotName");
```

### Bot管理コマンド
Botにメンションすることで管理可能：
- `!bots` - Bot状態表示
- `!enable BotName` - Bot有効化
- `!disable BotName` - Bot無効化

## フィルタの種類

### 基本フィルタ
- **RegexFilter**: 正規表現マッチ
- **ReplyFilter**: 自分への返信のみ
- **AndFilter**: 複数フィルタのAND条件
- **OrFilter**: 複数フィルタのOR条件

### カスタムフィルタの作成
```typescript
class CustomFilter extends BaseBotFilter {
  matches(event: Event, client: NostrClient): boolean {
    // カスタムロジック
    return someCondition;
  }
}
```

## アクションの種類

### 基本アクション
- **TextReplyAction**: 単純なテキスト返信

### カスタムアクションの作成
```typescript
class CustomAction extends BaseBotAction {
  async execute(event: Event, client: NostrClient): Promise<void> {
    // カスタム処理
    await client.sendText("応答メッセージ", event);
  }
}
```

## 利点

### 🔗 疎結合
- 各Bot機能が独立している
- 新しいBot機能を簡単に追加可能
- 既存機能に影響なくBot修正可能

### 🔄 拡張性
- フィルタとアクションを組み合わせて複雑な条件設定
- 実行時のBot管理（有効/無効切り替え）
- 動的なBot追加・削除

### 🧪 テスト性
- 各コンポーネントを独立してテスト可能
- モックを使った単体テスト容易
- フィルタとアクションを個別検証

### 🛠️ 保守性
- 責任の分離
- 明確なインターフェース
- 再利用可能なコンポーネント

## 旧システムからの移行

### 実行方法の変更
```bash
# 旧システム
npm run start  # src/index.ts

# 新システム  
node dist/newIndex.js  # src/newIndex.ts
```

### 機能対応表
| 旧機能 | 新Bot | 状態 |
|--------|--------|------|
| サモン応答 | SalmonBot | ✅ 有効 |
| カレンダー登録 | CalendarBot | ✅ 有効 |
| おじさん構文 | OjisanBot | ⚠️ 無効（有効化可能） |
| パスポート送信 | PassportBot | ⚠️ 無効（スケジュール）|

### 後方互換性
- 旧 `src/index.ts` は保持
- 既存の環境変数をそのまま使用
- 同じリレーと機能を維持

## 今後の拡張予定

1. **Web管理画面**: Bot状態をブラウザで管理
2. **プラグインシステム**: 外部ファイルからBot読み込み
3. **統計機能**: Bot使用状況の収集・分析
4. **設定ファイル**: JSONによるBot設定外部化 