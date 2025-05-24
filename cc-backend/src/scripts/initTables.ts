import { TableService } from "../services/TableService";

async function main() {
  console.log("🚀 Initializing local development tables...");

  const tableService = new TableService();
  await tableService.initializeTables();

  console.log("✅ Table initialization completed!");
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Error initializing tables:", error);
  process.exit(1);
});
