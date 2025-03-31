import cron from "node-cron";
import {
  send,
  sendOji,
  sendPassport,
  getNpub,
  isReplyToUser,
  subscribe,
  getUserMeta,
  ojisanExists,
} from "./nostr.js";
import { GoogleCalendarClient } from "./googleCalendar.js";
import { formatISO } from "date-fns";
import { OjisanClient } from "./ojisan.js";

const safelist = [
  "fe9edd5d5c635dd2900f1f86a872e81ce1d6e20bd4e06549f133ae6bf158913b",
  "98a72996aecaef8a4b708d149ad2e2db04bc8845e046c610db3b768447b43141",
];

const main = async () => {
  const googleCalendarClient = new GoogleCalendarClient();
  const ojisanClient = new OjisanClient();
  await googleCalendarClient.authorize();
  let ojisan_latest = [];
  console.log("start sub");
  subscribe(async (ev) => {
    try {
      const isReply = isReplyToUser(ev);
      if (isReply) {
        const npub = getNpub();
        if (ev.content.match(new RegExp(`^(nostr:${npub}\\s+)?予定 .*`))) {
          const calendarEvent =
            await googleCalendarClient.parseMentionToCalendarEvent(
              ev.content,
              new Date(),
            );
          let calenderUrl =
            "https://www.google.com/calendar/render?action=TEMPLATE";
          calenderUrl += `&text=${calendarEvent.summary}`;
          calenderUrl += `&details=${calendarEvent.description}`;
          calenderUrl += `&dates=${formatISO(new Date(calendarEvent.start), { format: "basic" })}`;
          calenderUrl += `/${formatISO(new Date(calendarEvent.end), { format: "basic" })}`;
          if (calendarEvent.location)
            calenderUrl += `&location=${calendarEvent.location}`;
          if (safelist.includes(ev.pubkey)) {
            await googleCalendarClient.createCalendarEvent(calendarEvent);
            send(
              `登録したで！！\n\n↓追加できなかったとき用\n${calenderUrl}`,
              ev,
            );
          } else {
            send(`自分でカレンダーに入れんかい。\n\n${calenderUrl}`, ev);
          }
        } else {
          send("コマンド確認して", ev);
        }
        // } else if (ojisanExists(ev.pubkey)) {
        //   if (
        //     ojisan_latest.includes(ev.pubkey) ||
        //     Math.random() > 0.06 ||
        //     ev.content.length < 10
        //   ) {
        //     // console.log("expire");
        //     return;
        //   }
        //   ojisan_latest = ojisan_latest.slice(0, 10);
        //   ojisan_latest.push(ev.pubkey);
        //   const profile = await getUserMeta(ev.pubkey);
        //   const post = await ojisanClient.reactionToPost(ev.content, profile);
        //   // console.log(post);
        //   sendOji(post);
      }
      console.log("test");
    } catch (ex) {
      console.error(ex);
    }
  });
};

cron.schedule("*/30 * * * *", async () => {
  process.exit();
});

// cron.schedule("0 1 * * *", async () => {
//   sendPassport();
// });

main().catch(console.error);
