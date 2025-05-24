import { TableService } from "../services/TableService";
import { TABLE_NAMES } from "../config/tableStorage";

async function main() {
  const args = process.argv.slice(2);
  const action = args[0];

  const tableService = new TableService();

  switch (action) {
    case "clear-all":
      console.log("🧹 Clearing all tables...");
      for (const tableName of Object.values(TABLE_NAMES)) {
        await tableService.clearTable(tableName);
      }
      break;

    case "delete-all":
      console.log("🗑️  Deleting all tables...");
      await tableService.deleteAllTables();
      break;

    case "reset":
      console.log("🔄 Resetting development environment...");
      await tableService.deleteAllTables();
      await tableService.initializeTables();
      break;

    default:
      console.log("Usage: npm run cleanup [clear-all|delete-all|reset]");
      console.log("  clear-all  - Clear data from all tables");
      console.log("  delete-all - Delete all tables");
      console.log("  reset      - Delete and recreate all tables");
      process.exit(1);
  }

  console.log("✅ Cleanup completed!");
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Error during cleanup:", error);
  process.exit(1);
});
