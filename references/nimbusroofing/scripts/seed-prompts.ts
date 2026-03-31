import { seedPrompts } from "../server/promptLibraryService";

async function main() {
  try {
    console.log("Seeding prompts...");
    await seedPrompts();
    console.log("✅ Prompts seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding prompts:", error);
    process.exit(1);
  }
}

main();
