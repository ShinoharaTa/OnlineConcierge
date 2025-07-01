import { createCalendarBot } from "../bots/CalendarBot.js";
import { NostrClient } from "../core/NostrClient.js";
import { TestHelper } from "./TestHelper.js";

/**
 * カレンダーBot専用のテストクラス
 */
export class CalendarBotTest {
  private client: NostrClient;
  private calendarBot: any;

  constructor(privateKey: string) {
    this.client = new NostrClient({
      privateKey: privateKey,
      relays: ["wss://example.com"],
      testMode: true
    });
    this.calendarBot = createCalendarBot();
  }

  /**
   * 時間解析とURL生成のテスト
   */
  async testTimeParsingAndUrlGeneration(): Promise<void> {
    console.log("🧪 カレンダーBot URL生成テストを開始します\n");

    const testCases = [
      {
        input: "予定 明日の14時から会議",
        description: "明日の特定時間指定"
      },
      {
        input: "予定 来週の金曜日 午後2時からランチ 渋谷駅前",
        description: "相対日付+時間+場所"
      },
      {
        input: "予定 12月25日 10:00-12:00 クリスマスパーティー",
        description: "特定日付+時間範囲"
      },
      {
        input: "予定 明後日の午前中に病院",
        description: "曖昧な時間表現"
      },
      {
        input: "予定 今度の土曜日の夕方から映画鑑賞",
        description: "相対的な時間表現"
      }
    ];

    for (const testCase of testCases) {
      console.log(`🔍 テストケース: ${testCase.description}`);
      console.log(`📝 入力: "${testCase.input}"`);
      
      try {
        // テストイベントを作成
        const botPubkey = this.client.getPublicKey();
        const testEvent = TestHelper.createMentionEvent(testCase.input, botPubkey);

        // カレンダーアクションを実行（テストモードなので実際の送信は行われない）
        await this.calendarBot.action.execute(testEvent, this.client);
        
        console.log("✅ 正常に処理されました");
      } catch (error) {
        console.error("❌ エラーが発生:", error);
      }
      
      console.log("─".repeat(50));
      await this.sleep(1000);
    }

    console.log("🎉 URL生成テストが完了しました！");
  }

  /**
   * URL形式の詳細検証
   */
  async testUrlFormat(): Promise<void> {
    console.log("\n🔗 URL形式検証テストを開始します\n");

    // 具体的な日時でテスト
    const testDate = new Date("2024-12-25T14:30:00+09:00");
    const endDate = new Date("2024-12-25T16:30:00+09:00");

    // Google Calendar URL形式のテスト
    const formatDateForGoogleCalendar = (date: Date): string => {
      const utcDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
      return utcDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    };

    const startFormatted = formatDateForGoogleCalendar(testDate);
    const endFormatted = formatDateForGoogleCalendar(endDate);

    console.log(`📅 開始日時: ${testDate.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`);
    console.log(`📅 終了日時: ${endDate.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`);
    console.log(`🔗 フォーマット後開始: ${startFormatted}`);
    console.log(`🔗 フォーマット後終了: ${endFormatted}`);

    // 完全なURL例
    const title = "テスト会議";
    const description = "Bot経由で作成されたテスト予定";
    const location = "東京駅";

    let calendarUrl = "https://www.google.com/calendar/render?action=TEMPLATE";
    calendarUrl += `&text=${encodeURIComponent(title)}`;
    calendarUrl += `&details=${encodeURIComponent(description)}`;
    calendarUrl += `&dates=${startFormatted}/${endFormatted}`;
    calendarUrl += `&location=${encodeURIComponent(location)}`;

    console.log(`\n🌐 生成されたURL:`);
    console.log(calendarUrl);
    console.log("\n✅ URL形式検証完了");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// メイン実行関数
export async function runCalendarTest(): Promise<void> {
  const testKey = "877fb7cf87b2ea5044c5c7c7fc37e5eb34b1e9c3d92e9fd5b8b1b5b6df80a3ac";
  const test = new CalendarBotTest(testKey);
  
  await test.testTimeParsingAndUrlGeneration();
  await test.testUrlFormat();
} 