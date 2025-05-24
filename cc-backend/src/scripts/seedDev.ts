import { SeedDataGenerator } from "./SeedDataGenerator";

async function main() {
  console.log("🌱 Starting development data seeding...");

  const seeder = new SeedDataGenerator();
  await seeder.seedAll();

  console.log("✅ Development data seeding completed!");
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Error seeding data:", error);
  process.exit(1);
});
