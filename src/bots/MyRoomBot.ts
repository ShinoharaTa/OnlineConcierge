import { BaseBotFilter, BaseBotAction, type BotHandler } from "../core/BotHandler.js";
import type { Event } from "nostr-tools";
import type { NostrClient } from "../core/NostrClient.js";
import { InfluxDB, Point } from '@influxdata/influxdb-client';
import dotenv from "dotenv";

// 環境変数を読み込み
dotenv.config();

/**
 * マイルーム応答フィルタ
 */
class MyRoomFilter extends BaseBotFilter {
  private allowedAuthors: string[];

  constructor(private client: NostrClient) {
    super();
    // 環境変数からカンマ区切りのhex配列を読み込み
    const authorsEnv = process.env.MYROOM_AUTHORS || '';
    this.allowedAuthors = authorsEnv
      .split(',')
      .map(hex => hex.trim())
      .filter(hex => hex.length > 0);
  }

  matches(event: Event, client: NostrClient): boolean {
    // 許可されたauthorからの投稿かチェック
    const isAllowedAuthor = this.allowedAuthors.length === 0 || this.allowedAuthors.includes(event.pubkey);
    
    // "まいへや"という単語のみに厳密に反応（前後に文字が続かない場合のみ）
    const pattern = /^まいへや$/;
    const containsKeyword = pattern.test(event.content.trim());
    
    return isAllowedAuthor && containsKeyword;
  }
}

/**
 * InfluxDBクライアント
 */
class InfluxDBClient {
  private client: InfluxDB;
  private org: string;
  private bucket: string;

  constructor() {
    const url = process.env.INFLUXDB_URL || 'http://localhost:8086';
    const token = process.env.INFLUXDB_TOKEN || '';
    this.org = process.env.INFLUXDB_ORG || 'my-org';
    this.bucket = process.env.INFLUXDB_BUCKET || 'home-temp';
    
    this.client = new InfluxDB({ url, token });
  }

  /**
   * 部屋の最新データを取得
   */
  async getRoomData(): Promise<{ devices: Array<{ device_name: string; temperature?: number; humidity?: number; timestamp?: Date }> }> {
    const queryApi = this.client.getQueryApi(this.org);
    
    // 温度データを取得するクエリ（最新1時間の最後の値）
    const temperatureQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r["_measurement"] == "Meter")
        |> filter(fn: (r) => r["_field"] == "temperature")
        |> keep(columns: ["_time", "_value", "device_name"])
        |> group(columns: ["device_name"])
        |> last()
    `;

    // 湿度データを取得するクエリ（最新1時間の最後の値）
    const humidityQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r["_measurement"] == "Meter")
        |> filter(fn: (r) => r["_field"] == "humidity")
        |> keep(columns: ["_time", "_value", "device_name"])
        |> group(columns: ["device_name"])
        |> last()
    `;

    try {
      const deviceData = new Map<string, { temperature?: number; humidity?: number; timestamp?: Date }>();
      
      // 温度データを取得
      for await (const { values, tableMeta } of queryApi.iterateRows(temperatureQuery)) {
        const o = tableMeta.toObject(values);
        const deviceName = o.device_name;
        if (!deviceData.has(deviceName)) {
          deviceData.set(deviceName, {});
        }
        const device = deviceData.get(deviceName)!;
        device.temperature = o._value;
        device.timestamp = new Date(o._time);
      }

      // 湿度データを取得
      for await (const { values, tableMeta } of queryApi.iterateRows(humidityQuery)) {
        const o = tableMeta.toObject(values);
        const deviceName = o.device_name;
        if (!deviceData.has(deviceName)) {
          deviceData.set(deviceName, {});
        }
        const device = deviceData.get(deviceName)!;
        device.humidity = o._value;
        if (!device.timestamp) {
          device.timestamp = new Date(o._time);
        }
      }
      
      // Map を配列に変換
      const devices = Array.from(deviceData.entries()).map(([device_name, data]) => ({
        device_name,
        ...data
      }));

      return { devices };
    } catch (error) {
      console.error('InfluxDBクエリエラー:', error);
      return { devices: [] };
    }
  }
}

/**
 * マイルーム応答アクション
 */
class MyRoomAction extends BaseBotAction {
  private influxClient: InfluxDBClient;

  constructor() {
    super();
    this.influxClient = new InfluxDBClient();
  }

  async execute(event: Event, client: NostrClient): Promise<void> {
    try {
      const roomData = await this.influxClient.getRoomData();
      
      if (roomData.devices.length === 0) {
        await client.sendText("❌ 部屋のセンサーデータが取得できませんでした。", event);
        return;
      }

      let message = "🏠 部屋の現在の状況：\n";
      
      // デバイス別にデータを表示（簡潔形式）
      for (const device of roomData.devices) {
        const temp = device.temperature !== undefined ? `${device.temperature.toFixed(1)}℃` : "--℃";
        const humidity = device.humidity !== undefined ? `${device.humidity.toFixed(1)}%` : "--%";
        message += `${device.device_name}：${temp} / ${humidity}\n`;
      }

      // リプライとして送信
      await client.sendText(message, event);
    } catch (error) {
      console.error("MyRoomActionでエラーが発生:", error);
      await client.sendText("⚠️ 部屋の情報取得中にエラーが発生しました。", event);
    }
  }
}

/**
 * マイルームBotを生成する
 */
export function createMyRoomBot(): BotHandler {
  const myRoomFilter = new MyRoomFilter(null); // clientは実行時に渡される
  
  // 環境変数の存在チェック（InfluxDB設定 + 許可されたauthors）
  const hasInfluxConfig = !!(process.env.INFLUXDB_URL && process.env.INFLUXDB_TOKEN);
  const hasAuthors = !!process.env.MYROOM_AUTHORS;
  const enabled = hasInfluxConfig && hasAuthors;

  return {
    name: "MyRoomBot",
    filter: myRoomFilter,
    action: new MyRoomAction(),
    enabled: enabled,
  };
} 