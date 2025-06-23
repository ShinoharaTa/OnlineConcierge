import { BaseBotFilter, BaseBotAction, AndFilter, ReplyFilter, RegexFilter, type BotHandler } from "../core/BotHandler.js";
import type { Event } from "nostr-tools";
import type { NostrClient } from "../core/NostrClient.js";
import { GoogleCalendarClient } from "../googleCalendar.js";
import { formatISO } from "date-fns";

/**
 * カレンダーコマンドフィルタ
 */
class CalendarCommandFilter extends BaseBotFilter {
  constructor(private client: NostrClient) {
    super();
  }

  matches(event: Event, client: NostrClient): boolean {
    const npub = client.getNpub();
    const pattern = new RegExp(`^(nostr:${npub}\\s+)?予定 .*`);
    return pattern.test(event.content);
  }
}

/**
 * カレンダーURL生成アクション
 */
class CalendarAction extends BaseBotAction {
  private googleClient: GoogleCalendarClient;

  constructor() {
    super();
    this.googleClient = new GoogleCalendarClient();
  }

  async execute(event: Event, client: NostrClient): Promise<void> {
    try {
      // メンション内容を解析してカレンダーイベントを生成
      const calendarEvent = await this.googleClient.parseMentionToCalendarEvent(
        event.content,
        new Date()
      );

      if (!calendarEvent) {
        await client.sendText("予定の解析に失敗しました。もう一度分かりやすく教えてください。", event);
        return;
      }

      // Google CalendarテンプレートURLを生成
      let calendarUrl = "https://www.google.com/calendar/render?action=TEMPLATE";
      calendarUrl += `&text=${encodeURIComponent(calendarEvent.summary || "予定")}`;
      calendarUrl += `&details=${encodeURIComponent(calendarEvent.description || "")}`;
      calendarUrl += `&dates=${formatISO(new Date(calendarEvent.start), { format: "basic" })}`;
      calendarUrl += `/${formatISO(new Date(calendarEvent.end), { format: "basic" })}`;
      if (calendarEvent.location) {
        calendarUrl += `&location=${encodeURIComponent(calendarEvent.location)}`;
      }

      // 全員に対してカレンダーURLを提供
      const responseMessage = `📅 カレンダー登録用URLを作成しました！\n\n` +
        `📝 タイトル: ${calendarEvent.summary || "予定"}\n` +
        `⏰ 日時: ${new Date(calendarEvent.start).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}\n` +
        `${calendarEvent.location ? `📍 場所: ${calendarEvent.location}\n` : ""}` +
        `\n🔗 下のリンクをクリックしてカレンダーに追加してください：\n${calendarUrl}`;

      await client.sendText(responseMessage, event);
    } catch (error) {
      console.error("Error in CalendarAction:", error);
      await client.sendText("予定の解析でエラーが発生しました。もう一度お試しください。", event);
    }
  }
}

/**
 * カレンダーBotを生成する
 */
export function createCalendarBot(): BotHandler {
  const replyFilter = new ReplyFilter();
  const calendarFilter = new CalendarCommandFilter(null); // clientは実行時に渡される

  return {
    name: "CalendarBot",
    filter: new AndFilter([replyFilter, calendarFilter]),
    action: new CalendarAction(),
    enabled: true,
  };
} 