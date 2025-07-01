import { BaseBotFilter, BaseBotAction, AndFilter, ReplyFilter, RegexFilter, type BotHandler } from "../core/BotHandler.js";
import type { Event } from "nostr-tools";
import type { NostrClient } from "../core/NostrClient.js";
import { formatISO } from "date-fns";
import dotenv from "dotenv";
import axios from "axios";

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

// GPTによる時間解析の結果
interface TimeParseResult {
  title: string;
  startDateTime: string; // ISO format
  endDateTime: string;   // ISO format
  location?: string;
  confidence: number;    // 0-1の信頼度
}

class CalendarEventParser {
  private apiKey: string | undefined;
  private modelName: string;
  private apiEndpoint: string;

  constructor() {
    // OpenRouter APIの設定を優先、フォールバックでOpenAI
    this.apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    this.modelName = process.env.LLM_MODEL_NAME || "gpt-4";
    
    // API エンドポイントの決定
    if (process.env.OPENROUTER_API_KEY) {
      this.apiEndpoint = "https://openrouter.ai/api/v1/chat/completions";
    } else {
      this.apiEndpoint = "https://api.openai.com/v1/chat/completions";
    }
  }

  /**
   * LLMを使用して自然言語から予定情報を解析
   */
  private async parseWithLLM(content: string, currentDate: Date): Promise<TimeParseResult | null> {
    if (!this.apiKey) {
      console.warn("API key not found (OPENROUTER_API_KEY or OPENAI_API_KEY), falling back to simple parsing");
      return null;
    }

    try {
      const prompt = `
現在の日時: ${currentDate.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}

以下のメッセージから予定情報を抽出してください。
メッセージ: "${content}"

以下のJSON形式で返してください：
{
  "title": "予定のタイトル",
  "startDateTime": "2024-01-15T14:00:00+09:00", // ISO 8601形式
  "endDateTime": "2024-01-15T15:00:00+09:00",   // ISO 8601形式
  "location": "場所（あれば）",
  "confidence": 0.9 // 0-1の信頼度
}

注意事項：
- 日時が明示されていない場合は、適切なデフォルト時間を設定
- 終了時間が指定されていない場合は、開始時間から1時間後を設定
- 「明日」「来週」などの相対的な表現を現在日時を基準に解釈
- 信頼度は解析の確実性を示す（0.7以上が推奨）
- JSONのみを返し、他の説明は含めない
`;

      const headers: any = {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      };

      // OpenRouterの場合は追加のヘッダーを設定
      if (this.apiEndpoint.includes("openrouter.ai")) {
        headers["HTTP-Referer"] = "https://github.com/your-repo"; // あなたのリポジトリURL
        headers["X-Title"] = "Shinogawa Calendar Bot";
      }

      const response = await axios.post(
        this.apiEndpoint,
        {
          model: this.modelName,
          messages: [
            {
              role: "system",
              content: "あなたは日本語の自然言語から予定情報を正確に抽出するエキスパートです。"
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.1
        },
        {
          headers
        }
      );

      const responseText = response.data.choices[0].message.content.trim();
      const result = JSON.parse(responseText);
      
      // 信頼度が低い場合は null を返す
      if (result.confidence < 0.7) {
        console.warn(`Low confidence parsing result: ${result.confidence}`);
        return null;
      }

      return result;
          } catch (error) {
        console.error("Error parsing with LLM:", error);
        return null;
      }
    }

    /**
     * 簡易的なフォールバック解析
     */
  private parseSimple(content: string, baseDate: Date): CalendarEvent {
    const match = content.match(/予定\s+(.+)/);
    const eventText = match ? match[1] : content;
    
    // 簡易的な時間解析
    let start = new Date(baseDate);
    let end = new Date(baseDate);
    
    // 「明日」の処理
    if (eventText.includes("明日")) {
      start.setDate(start.getDate() + 1);
      end.setDate(end.getDate() + 1);
    }
    
    // 時間の処理（例：「14時」「午後2時」など）
    const timeMatch = eventText.match(/(\d{1,2})時|午後(\d{1,2})時|午前(\d{1,2})時/);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1] || timeMatch[2] || timeMatch[3]);
      if (timeMatch[2]) hour += 12; // 午後の場合
      start.setHours(hour, 0, 0, 0);
      end.setHours(hour + 1, 0, 0, 0); // 1時間後
    } else {
      // デフォルトは現在から1時間後
      start = new Date(baseDate.getTime() + 60 * 60 * 1000);
      end = new Date(baseDate.getTime() + 2 * 60 * 60 * 1000);
    }

    return {
      summary: eventText,
      description: `Bot経由で作成された予定: ${eventText}`,
      start,
      end,
    };
  }

  async parseMentionToCalendarEvent(content: string, baseDate: Date): Promise<CalendarEvent | null> {
    // まずLLMで解析を試行
    const llmResult = await this.parseWithLLM(content, baseDate);
    
    if (llmResult) {
      return {
        summary: llmResult.title,
        description: `Bot経由で作成された予定: ${llmResult.title}`,
        start: new Date(llmResult.startDateTime),
        end: new Date(llmResult.endDateTime),
        location: llmResult.location,
      };
    }

    // LLMが失敗した場合は簡易解析にフォールバック
    console.log("Falling back to simple parsing");
    return this.parseSimple(content, baseDate);
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
      // GoogleカレンダーのURL形式：YYYYMMDDTHHMMSSZ
      const formatDateForGoogleCalendar = (date: Date): string => {
        // 日本時間のDateオブジェクトを直接フォーマット（シンプルで確実）
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}${month}${day}T${hours}${minutes}${seconds}`;
      };

      let calendarUrl = "https://www.google.com/calendar/render?action=TEMPLATE";
      calendarUrl += `&text=${encodeURIComponent(calendarEvent.summary || "予定")}`;
      calendarUrl += `&details=${encodeURIComponent(calendarEvent.description || "")}`;
      calendarUrl += `&dates=${formatDateForGoogleCalendar(calendarEvent.start)}`;
      calendarUrl += `/${formatDateForGoogleCalendar(calendarEvent.end)}`;
      if (calendarEvent.location) {
        calendarUrl += `&location=${encodeURIComponent(calendarEvent.location)}`;
      }

      // 全員に対してカレンダーURLを提供
      const responseMessage = `📅 カレンダー登録用URLを作成しました！\n\n` +
        `📝 タイトル: ${calendarEvent.summary || "予定"}\n` +
        `⏰ 日時: ${new Date(calendarEvent.start).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} - ${new Date(calendarEvent.end).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}\n` +
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