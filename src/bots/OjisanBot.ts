import { BaseBotFilter, BaseBotAction, AndFilter, ReplyFilter, type BotHandler } from "../core/BotHandler.js";
import type { Event } from "nostr-tools";
import type { NostrClient } from "../core/NostrClient.js";

// おじさん構文生成機能
class OjisanGenerator {
  async reactionToPost(content: string, profile: any): Promise<string> {
    // 簡易版おじさん構文生成（実際はOpenAI APIを使用）
    const ojisanPhrases = [
      "そうだねぇ〜😊",
      "なるほどなるほど💡",
      "いいねいいね👍",
      "そんな感じだよね〜😄",
      "その通りだよ〜✨"
    ];
    return ojisanPhrases[Math.floor(Math.random() * ojisanPhrases.length)];
  }
}

/**
 * おじさん応答フィルタ
 */
class OjisanFilter extends BaseBotFilter {
  constructor(private client: NostrClient) {
    super();
  }

  matches(event: Event, client: NostrClient): boolean {
    // おじさんDB存在チェック（簡易版）
    const ojisanExists = false; // 現在は無効化
    
    // 6%の確率で応答
    const randomChance = Math.random() < 0.06;
    
    // 短すぎるコンテンツは除外
    const hasContent = event.content.length >= 10;
    
    return ojisanExists && randomChance && hasContent;
  }
}

/**
 * おじさん応答アクション
 */
class OjisanAction extends BaseBotAction {
  private generator: OjisanGenerator;

  constructor() {
    super();
    this.generator = new OjisanGenerator();
  }

  async execute(event: Event, client: NostrClient): Promise<void> {
    try {
      const profile = await client.getUserMeta(event.pubkey);
      const ojisanPost = await this.generator.reactionToPost(event.content, profile);

      // 通常のテキスト送信
      await client.sendText(ojisanPost, event);
    } catch (error) {
      console.error("Error in OjisanAction:", error);
    }
  }
}

/**
 * おじさんBotを生成する
 */
export function createOjisanBot(): BotHandler {
  const ojisanFilter = new OjisanFilter(null); // clientは実行時に渡される

  return {
    name: "OjisanBot",
    filter: ojisanFilter,
    action: new OjisanAction(),
    enabled: false, // デフォルトで無効化
  };
} 