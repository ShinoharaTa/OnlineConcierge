import { BaseBotAction } from "../core/BotHandler.js";
import type { NostrClient } from "../core/NostrClient.js";
import dotenv from "dotenv";

// 環境変数を読み込み
dotenv.config();

/**
 * パスポート送信アクション
 */
class PassportAction extends BaseBotAction {
  private targetNpub: string;
  private passportPrivateKey: string;

  constructor(targetNpub?: string, passportPrivateKey?: string) {
    super();
    // 環境変数から取得、パラメータがある場合はそちらを優先
    this.targetNpub = targetNpub || process.env.PASSPORT_TARGET_NPUB || "npub1823chanrkmyrfgz2v4pwmu22s8fjy0s9ps7vnd68n7xgd8zr9neqlc2e5r";
    this.passportPrivateKey = passportPrivateKey || process.env.PASSPORT_HEX || "";
    
    if (!this.passportPrivateKey) {
      console.warn("PASSPORT_HEX environment variable is not set");
    }
  }

  async execute(_event: any, client: NostrClient): Promise<void> {
    if (!this.passportPrivateKey) {
      console.error("Passport private key is not available");
      return;
    }
    
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
 * 環境変数から自動で設定を取得
 */
export function createPassportAction(
  targetNpub?: string,
  passportPrivateKey?: string
): PassportAction {
  return new PassportAction(targetNpub, passportPrivateKey);
}

/**
 * 環境変数に基づいてパスポート機能が利用可能かチェック
 */
export function isPassportAvailable(): boolean {
  return !!process.env.PASSPORT_HEX;
} 