import { BaseBotFilter, BaseBotAction, AndFilter, ReplyFilter, RegexFilter, type BotHandler } from "../core/BotHandler.js";
import type { Event } from "nostr-tools";
import type { NostrClient } from "../core/NostrClient.js";
import { formatISO } from "date-fns";
import dotenv from "dotenv";

// 環境変数を読み込み
dotenv.config();

// 簡易的なカレンダーイベント解析
interface CalendarEvent {
  summary: string;
  description: string;
  start: Date;
  end: Date;
  location?: string;
}

class CalendarEventParser {
  async parseMentionToCalendarEvent(content: string, baseDate: Date): Promise<CalendarEvent | null> {
    // 「予定 内容」形式から予定を抽出する簡易版
    const match = content.match(/予定\s+(.+)/);
    if (!match) return null;

    const eventText = match[1];
    
    // 現在から1時間後を開始時刻、2時間を終了時刻に設定（簡易版）
    const start = new Date(baseDate.getTime() + 60 * 60 * 1000); // 1時間後
    const end = new Date(baseDate.getTime() + 2 * 60 * 60 * 1000); // 2時間後

    return {
      summary: eventText,
      description: `Bot経由で作成された予定: ${eventText}`,
      start,
      end,
    };
  }
}

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
  private parser: CalendarEventParser;

  constructor() {
    super();
    this.parser = new CalendarEventParser();
  }

  async execute(event: Event, client: NostrClient): Promise<void> {
    try {
      // メンション内容を解析してカレンダーイベントを生成
      const calendarEvent = await this.parser.parseMentionToCalendarEvent(
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