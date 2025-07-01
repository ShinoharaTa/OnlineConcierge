import { formatISO } from "date-fns";

console.log("🔗 GoogleカレンダーURL生成テスト\n");

// 現在の実装をテスト
const testDate = new Date("2024-12-25T14:30:00+09:00");
const endDate = new Date("2024-12-25T16:30:00+09:00");

console.log("📅 元の日時:");
console.log(`開始: ${testDate.toString()}`);
console.log(`終了: ${endDate.toString()}`);
console.log(`開始(JST): ${testDate.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`);
console.log(`終了(JST): ${endDate.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}\n`);

// 既存のformatISO使用
console.log("🔧 既存のformatISO使用:");
const oldFormat1 = formatISO(testDate, { format: "basic" });
const oldFormat2 = formatISO(endDate, { format: "basic" });
console.log(`開始: ${oldFormat1}`);
console.log(`終了: ${oldFormat2}\n`);

// 改良版のフォーマット
console.log("✨ 改良版フォーマット:");
const formatDateForGoogleCalendar = (date) => {
  // UTC時間に変換してからフォーマット
  const utcDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return formatISO(utcDate, { format: "basic" }).replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
};

const newFormat1 = formatDateForGoogleCalendar(testDate);
const newFormat2 = formatDateForGoogleCalendar(endDate);
console.log(`開始: ${newFormat1}`);
console.log(`終了: ${newFormat2}\n`);

// 正しいフォーマット（Googleカレンダー推奨）
console.log("🎯 Googleカレンダー推奨フォーマット:");
const formatForGoogle = (date) => {
  // 日本時間のまま処理（シンプルで確実）
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
};

const googleFormat1 = formatForGoogle(testDate);
const googleFormat2 = formatForGoogle(endDate);
console.log(`開始: ${googleFormat1}`);
console.log(`終了: ${googleFormat2}\n`);

// 完全なURL例
const title = "テスト会議";
const description = "Bot経由で作成されたテスト予定";
const location = "東京駅";

console.log("🌐 生成されるURL例:");
let calendarUrl = "https://www.google.com/calendar/render?action=TEMPLATE";
calendarUrl += `&text=${encodeURIComponent(title)}`;
calendarUrl += `&details=${encodeURIComponent(description)}`;
calendarUrl += `&dates=${googleFormat1}/${googleFormat2}`;
calendarUrl += `&location=${encodeURIComponent(location)}`;

console.log(calendarUrl);
console.log("\n✅ テスト完了"); 