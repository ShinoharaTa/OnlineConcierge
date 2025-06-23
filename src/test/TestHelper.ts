import { Event } from "nostr-tools";

// ユーティリティ関数
function currUnixtime(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * テスト用のモックイベント生成ヘルパー
 */
export class TestHelper {
  /**
   * モックイベントを生成する
   */
  static createMockEvent(
    content: string,
    pubkey: string = "test_pubkey_1234567890abcdef",
    kind: number = 1
  ): Event {
    return {
      id: `test_event_${Date.now()}`,
      pubkey: pubkey,
      created_at: currUnixtime(),
      kind: kind,
      tags: [],
      content: content,
      sig: "test_signature"
    };
  }

  /**
   * 返信イベントを生成する
   */
  static createReplyEvent(
    content: string,
    targetPubkey: string,
    targetEventId: string = "target_event_id",
    authorPubkey: string = "test_author_pubkey"
  ): Event {
    return {
      id: `reply_event_${Date.now()}`,
      pubkey: authorPubkey,
      created_at: currUnixtime(),
      kind: 1,
      tags: [
        ["e", targetEventId],
        ["p", targetPubkey]
      ],
      content: content,
      sig: "test_signature"
    };
  }

  /**
   * Bot向けメンションイベントを生成する
   */
  static createMentionEvent(
    content: string,
    botPubkey: string,
    authorPubkey: string = "test_user_pubkey"
  ): Event {
    return this.createReplyEvent(content, botPubkey, "mention_target", authorPubkey);
  }

  /**
   * テスト実行用のコンソール出力
   */
  static logTestStart(testName: string): void {
    console.log("\n" + "=".repeat(50));
    console.log(`🧪 テスト開始: ${testName}`);
    console.log("=".repeat(50));
  }

  static logTestEnd(testName: string): void {
    console.log("=".repeat(50));
    console.log(`✅ テスト完了: ${testName}`);
    console.log("=".repeat(50) + "\n");
  }
} 