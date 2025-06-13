import { SubjectsScraper_2023 } from "./SubjectsScraper_2023";
import { ScrapingResult } from "./types";
import fs from "fs";
import path from "path";

async function main() {
  const result: ScrapingResult = {
    success: false,
    timestamp: new Date().toISOString(),
    totalSubjects: 0,
    totalStudyPrograms: 0,
    multiProgramSubjects: 0,
    subjectsWithMixedTypes: 0,
    subjects: [],
  };

  try {
    const scraper2023 = SubjectsScraper_2023.getInstance();
    console.log("🔍 Starting scraping process...");
    const subjects2023 = await scraper2023.scrapeSubjects();

    const allPrograms = new Set<string>();
    subjects2023.forEach((subject) => {
      subject.studyPrograms.forEach((program) => {
        allPrograms.add(program.name);
      });
    });

    result.success = true;
    result.totalSubjects = subjects2023.length;
    result.subjects = subjects2023;
    result.totalStudyPrograms = allPrograms.size;
    result.multiProgramSubjects = subjects2023.filter(
      (s) => s.studyPrograms.length > 1
    ).length;
    result.subjectsWithMixedTypes = subjects2023.filter((subject) => {
      const types = new Set(subject.studyPrograms.map((sp) => sp.type));
      return types.size > 1;
    }).length;

    console.log(`✅ Scraping completed: ${subjects2023.length} subjects found`);

    const outputPath = path.join(__dirname, "subjects.json");
    fs.writeFileSync(outputPath, JSON.stringify(subjects2023, null, 2), "utf8");

    const summaryPath = path.join(__dirname, "scraping-summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify(result, null, 2), "utf8");

    console.log(`✅ Results saved to: ${outputPath}`);
    console.log(`✅ Summary saved to: ${summaryPath}`);
  } catch (error) {
    result.success = false;
    result.error =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error("❌ Error during scraping:", error);

    const outputPath = path.join(__dirname, "scraping-error.json");
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf8");
    console.log(`❌ Error result saved to: ${outputPath}`);
  }
}

main()
  .then(() => {
    console.log("✅ Script execution completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
