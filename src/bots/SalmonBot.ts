import { BaseBotFilter, BaseBotAction, type BotHandler } from "../core/BotHandler.js";
import type { Event } from "nostr-tools";
import type { NostrClient } from "../core/NostrClient.js";

/**
 * サモンコマンドのフィルタ
 */
class SalmonFilter extends BaseBotFilter {
  matches(event: Event, client: NostrClient): boolean {
    return /^サモン！/.test(event.content);
  }
}

/**
 * サーモン応答アクション
 */
class SalmonAction extends BaseBotAction {
  async execute(event: Event, client: NostrClient): Promise<void> {
    await client.sendText("サーモン！", event);
  }
}

/**
 * サーモンBotを生成する
 */
export function createSalmonBot(): BotHandler {
  return {
    name: "SalmonBot",
    filter: new SalmonFilter(),
    action: new SalmonAction(),
    enabled: true,
  };
} 