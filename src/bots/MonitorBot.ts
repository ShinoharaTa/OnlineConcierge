import { BaseBotFilter, BaseBotAction, type BotHandler } from "../core/BotHandler.js";
import type { Event } from "nostr-tools";
import { nip19 } from "nostr-tools";
import type { NostrClient } from "../core/NostrClient.js";
import axios from "axios";
import dotenv from "dotenv";

// 環境変数を読み込み
dotenv.config();

// 監視設定
interface MonitorConfig {
  keywords: string[];
  npubs: string[];              // 投稿元を監視するnpub
  mentionNpubs: string[];       // メンション宛先を監視するnpub
  discordWebhookUrl: string;
  enabled: boolean;
}

/**
 * キーワードとnpub監視フィルタ
 */
class MonitorFilter extends BaseBotFilter {
  private config: MonitorConfig;

  constructor() {
    super();
    this.config = this.loadConfig();
  }

  private loadConfig(): MonitorConfig {
    // 環境変数から設定を読み込み
    const keywordsStr = process.env.MONITOR_KEYWORDS || "";
    const npubsStr = process.env.MONITOR_NPUBS || "";
    const mentionNpubsStr = process.env.MONITOR_MENTION_NPUBS || "";
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL || "";

    return {
      keywords: keywordsStr ? keywordsStr.split(',').map(k => k.trim()) : [],
      npubs: npubsStr ? npubsStr.split(',').map(n => n.trim()) : [],
      mentionNpubs: mentionNpubsStr ? mentionNpubsStr.split(',').map(n => n.trim()) : [],
      discordWebhookUrl: webhookUrl,
      enabled: !!webhookUrl // webhook URLがあれば有効
    };
  }

  matches(event: Event, client: NostrClient): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // 自分の投稿は除外
    if (event.pubkey === client.getPublicKey()) {
      return false;
    }

    const content = event.content.toLowerCase();
    const authorPubkey = event.pubkey;

    // キーワード監視
    const keywordMatched = this.config.keywords.some(keyword => 
      content.includes(keyword.toLowerCase())
    );

    // 投稿元監視 (MONITOR_NPUBS)
    const authorMatched = this.config.npubs.some(npub => {
      // npubからhex形式に変換して投稿者をチェック
      let targetPubkey = npub;
      if (npub.startsWith('npub1')) {
        try {
          const decoded = nip19.decode(npub);
          if (decoded.type === 'npub') {
            targetPubkey = decoded.data as string;
          }
        } catch (error) {
          // npubのデコードに失敗した場合はそのまま使用
        }
      }
      
      return authorPubkey === targetPubkey;
    });

    // メンション監視 (MONITOR_MENTION_NPUBS)
    const mentionMatched = this.config.mentionNpubs.some(npub => {
      return this.isNpubMentioned(event.content, npub);
    });

    return keywordMatched || authorMatched || mentionMatched;
  }

  getConfig(): MonitorConfig {
    return this.config;
  }

  // 動的にキーワードを追加
  addKeyword(keyword: string): void {
    if (!this.config.keywords.includes(keyword)) {
      this.config.keywords.push(keyword);
    }
  }

  // 動的にnpubを追加（投稿元監視）
  addNpub(npub: string): void {
    if (!this.config.npubs.includes(npub)) {
      this.config.npubs.push(npub);
    }
  }

  // 動的にメンション監視npubを追加
  addMentionNpub(npub: string): void {
    if (!this.config.mentionNpubs.includes(npub)) {
      this.config.mentionNpubs.push(npub);
    }
  }

  // 投稿内容にnpubが言及されているかチェック
  private isNpubMentioned(content: string, npub: string): boolean {
    // シンプルにnpubが投稿内容に含まれているかチェック
    // メンション検出のため、大文字小文字を無視
    const lowerContent = content.toLowerCase();
    const lowerNpub = npub.toLowerCase();
    
    return lowerContent.includes(lowerNpub);
  }
}

/**
 * Discord通知アクション
 */
class DiscordNotificationAction extends BaseBotAction {
  private filter: MonitorFilter;

  constructor(filter: MonitorFilter) {
    super();
    this.filter = filter;
  }

  async execute(event: Event, client: NostrClient): Promise<void> {
    try {
      const config = this.filter.getConfig();
      
      if (!config.discordWebhookUrl) {
        console.warn("Discord webhook URL not configured");
        return;
      }

      // ユーザー情報を取得（kind:0から）
      let userName: string;
      try {
        const userMeta = await this.getUserProfile(event.pubkey, client);
        const displayName = userMeta.display_name || "";
        const name = userMeta.name || "";
        
        if (displayName) {
          userName = displayName;
        } else if (name) {
          userName = name;
        } else {
          userName = `${event.pubkey.slice(0, 8)}...`;
        }
      } catch (error) {
        userName = `${event.pubkey.slice(0, 8)}...`;
      }

      // note1形式のIDを生成
      const noteId = nip19.noteEncode(event.id);
      const nostterUrl = `https://nostter.app/${noteId}`;
      const nostxUrl = `https://nostx.io/${noteId}`;

      // マッチした理由を特定
      const matchReasons = this.getMatchReasons(event, config);
      
      // Discord埋め込みメッセージを構築
      const embed = {
        title: userName,
        description: this.truncateText(event.content, 1000),
        fields: [
          {
            name: "日時",
            value: new Date(event.created_at * 1000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
            inline: true
          },
          {
            name: "🎯 検出理由",
            value: matchReasons.join('\n'),
            inline: false
          },
          {
            name: "Nostterで開く",
            value: `[nostter.app](${nostterUrl})`,
            inline: true
          },
          {
            name: "Nostxで開く",
            value: `[nostx.io](${nostxUrl})`,
            inline: true
          }
        ],
        footer: {
          text: "Nostrタイムライン通知Bot"
        },
        timestamp: new Date(event.created_at * 1000).toISOString()
      };

      // Discord webhookに送信
      await axios.post(config.discordWebhookUrl, {
        embeds: [embed]
      });

      console.log(`✅ Discord通知送信完了: ${matchReasons.join(', ')}`);

    } catch (error) {
      console.error("❌ Discord通知エラー:", error);
    }
  }

  private getMatchReasons(event: Event, config: MonitorConfig): string[] {
    const reasons: string[] = [];
    const content = event.content.toLowerCase();

    // キーワードマッチをチェック
    for (const keyword of config.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        reasons.push(`🔍 キーワード: "${keyword}"`);
      }
    }

    // 投稿元マッチをチェック (MONITOR_NPUBS)
    for (const npub of config.npubs) {
      // npubからhex形式に変換して投稿者をチェック
      let targetPubkey = npub;
      if (npub.startsWith('npub1')) {
        try {
          const decoded = nip19.decode(npub);
          if (decoded.type === 'npub') {
            targetPubkey = decoded.data as string;
          }
        } catch (error) {
          // npubのデコードに失敗した場合はそのまま使用
        }
      }
      
      if (event.pubkey === targetPubkey) {
        reasons.push(`👤 監視対象からの投稿: "${npub.slice(0, 16)}..."`);
      }
    }

    // メンションマッチをチェック (MONITOR_MENTION_NPUBS)
    for (const npub of config.mentionNpubs) {
      if (this.isNpubMentioned(event.content, npub)) {
        reasons.push(`💬 メンション検出: "${npub.slice(0, 16)}..."`);
      }
    }

    return reasons;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength - 3) + "...";
  }

  /**
   * ユーザープロフィール（kind:0）からname, display_nameを取得
   */
  private async getUserProfile(pubkey: string, client: NostrClient): Promise<{name?: string, display_name?: string}> {
    try {
      const userProfile = await client.getUserProfile(pubkey);
      return {
        name: userProfile.name,
        display_name: userProfile.display_name
      };
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return {};
    }
  }

  // 投稿内容にnpubが言及されているかチェック
  private isNpubMentioned(content: string, npub: string): boolean {
    // シンプルにnpubが投稿内容に含まれているかチェック
    // メンション検出のため、大文字小文字を無視
    const lowerContent = content.toLowerCase();
    const lowerNpub = npub.toLowerCase();
    
    return lowerContent.includes(lowerNpub);
  }
}

/**
 * MonitorBotを生成する
 */
export function createMonitorBot(): BotHandler {
  const filter = new MonitorFilter();
  const action = new DiscordNotificationAction(filter);

  return {
    name: "MonitorBot",
    filter: filter,
    action: action,
    enabled: filter.getConfig().enabled,
  };
}

/**
 * 監視設定の確認用関数
 */
export function getMonitorConfig(): MonitorConfig {
  const keywordsStr = process.env.MONITOR_KEYWORDS || "";
  const npubsStr = process.env.MONITOR_NPUBS || "";
  const mentionNpubsStr = process.env.MONITOR_MENTION_NPUBS || "";
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || "";

  return {
    keywords: keywordsStr ? keywordsStr.split(',').map(k => k.trim()) : [],
    npubs: npubsStr ? npubsStr.split(',').map(n => n.trim()) : [],
    mentionNpubs: mentionNpubsStr ? mentionNpubsStr.split(',').map(n => n.trim()) : [],
    discordWebhookUrl: webhookUrl,
    enabled: !!webhookUrl
  };
} 