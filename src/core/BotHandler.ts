import type { Event } from "nostr-tools";
import type { NostrClient } from "./NostrClient.js";

export interface BotFilter {
  /**
   * イベントが処理対象かどうか判定する
   */
  matches(event: Event, client: NostrClient): boolean;
}

export interface BotAction {
  /**
   * フィルタにマッチしたイベントに対するアクションを実行する
   */
  execute(event: Event, client: NostrClient): Promise<void>;
}

export interface BotHandler {
  /**
   * Bot名
   */
  name: string;
  
  /**
   * フィルタ
   */
  filter: BotFilter;
  
  /**
   * アクション
   */
  action: BotAction;
  
  /**
   * 有効/無効フラグ
   */
  enabled: boolean;
}

export abstract class BaseBotFilter implements BotFilter {
  abstract matches(event: Event, client: NostrClient): boolean;
}

export abstract class BaseBotAction implements BotAction {
  abstract execute(event: Event, client: NostrClient): Promise<void>;
}

/**
 * 正規表現マッチフィルタ
 */
export class RegexFilter extends BaseBotFilter {
  constructor(private pattern: RegExp) {
    super();
  }

  matches(event: Event, client: NostrClient): boolean {
    return this.pattern.test(event.content);
  }
}

/**
 * 返信フィルタ
 */
export class ReplyFilter extends BaseBotFilter {
  matches(event: Event, client: NostrClient): boolean {
    return client.isReplyToMe(event);
  }
}

/**
 * 組み合わせフィルタ（AND条件）
 */
export class AndFilter extends BaseBotFilter {
  constructor(private filters: BotFilter[]) {
    super();
  }

  matches(event: Event, client: NostrClient): boolean {
    return this.filters.every(filter => filter.matches(event, client));
  }
}

/**
 * 組み合わせフィルタ（OR条件）
 */
export class OrFilter extends BaseBotFilter {
  constructor(private filters: BotFilter[]) {
    super();
  }

  matches(event: Event, client: NostrClient): boolean {
    return this.filters.some(filter => filter.matches(event, client));
  }
}

/**
 * 単純なテキスト応答アクション
 */
export class TextReplyAction extends BaseBotAction {
  constructor(private responseText: string) {
    super();
  }

  async execute(event: Event, client: NostrClient): Promise<void> {
    await client.sendText(this.responseText, event);
  }
} 