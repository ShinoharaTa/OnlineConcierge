import { BaseBotAction } from "../core/BotHandler.js";
import type { NostrClient } from "../core/NostrClient.js";

/**
 * パスポート送信アクション
 */
class PassportAction extends BaseBotAction {
  private targetNpub: string;
  private passportPrivateKey: string;

  constructor(targetNpub: string, passportPrivateKey: string) {
    super();
    this.targetNpub = targetNpub;
    this.passportPrivateKey = passportPrivateKey;
  }

  async execute(_event: any, client: NostrClient): Promise<void> {
    try {
      const content = `nostr:${this.targetNpub} passport`;
      await client.sendText(content, null, this.passportPrivateKey);
      console.log("Passport message sent");
    } catch (error) {
      console.error("Error sending passport:", error);
    }
  }
}

/**
 * パスポートBot用アクションを生成する
 */
export function createPassportAction(
  targetNpub: string,
  passportPrivateKey: string
): PassportAction {
  return new PassportAction(targetNpub, passportPrivateKey);
} 