import cron from "node-cron";
import dotenv from "dotenv";
import { NostrClient } from "./core/NostrClient.js";
import { BotManager } from "./core/BotManager.js";
import { createSalmonBot } from "./bots/SalmonBot.js";
import { createOjisanBot } from "./bots/OjisanBot.js";
import { createCalendarBot } from "./bots/CalendarBot.js";
import { createPassportAction, isPassportAvailable } from "./bots/PassportBot.js";
import { createMonitorBot, getMonitorConfig } from "./bots/MonitorBot.js";

dotenv.config();

const RELAYS = [
  "wss://relay-jp.nostr.wirednet.jp",
  "wss://r.kojira.io",
  "wss://yabu.me",
  "wss://relay-jp.shino3.net",
];

// セーフリストは不要になったため削除
// const SAFELIST = [
//   "fe9edd5d5c635dd2900f1f86a872e81ce1d6e20bd4e06549f133ae6bf158913b",
//   "98a72996aecaef8a4b708d149ad2e06549f133ae6bf158913b",
// ];

const main = async () => {
  // 基本的な環境変数の確認
  const HEX = process.env.HEX;
  const TEST_MODE = process.env.TEST_MODE === "true";

  if (!HEX) {
    console.error("HEX environment variable is required");
    process.exit(1);
  }

  // テストモードの表示
  if (TEST_MODE) {
    console.log("🧪".repeat(20));
    console.log("🧪 TEST MODE ENABLED - Nostr投稿は実行されません");
    console.log("🧪 すべての送信はコンソールログとして表示されます");
    console.log("🧪".repeat(20));
  }

  // NostrClientを初期化
  const nostrClient = new NostrClient({
    privateKey: HEX,
    relays: RELAYS,
    testMode: TEST_MODE,
  });

  // BotManagerを初期化
  const botManager = new BotManager(nostrClient);

  // 各Botを登録
  console.log("Registering bots...");

  // 1. サモンBot（常に有効）
  botManager.register(createSalmonBot());

  // 2. カレンダーBot（常に有効）
  botManager.register(createCalendarBot());

  // 3. おじさんBot（環境変数OJI_HEXがある場合のみ有効化）
  const ojisanBot = createOjisanBot();
  botManager.register(ojisanBot);
  if (ojisanBot.enabled) {
    console.log("OjisanBot registered and enabled");
  } else {
    console.log("OjisanBot registered but disabled (OJI_HEX not found)");
  }

  // 4. MonitorBot（Discord webhook URLがある場合のみ有効化）
  const monitorBot = createMonitorBot();
  botManager.register(monitorBot);
  if (monitorBot.enabled) {
    const config = getMonitorConfig();
    console.log("MonitorBot registered and enabled");
    console.log(`  - Keywords: ${config.keywords.length > 0 ? config.keywords.join(', ') : 'none'}`);
    console.log(`  - NPubs: ${config.npubs.length > 0 ? config.npubs.length + ' npubs' : 'none'}`);
  } else {
    console.log("MonitorBot registered but disabled (DISCORD_WEBHOOK_URL not found)");
  }

  // Bot管理コマンドの設定（将来の拡張用）
  setupBotManagementCommands(botManager, nostrClient);

  // パスポート機能の設定（環境変数がある場合のみ）
  if (isPassportAvailable()) {
    setupPassportSchedule(nostrClient);
    console.log("Passport feature configured");
  } else {
    console.log("Passport feature disabled (PASSPORT_HEX not found)");
  }

  // Botマネージャーを開始
  botManager.start();
  console.log("All bots started successfully!");

  // 30分間隔でプロセス再起動
  cron.schedule("*/30 * * * *", async () => {
    console.log("Scheduled restart...");
    botManager.stop();
    process.exit(0);
  });
};

/**
 * Bot管理コマンドの設定
 */
function setupBotManagementCommands(botManager: BotManager, client: NostrClient) {
  // 将来的にBot管理用のコマンドを追加予定
  // 例: "!enable OjisanBot", "!disable SalmonBot" など
  
  client.subscribeRealtime(async (event) => {
    if (!client.isReplyToMe(event)) return;

    const content = event.content.trim();
    
    // Bot管理コマンドの処理
    if (content.startsWith("!bots")) {
      const handlers = botManager.getHandlers();
      const status = handlers.map(h => `${h.name}: ${h.enabled ? '有効' : '無効'}`).join('\n');
      await client.sendText(`Bot状態:\n${status}`, event);
    } else if (content.startsWith("!enable ")) {
      const botName = content.replace("!enable ", "");
      botManager.setEnabled(botName, true);
      await client.sendText(`${botName}を有効にしました`, event);
    } else if (content.startsWith("!disable ")) {
      const botName = content.replace("!disable ", "");
      botManager.setEnabled(botName, false);
      await client.sendText(`${botName}を無効にしました`, event);
    }
  });
}

/**
 * パスポート機能のスケジュール設定
 */
function setupPassportSchedule(client: NostrClient) {
  const passportAction = createPassportAction(); // 環境変数から自動取得

  // 毎日午前1時に実行（現在は無効化）
  // cron.schedule("0 1 * * *", async () => {
  //   console.log("Sending passport message...");
  //   await passportAction.execute(null, client);
  // });
  
  console.log("Passport schedule configured (but disabled)");
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch(console.error); 