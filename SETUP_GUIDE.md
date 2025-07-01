# 篠川 Nostr Bot 設定ガイド

## 🚀 クイック設定

### 1. 環境ファイルの作成
```bash
# テンプレートをコピー
cp env.template .env

# エディタで編集
nano .env  # または code .env
```

### 2. 必須設定
```env
# 最低限必要な設定
HEX=あなたのBot用Nostr秘密鍵
```

### 3. 起動
```bash
npm install
npm start
```

## 📋 詳細な環境変数設定

### 基本設定 (必須)

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `HEX` | Bot用Nostr秘密鍵 (64文字) | `a1b2c3d4e5f6...` |

### Bot機能拡張 (オプション)

| 変数名 | 説明 | 効果 |
|--------|------|------|
| `OJI_HEX` | おじさんBot用秘密鍵 | おじさん構文での自動返信 |
| `PASSPORT_HEX` | パスポートBot用秘密鍵 | 定期パスポートメッセージ |
| `PASSPORT_TARGET_NPUB` | パスポート送信先 | 送信先指定 (省略可) |

### LLM機能 (推奨)

| 変数名 | 説明 | 推奨値 |
|--------|------|--------|
| `OPENROUTER_API_KEY` | OpenRouter APIキー | `sk-or-v1-...` |
| `LLM_MODEL_NAME` | 使用LLMモデル | `anthropic/claude-3.5-sonnet` |
| `OPENAI_API_KEY` | OpenAI APIキー (フォールバック) | `sk-...` |

### Discord監視通知

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL | `https://discord.com/api/webhooks/...` |
| `MONITOR_KEYWORDS` | 監視キーワード (カンマ区切り) | `緊急,スパム,注意` |
| `MONITOR_NPUBS` | 監視npub (カンマ区切り) | `npub1...,npub2...` |

### 開発設定

| 変数名 | 説明 | 値 |
|--------|------|-----|
| `TEST_MODE` | テストモード | `true`/`false` |

## 🔧 APIキーの取得方法

### OpenRouter APIキー
1. [OpenRouter](https://openrouter.ai/)にアクセス
2. アカウント作成・ログイン
3. APIキーページでキーを生成
4. 使用量に応じて課金

### Discord Webhook URL
1. Discordサーバーの設定を開く
2. 「連携サービス」→「ウェブフック」
3. 「新しいウェブフック」を作成
4. 名前を設定（例：篠川Bot通知）
5. チャンネルを選択
6. Webhook URLをコピー

### Nostr秘密鍵
```bash
# 新しい秘密鍵生成 (例)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📊 設定例

### 最小構成 (基本機能のみ)
```env
HEX=a1b2c3d4e5f6789012345678901234567890123456789012345678901234
```
- SalmonBot ✅
- CalendarBot ✅ (簡易解析)

### 推奨構成 (高機能)
```env
HEX=a1b2c3d4e5f6789012345678901234567890123456789012345678901234
OPENROUTER_API_KEY=sk-or-v1-1234567890abcdef
LLM_MODEL_NAME=anthropic/claude-3.5-sonnet
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1234567890/abcdef
MONITOR_KEYWORDS=緊急,重要,注意
```
- SalmonBot ✅
- CalendarBot ✅ (高精度LLM解析)
- MonitorBot ✅ (Discord通知)

### フル構成 (全機能)
```env
HEX=a1b2c3d4e5f6789012345678901234567890123456789012345678901234
OJI_HEX=b2c3d4e5f6789012345678901234567890123456789012345678901234a1
PASSPORT_HEX=c3d4e5f6789012345678901234567890123456789012345678901234a1b2
OPENROUTER_API_KEY=sk-or-v1-1234567890abcdef
LLM_MODEL_NAME=anthropic/claude-3.5-sonnet
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1234567890/abcdef
MONITOR_KEYWORDS=緊急,スパム,注意,アラート,重要
MONITOR_NPUBS=npub1abc123,npub1def456
TEST_MODE=false
```

## 🔍 動作確認

### 設定確認
```bash
# 開発モード（テスト）で起動
npm run dev
```

### ログで確認
起動時のログでBot状態を確認：
```
Bot registered: SalmonBot
Bot registered: CalendarBot
OjisanBot registered and enabled          # OJI_HEX設定時
MonitorBot registered and enabled         # DISCORD_WEBHOOK_URL設定時
  - Keywords: 緊急,重要,注意
  - NPubs: 2 npubs
```

### 機能テスト
```bash
npm test              # 全機能テスト
npm run test:monitor  # Monitor機能テスト
npm run test:calendar # Calendar機能テスト
```

## ⚠️ セキュリティ注意事項

1. **秘密鍵の管理**
   - `.env`ファイルは絶対にGitにコミットしない
   - 秘密鍵は他人に教えない
   - バックアップは安全な場所に保存

2. **Discord Webhook**
   - Webhook URLは秘密情報として扱う
   - 不要になったら削除する

3. **API キー**
   - 使用量を定期的に確認
   - 不審な使用量があれば即座にキーを無効化

## 🆘 トラブルシューティング

### Bot が起動しない
```bash
# 設定確認
cat .env | grep HEX

# ログ確認
npm run dev
```

### Discord通知が来ない
1. Webhook URLが正しいか確認
2. キーワード設定を確認
3. テストモードになっていないか確認

### CalendarBotの精度が低い
1. OpenRouter APIキーを設定
2. 適切なモデル名を指定
3. API使用量を確認

## 📞 サポート

設定に関する質問や問題があれば、以下を確認してください：
- [README.md](./README.md) - 基本的な使い方
- [DOCUMENTATION.md](./DOCUMENTATION.md) - 詳細な仕様
- [env.template](./env.template) - 設定テンプレート 