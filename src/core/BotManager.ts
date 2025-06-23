import type { Event } from "nostr-tools";
import type { NostrClient } from "./NostrClient.js";
import type { BotHandler } from "./BotHandler.js";

export class BotManager {
  private handlers: BotHandler[] = [];
  private client: NostrClient;

  constructor(client: NostrClient) {
    this.client = client;
  }

  /**
   * Botハンドラを登録する
   */
  register(handler: BotHandler): void {
    this.handlers.push(handler);
    console.log(`Bot registered: ${handler.name}`);
  }

  /**
   * Botハンドラを削除する
   */
  unregister(name: string): void {
    this.handlers = this.handlers.filter(h => h.name !== name);
    console.log(`Bot unregistered: ${name}`);
  }

  /**
   * すべてのBotハンドラを取得する
   */
  getHandlers(): BotHandler[] {
    return [...this.handlers];
  }

  /**
   * 特定のBotを有効/無効にする
   */
  setEnabled(name: string, enabled: boolean): void {
    const handler = this.handlers.find(h => h.name === name);
    if (handler) {
      handler.enabled = enabled;
      console.log(`Bot ${name} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * イベントリスニングを開始する
   */
  start(): void {
    console.log("Bot manager starting...");
    this.client.subscribeRealtime(async (event) => {
      await this.handleEvent(event);
    });
  }

  /**
   * イベントを各Botハンドラに振り分ける
   */
  async handleEvent(event: Event): Promise<void> {
    for (const handler of this.handlers) {
      if (!handler.enabled) continue;

      try {
        if (handler.filter.matches(event, this.client)) {
          console.log(`Event matched for bot: ${handler.name}`);
          await handler.action.execute(event, this.client);
        }
      } catch (error) {
        console.error(`Error in bot ${handler.name}:`, error);
      }
    }
  }

  /**
   * 停止処理
   */
  stop(): void {
    console.log("Bot manager stopping...");
    this.client.close();
  }
} 