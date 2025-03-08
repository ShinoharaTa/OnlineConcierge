import {
  finishEvent,
  Kind,
  SimplePool,
  getPublicKey,
  nip19,
} from "nostr-tools";
import type { Event, EventTemplate } from "nostr-tools";
import { currUnixtime } from "./utils.js";
import dotenv from "dotenv";
import "websocket-polyfill";

dotenv.config();
const HEX: string = process.env.HEX ?? "";
const OJI_HEX: string = process.env.OJI_HEX ?? "";
const pool = new SimplePool();

const RELAYS = [
  "wss://relay-jp.nostr.wirednet.jp",
  "wss://r.kojira.io",
  "wss://yabu.me",
  "wss://relay-jp.shino3.net",
];

export const getUserMeta = async (pubkey: string): Promise<string> => {
  const kind0 = await pool.get(RELAYS, { kinds: [0], authors: [pubkey] });
  const userMeta = kind0
    ? JSON.parse(kind0.content)
    : { display_name: "", name: "" };
  return userMeta.display_name ?? userMeta.name;
};

export const send = async (
  content: string,
  targetEvent: Event | null = null,
): Promise<void> => {
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
  const post = finishEvent(ev, HEX);
  return new Promise((resolve) => {
    const pub = pool.publish(RELAYS, post);
    pub.on("ok", () => {
      resolve();
    });
  });
};

export const sendOji = async (
  content: string,
  targetEvent: Event | null = null,
): Promise<void> => {
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
  const post = finishEvent(ev, OJI_HEX);
  return new Promise((resolve) => {
    const pub = pool.publish(RELAYS, post);
    pub.on("ok", () => {
      resolve();
    });
  });
};

export function subscribe(callback: (ev: Event) => void): void {
  const sub = pool.sub(RELAYS, [{ kinds: [1], since: currUnixtime() }]);
  sub.on("event", callback);
}

export function isReplyToUser(ev: Event): boolean {
  return ev.tags.find((tag) => tag.includes("p"))?.[1] === getPublicKey(HEX);
}

export function ojisanExists(npub: string) {
  return nip19.npubEncode(getPublicKey(OJI_HEX)) !== npub;
}

export function getNpub(): string {
  return nip19.npubEncode(getPublicKey(HEX));
}
