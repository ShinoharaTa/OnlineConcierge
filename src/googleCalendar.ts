import { google } from "googleapis";
import { authenticate } from "@google-cloud/local-auth";
import * as fs from "node:fs/promises";
import path from "node:path";
import axios from "axios";

interface CalendarEvent {
  summary: string;
  description: string;
  start: string;
  end: string;
  location: string;
}

export class GoogleCalendarClient {
  private auth = null;
  private static readonly SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
  ];
  private static readonly TOKEN_PATH = "token.json";
  private static readonly CREDENTIALS_PATH = path.join(
    process.cwd(),
    "credentials.json",
  );
  private static readonly API_KEY = process.env.OPENAI_API_KEY;
  private static readonly API_ENDPOINT =
    "https://api.openai.com/v1/chat/completions";

  async authorize(): Promise<void> {
    this.auth = await this.loadSavedCredentialsIfExist();
    if (this.auth) return;

    // @ts-ignore
    this.auth = await authenticate({
      scopes: GoogleCalendarClient.SCOPES,
      keyfilePath: GoogleCalendarClient.CREDENTIALS_PATH,
    });

    if (this.auth.credentials) {
      await this.saveCredentials(this.auth);
    }
  }

  private async loadSavedCredentialsIfExist() {
    try {
      const content = await fs.readFile(
        GoogleCalendarClient.TOKEN_PATH,
        "utf-8",
      );
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials);
    } catch (err) {
      return null;
    }
  }

  private async saveCredentials(client): Promise<void> {
    const content = await fs.readFile(
      GoogleCalendarClient.CREDENTIALS_PATH,
      "utf-8",
    );
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: "authorized_user",
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(GoogleCalendarClient.TOKEN_PATH, payload);
  }

  async createCalendarEvent(
    event: CalendarEvent,
  ): Promise<{ status: string; message: string }> {
    if (!this.auth) throw new Error("Not authorized");
    const result = { status: "", message: "" };
    const calendar = google.calendar({ version: "v3", auth: this.auth });

    const calendarEvent = {
      summary: event.summary,
      description: event.description,
      start: {
        dateTime: event.start,
        timeZone: "Asia/Tokyo",
      },
      end: {
        dateTime: event.end,
        timeZone: "Asia/Tokyo",
      },
      location: event.location,
    };

    try {
      const res = await calendar.events.insert({
        calendarId: "primary",
        requestBody: calendarEvent,
      });
      if (res.status === 400) {
        result.status = "token_expire";
        result.message = res.config.data;
      } else {
        result.status = "true";
        console.log("Event created: %s", res.data.htmlLink);
      }
    } catch (error) {
      console.error("Error creating event:", error);
    }
    return result;
  }

  async parseMentionToCalendarEvent(
    mentionText: string,
    currentTime: Date,
  ): Promise<CalendarEvent | null> {
    const prompt = `
      以下のメンション内容を解析し、Googleカレンダーイベント登録用のJSONを生成してください。

      JSON構造
      {
        summary: （イベントタイトル）
        description: （イベントの説明）
        start: （開始日時）
        end: （終了日時）
        location: （場所）
      }

      - 日時は ISO 8601 形式
      - ユーザーのタイムゾーンは Asia/Tokyo
      - 解析できない項目はnull

      現在の日時は ${currentTime.toISOString()} です。
      メンションに「明日」などの相対的な日付が含まれている場合は、この現在時刻を基準に解釈してください。
      イベントの内容をもとにある程度の開始時間・終了時間を設定してください。前後に移動時間も含みます。

      メンション内容:
      ${mentionText}

      条件
      - 応答は有効なJSONオブジェクトのみ
      - 説明や追加のテキストは含めないでください。
      - 返信は純粋なJSON文字列であり、整形は不要
    `;

    try {
      const response = await axios.post(
        GoogleCalendarClient.API_ENDPOINT,
        {
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${GoogleCalendarClient.API_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );
      console.log(response.data.choices[0].message);
      const calendarEventJson = JSON.parse(
        response.data.choices[0].message.content,
      );
      return calendarEventJson as CalendarEvent;
    } catch (error) {
      console.error("Error parsing mention:", error);
      return null;
    }
  }
}
