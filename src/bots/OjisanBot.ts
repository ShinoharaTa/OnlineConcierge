import { BaseBotFilter, BaseBotAction, type BotHandler } from "../core/BotHandler.js";
import type { Event } from "nostr-tools";
import { NostrClient } from "../core/NostrClient.js";
import { OjisanClient } from "../ojisan.js";
import { nip19 } from "nostr-tools";

/**
 * おじさんフィルタ
 */
class OjisanFilter extends BaseBotFilter {
  private latestInteractions: string[] = [];
  private ojisanPrivateKey: string;

  constructor(ojisanPrivateKey: string) {
    super();
    this.ojisanPrivateKey = ojisanPrivateKey;
  }

  matches(event: Event, client: NostrClient): boolean {
    // おじさん自身の投稿は除外
    if (this.isOjisanPost(event.pubkey)) {
      return false;
    }

    // 短い投稿は除外
    if (event.content.length < 10) {
      return false;
    }

    // 最近反応したユーザーは除外
    if (this.latestInteractions.includes(event.pubkey)) {
      return false;
    }

    // 6%の確率で反応
    if (Math.random() > 0.06) {
      return false;
    }

    // 最新の反応リストを更新
    this.latestInteractions.push(event.pubkey);
    this.latestInteractions = this.latestInteractions.slice(-10);

    return true;
  }

  private isOjisanPost(pubkey: string): boolean {
    const ojisanClient = new NostrClient({ 
      privateKey: this.ojisanPrivateKey, 
      relays: [] 
    });
    return pubkey === ojisanClient.getPublicKey();
  }
}

/**
 * おじさん応答アクション
 */
class OjisanAction extends BaseBotAction {
  private ojisanClient: OjisanClient;
  private ojisanPrivateKey: string;

  constructor(ojisanPrivateKey: string) {
    super();
    this.ojisanClient = new OjisanClient();
    this.ojisanPrivateKey = ojisanPrivateKey;
  }

  async execute(event: Event, client: NostrClient): Promise<void> {
    try {
      const profile = await client.getUserMeta(event.pubkey);
      const response = await this.ojisanClient.reactionToPost(event.content, profile);
      
      if (response) {
        await client.sendText(response, event, this.ojisanPrivateKey);
      }
    } catch (error) {
      console.error("Error in OjisanAction:", error);
    }
  }
}

/**
 * おじさんBotを生成する
 */
export function createOjisanBot(ojisanPrivateKey: string): BotHandler {
  return {
    name: "OjisanBot",
    filter: new OjisanFilter(ojisanPrivateKey),
    action: new OjisanAction(ojisanPrivateKey),
    enabled: false, // デフォルトは無効
  };
} 