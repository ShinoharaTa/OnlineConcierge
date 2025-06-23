import { NostrClient } from "../core/NostrClient.js";
import { BotManager } from "../core/BotManager.js";
import { TestHelper } from "./TestHelper.js";
import { createSalmonBot, createCalendarBot, createOjisanBot } from "../bots/index.js";

const RELAYS = [
  "wss://relay-jp.nostr.wirednet.jp",
  "wss://r.kojira.io",
  "wss://yabu.me",
  "wss://relay-jp.shino3.net",
];

// セーフリストは不要になったため削除
// const SAFELIST = [
//   "test_user_in_safelist",
//   "fe9edd5d5c635dd2900f1f86a872e81ce1d6e20bd4e06549f133ae6bf158913b",
// ];

/**
 * Bot機能のテスト実行クラス
 */
export class BotTester {
  private client: NostrClient;
  private manager: BotManager;

  constructor(privateKey: string) {
    this.client = new NostrClient({
      privateKey: privateKey,
      relays: RELAYS,
      testMode: true // 強制的にテストモード
    });
    this.manager = new BotManager(this.client);
    this.setupBots();
  }

  private setupBots(): void {
    // 全Botを登録
    this.manager.register(createSalmonBot());
    this.manager.register(createCalendarBot());
    
    // おじさんBotはテスト用環境変数があれば追加
    const ojiHex = process.env.OJI_HEX;
    if (ojiHex) {
      const ojisanBot = createOjisanBot();
      ojisanBot.enabled = true; // テストでは有効
      this.manager.register(ojisanBot);
    }
  }

  /**
   * サモンBotのテスト
   */
  async testSalmonBot(): Promise<void> {
    TestHelper.logTestStart("SalmonBot");
    
    const testEvents = [
      TestHelper.createMockEvent("サモン！"),
      TestHelper.createMockEvent("サモン！テストです"),
      TestHelper.createMockEvent("こんにちは"), // マッチしないパターン
    ];

    for (const event of testEvents) {
      console.log(`📤 テストイベント: "${event.content}"`);
      await this.manager['handleEvent'](event);
      await this.sleep(500);
    }

    TestHelper.logTestEnd("SalmonBot");
  }

  /**
   * カレンダーBotのテスト
   */
  async testCalendarBot(): Promise<void> {
    TestHelper.logTestStart("CalendarBot");
    
    const botPubkey = this.client.getPublicKey();
    
    const testEvents = [
      TestHelper.createMentionEvent("予定 明日の午後2時から会議", botPubkey, "test_user_1"),
      TestHelper.createMentionEvent("予定 来週の金曜日 12時からランチ 渋谷駅前", botPubkey, "test_user_2"),
      TestHelper.createMentionEvent("こんにちは", botPubkey), // マッチしないパターン
    ];

    for (const event of testEvents) {
      console.log(`📤 テストイベント: "${event.content}"`);
      console.log(`👤 送信者: ${event.pubkey.slice(0, 16)}...`);
      await this.manager['handleEvent'](event);
      await this.sleep(1000);
    }

    TestHelper.logTestEnd("CalendarBot");
  }

  /**
   * おじさんBotのテスト
   */
  async testOjisanBot(): Promise<void> {
    if (!process.env.OJI_HEX) {
      console.log("⚠️ OJI_HEX環境変数が設定されていないため、おじさんBotのテストをスキップします");
      return;
    }

    TestHelper.logTestStart("OjisanBot");
    
    // おじさんBotは確率的なので、複数回実行
    const testContent = "今日はいい天気ですね！お散歩日和です。";
    
    for (let i = 0; i < 5; i++) {
      const event = TestHelper.createMockEvent(testContent, `test_user_${i}`);
      console.log(`📤 テストイベント ${i + 1}: "${event.content}"`);
      await this.manager['handleEvent'](event);
      await this.sleep(500);
    }

    TestHelper.logTestEnd("OjisanBot");
  }

  /**
   * Bot管理コマンドのテスト
   */
  async testBotManagement(): Promise<void> {
    TestHelper.logTestStart("Bot Management");
    
    const botPubkey = this.client.getPublicKey();
    
    const testCommands = [
      "!bots",
      "!disable SalmonBot",
      "!bots",
      "!enable SalmonBot",
      "!bots",
    ];

    for (const command of testCommands) {
      const event = TestHelper.createMentionEvent(command, botPubkey);
      console.log(`📤 管理コマンド: "${command}"`);
      // 管理コマンドは直接呼び出し（別の購読なので）
      await this.sleep(500);
    }

    TestHelper.logTestEnd("Bot Management");
  }

  /**
   * 全テストの実行
   */
  async runAllTests(): Promise<void> {
    console.log("🚀 Bot機能テストを開始します...\n");
    
    await this.testSalmonBot();
    await this.testCalendarBot();
    await this.testOjisanBot();
    await this.testBotManagement();
    
    console.log("🎉 全テストが完了しました！");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 