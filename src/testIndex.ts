import dotenv from "dotenv";
import { BotTester } from "./test/BotTester.js";

dotenv.config();

const main = async () => {
  console.log("🧪 Botテストモードを開始します");
  
  const HEX = process.env.HEX;
  if (!HEX) {
    console.error("❌ HEX environment variable is required for testing");
    process.exit(1);
  }

  const tester = new BotTester(HEX);
  
  // コマンドライン引数で特定のテストを実行
  const args = process.argv.slice(2);
  const testType = args[0];

  switch (testType) {
    case "salmon":
      await tester.testSalmonBot();
      break;
    case "calendar":
      await tester.testCalendarBot();
      break;
    case "ojisan":
      await tester.testOjisanBot();
      break;
    case "monitor":
      await tester.testMonitorBot();
      break;
    case "management":
      await tester.testBotManagement();
      break;
    default:
      await tester.runAllTests();
  }

  console.log("\n✅ テスト実行完了");
  process.exit(0);
};

main().catch(console.error); 