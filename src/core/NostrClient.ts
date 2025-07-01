import {
  finishEvent,
  Kind,
  SimplePool,
  getPublicKey,
  nip19,
} from "nostr-tools";
import type { Event, EventTemplate } from "nostr-tools";
import "websocket-polyfill";

export interface NostrConfig {
  privateKey: string;
  relays: string[];
  testMode?: boolean;
}

export type EventHandler = (event: Event) => Promise<void> | void;

export class NostrClient {
  private pool: SimplePool;
  private config: NostrConfig;

  constructor(config: NostrConfig) {
    this.config = config;
    this.pool = new SimplePool();
  }

  /**
   * Nostrリレーに接続してイベントを購読する
   */
  subscribe(
    filters: any[],
    onEvent: EventHandler
  ): void {
    const sub = this.pool.sub(this.config.relays, filters);
    sub.on("event", onEvent);
  }

  /**
   * リアルタイムイベントを購読する
   */
  subscribeRealtime(onEvent: EventHandler): void {
    if (this.config.testMode) {
      console.log("🧪 [TEST MODE] リアルタイム購読を開始（テストモード）");
      // テストモードでは模擬イベントを生成することも可能
      this.startTestEventSimulation(onEvent);
    } else {
      this.subscribe([{ kinds: [1], since: currUnixtime() }], onEvent);
    }
  }

  /**
   * テストモード用の模擬イベント生成
   */
  private startTestEventSimulation(onEvent: EventHandler): void {
    console.log("🎭 テストイベントシミュレーションを開始します...");
    console.log("💡 実際のテストは手動でテストイベントを呼び出してください");
    
    // 実際のリレーも購読（受信のみ、送信はしない）
    this.subscribe([{ kinds: [1], since: currUnixtime() }], (event) => {
      console.log(`📥 [受信] ${event.content.slice(0, 50)}${event.content.length > 50 ? '...' : ''}`);
      onEvent(event);
    });
  }

  /**
   * テキストイベントを送信する
   */
  async sendText(
    content: string,
    targetEvent: Event | null = null,
    privateKey?: string
  ): Promise<void> {
    const key = privateKey || this.config.privateKey;
    const created = targetEvent ? targetEvent.created_at + 1 : currUnixtime();
    
    const ev: EventTemplate<Kind.Text> = {
      kind: Kind.Text,
      content: content,
      tags: [],
      created_at: created,
    };

    if (targetEvent) {
      ev.tags.push(["e", targetEvent.id]);
      ev.tags.push(["p", targetEvent.pubkey]);
    }

    const post = finishEvent(ev, key);
    
    // テストモードの場合は実際に送信せずにログ出力
    if (this.config.testMode) {
      console.log("🧪 [TEST MODE] 送信予定メッセージ:");
      console.log(`📝 内容: ${content}`);
      if (targetEvent) {
        console.log(`💬 返信先: ${targetEvent.id.slice(0, 8)}...`);
        console.log(`👤 宛先: ${targetEvent.pubkey.slice(0, 8)}...`);
      }
      console.log(`🔑 送信者: ${getPublicKey(key).slice(0, 8)}...`);
      console.log("─".repeat(50));
      return Promise.resolve();
    }
    
    return new Promise((resolve) => {
      const pub = this.pool.publish(this.config.relays, post);
      pub.on("ok", () => {
        resolve();
      });
    });
  }

  /**
   * ユーザーのメタデータを取得する
   */
  async getUserMeta(pubkey: string): Promise<string> {
    const kind0 = await this.pool.get(this.config.relays, { kinds: [0], authors: [pubkey] });
    const userMeta = kind0
      ? JSON.parse(kind0.content)
      : { display_name: "", name: "" };
    return userMeta.display_name ?? userMeta.name;
  }

  /**
   * ユーザーの詳細プロフィール情報を取得する（kind:0）
   */
  async getUserProfile(pubkey: string): Promise<{name?: string, display_name?: string, about?: string, picture?: string}> {
    try {
      const kind0 = await this.pool.get(this.config.relays, { kinds: [0], authors: [pubkey] });
      if (kind0) {
        const userMeta = JSON.parse(kind0.content);
        return {
          name: userMeta.name || "",
          display_name: userMeta.display_name || "",
          about: userMeta.about || "",
          picture: userMeta.picture || ""
        };
      }
      return {};
    } catch (error) {
      console.error("Error parsing user profile:", error);
      return {};
    }
  }

  /**
   * 指定されたイベントが自分への返信かどうか判定する
   */
  isReplyToMe(event: Event): boolean {
    return event.tags.find((tag) => tag.includes("p"))?.[1] === getPublicKey(this.config.privateKey);
  }

  /**
   * 自分のnpubを取得する
   */
  getNpub(): string {
    return nip19.npubEncode(getPublicKey(this.config.privateKey));
  }

  /**
   * 公開鍵を取得する
   */
  getPublicKey(): string {
    return getPublicKey(this.config.privateKey);
  }

  /**
   * プールを閉じる
   */
  close(): void {
    this.pool.close(this.config.relays);
  }
}

// ユーティリティ関数
function currUnixtime(): number {
  return Math.floor(Date.now() / 1000);
} 