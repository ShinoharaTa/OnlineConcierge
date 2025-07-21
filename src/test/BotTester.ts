import { NostrClient } from "../core/NostrClient.js";
import { BotManager } from "../core/BotManager.js";
import { TestHelper } from "./TestHelper.js";
import { createSalmonBot, createCalendarBot, createOjisanBot, createMonitorBot, createMyRoomBot } from "../bots/index.js";

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

    // MonitorBotはテスト時には無効化（実際のDiscord通知を防ぐため）
    const monitorBot = createMonitorBot();
    monitorBot.enabled = false; // テストでは無効
    this.manager.register(monitorBot);

    // MyRoomBotはテスト用環境変数があれば追加
    const myRoomBot = createMyRoomBot();
    if (process.env.INFLUXDB_URL && process.env.INFLUXDB_TOKEN) {
      myRoomBot.enabled = true; // テストでは有効
    } else {
      myRoomBot.enabled = false; // テストでは模擬データで動作
    }
    this.manager.register(myRoomBot);
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
      // 基本的なパターン
      TestHelper.createMentionEvent("予定 明日の午後2時から会議", botPubkey, "test_user_1"),
      
      // 複雑な時間指定
      TestHelper.createMentionEvent("予定 来週の金曜日 12時からランチ 渋谷駅前", botPubkey, "test_user_2"),
      
      // 相対的な日時表現
      TestHelper.createMentionEvent("予定 明後日の朝10時から病院", botPubkey, "test_user_3"),
      
      // 期間指定
      TestHelper.createMentionEvent("予定 今度の土曜日 14:00-16:00 プレゼン準備", botPubkey, "test_user_4"),
      
      // 場所付き
      TestHelper.createMentionEvent("予定 来月の15日 午前9時 東京駅で待ち合わせ", botPubkey, "test_user_5"),
      
      // 自然言語表現
      TestHelper.createMentionEvent("予定 再来週の火曜日の夕方から友達と映画", botPubkey, "test_user_6"),
      
      // GPTが得意とする複雑なケース
      TestHelper.createMentionEvent("予定 4月25日の午後3時半から1時間ほど、新宿のカフェで打ち合わせ", botPubkey, "test_user_7"),
      
      // マッチしないパターン
      TestHelper.createMentionEvent("こんにちは", botPubkey), 
    ];

    for (const event of testEvents) {
      console.log(`📤 テストイベント: "${event.content}"`);
      console.log(`👤 送信者: ${event.pubkey.slice(0, 16)}...`);
      await this.manager['handleEvent'](event);
      console.log("──────────────────────────────────────────────────");
      await this.sleep(1500); // GPT解析に時間がかかる可能性があるため少し長めに
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
   * MonitorBot機能のテスト
   */
  async testMonitorBot(): Promise<void> {
    TestHelper.logTestStart("MonitorBot");
    
    // テスト用のキーワードやnpubを含む投稿をシミュレート
    const testEvents = [
      TestHelper.createMockEvent("これは通常の投稿です"),
      TestHelper.createMockEvent("緊急事態が発生しました！", "test_user_alert"),
      TestHelper.createMockEvent("スパムっぽい内容", "test_user_spam"),
      TestHelper.createMockEvent("おはようございます", "test_user_normal"),
    ];

    for (const event of testEvents) {
      console.log(`📤 監視テストイベント: "${event.content}"`);
      console.log(`👤 送信者: ${event.pubkey.slice(0, 16)}...`);
      // MonitorBotはテストでは無効なので、フィルタのテストのみ
      await this.sleep(500);
    }

    TestHelper.logTestEnd("MonitorBot");
  }

  /**
   * MyRoomBotのテスト
   */
  async testMyRoomBot(): Promise<void> {
    TestHelper.logTestStart("MyRoomBot");
    
    const testEvents = [
      TestHelper.createMockEvent("まいへや", "user1"), // ✅ 厳密一致
      TestHelper.createMockEvent(" まいへや ", "user2"), // ✅ 前後スペースあり（trim後一致）
      TestHelper.createMockEvent("まいへや？", "user3"), // ❌ 記号付き
      TestHelper.createMockEvent("まいへや！", "user4"), // ❌ 記号付き
      TestHelper.createMockEvent("まいへや 教えて", "user5"), // ❌ スペース後に続く
      TestHelper.createMockEvent("今日のまいへやはどう？", "user6"), // ❌ 他の文字が続く
      TestHelper.createMockEvent("まいへやの状況", "user7"), // ❌ 「の」が続く
      TestHelper.createMockEvent("こんにちは", "user8"), // ❌ キーワードなし
    ];

    for (const event of testEvents) {
      console.log(`📤 MyRoomテストイベント: "${event.content}"`);
      console.log(`👤 送信者: ${event.pubkey.slice(0, 16)}...`);
      
      // テスト用のフィルタチェック
      const handler = this.manager.getHandlers().find(h => h.name === "MyRoomBot");
      if (handler) {
        const matches = handler.filter.matches(event, this.client);
        console.log(`🔍 フィルタマッチ: ${matches ? '✅' : '❌'}`);
        
        if (matches) {
          await this.manager['handleEvent'](event);
        }
      }
      
      console.log("──────────────────────────────────────────────────");
      await this.sleep(1000);
    }

    TestHelper.logTestEnd("MyRoomBot");
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
    await this.testMonitorBot();
    await this.testMyRoomBot();
    await this.testBotManagement();
    
    console.log("🎉 全テストが完了しました！");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 