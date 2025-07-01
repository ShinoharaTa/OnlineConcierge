import { runCalendarTest } from "./dist/test/CalendarTest.js";

console.log("🗓️ カレンダーBot専用テストを開始します...\n");

try {
  await runCalendarTest();
  console.log("\n✅ 全てのテストが完了しました！");
} catch (error) {
  console.error("\n❌ テストでエラーが発生しました:", error);
  process.exit(1);
} 