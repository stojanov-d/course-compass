import { SubjectsScraper_2018 } from "./SubjectsScraper_2018";
import { SubjectsScraper_2023 } from "./SubjectsScraper_2023";
import { ScrapingResult, Subject } from "./types";
import { config } from "./config";
import fs from "fs";
import path from "path";

function parseArgs(): {
  scraper2018: boolean;
  scraper2023: boolean;
  both: boolean;
} {
  const args = process.argv.slice(2);
  const npm2018 = process.env.npm_config_2018 === "true";
  const npm2023 = process.env.npm_config_2023 === "true";
  const npmBoth = process.env.npm_config_both === "true";

  return {
    scraper2018: args.includes("--2018") || args.includes("-18") || npm2018,
    scraper2023: args.includes("--2023") || args.includes("-23") || npm2023,
    both: args.includes("--both") || args.includes("-b") || npmBoth,
  };
}

async function runScraper2018(): Promise<Subject[]> {
  const scraper2018 = SubjectsScraper_2018.getInstance();
  return await scraper2018.scrapeSubjects();
}

async function runScraper2023(): Promise<Subject[]> {
  const scraper2023 = SubjectsScraper_2023.getInstance();
  return await scraper2023.scrapeSubjects();
}

function saveResults(
  subjects: Subject[],
  filename: string,
  scraperType: string
) {
  const outputConfig = config.output;

  const allPrograms = new Set<string>();
  subjects.forEach((subject) => {
    subject.studyPrograms.forEach((program) => {
      allPrograms.add(program.name);
    });
  });

  const result: ScrapingResult = {
    success: true,
    timestamp: new Date().toISOString(),
    totalSubjects: subjects.length,
    totalStudyPrograms: allPrograms.size,
    multiProgramSubjects: subjects.filter((s) => s.studyPrograms.length > 1)
      .length,
    subjectsWithMixedTypes: subjects.filter((subject) => {
      const types = new Set(subject.studyPrograms.map((sp) => sp.type));
      return types.size > 1;
    }).length,
    subjects: subjects,
  };

  const outputPath = path.join(__dirname, outputConfig.directory, filename);
  fs.writeFileSync(outputPath, JSON.stringify(subjects, null, 2), "utf8");

  if (outputConfig.generateSummary) {
    const summaryFilename = filename.replace(".json", "-summary.json");
    const summaryPath = path.join(
      __dirname,
      outputConfig.directory,
      summaryFilename
    );
    fs.writeFileSync(summaryPath, JSON.stringify(result, null, 2), "utf8");
    console.log(`✅ ${scraperType} summary saved to: ${summaryPath}`);
  }

  console.log(`✅ ${scraperType} results saved to: ${outputPath}`);
  return result;
}

function combineResults(
  subjects2018: Subject[],
  subjects2023: Subject[]
): Subject[] {
  const combinedMap = new Map<string, Subject>();

  subjects2018.forEach((subject) => {
    combinedMap.set(subject.name, { ...subject, code: [...subject.code] });
  });

  subjects2023.forEach((subject) => {
    const existing = combinedMap.get(subject.name);
    if (existing) {
      const existingCodes = new Set(existing.code);
      for (const code of subject.code) {
        if (!existingCodes.has(code)) {
          existing.code.push(code);
        }
      }

      subject.studyPrograms.forEach((newProgram) => {
        const existingProgram = existing.studyPrograms.find(
          (sp) => sp.name === newProgram.name && sp.type === newProgram.type
        );
        if (!existingProgram) {
          existing.studyPrograms.push(newProgram);
        }
      });
    } else {
      combinedMap.set(subject.name, { ...subject, code: [...subject.code] });
    }
  });

  return Array.from(combinedMap.values());
}

function analyzeSubjectOverlaps(
  subjects2018: Subject[],
  subjects2023: Subject[]
): number {
  const nameMap2018 = new Map<string, Subject[]>();
  const nameMap2023 = new Map<string, Subject[]>();

  subjects2018.forEach((subject) => {
    const normalizedName = subject.name.toLowerCase().trim();
    if (!nameMap2018.has(normalizedName)) {
      nameMap2018.set(normalizedName, []);
    }
    nameMap2018.get(normalizedName)!.push(subject);
  });

  subjects2023.forEach((subject) => {
    const normalizedName = subject.name.toLowerCase().trim();
    if (!nameMap2023.has(normalizedName)) {
      nameMap2023.set(normalizedName, []);
    }
    nameMap2023.get(normalizedName)!.push(subject);
  });

  let overlappingCount = 0;
  nameMap2018.forEach((_, name) => {
    if (nameMap2023.has(name)) {
      overlappingCount++;
    }
  });

  return overlappingCount;
}

async function main() {
  console.log("🚀 Course Compass Scraper Starting...\n");

  const args = parseArgs();
  const outputConfig = config.output;

  let choice: "2018" | "2023" | "both";

  if (args.both) {
    choice = "both";
  } else if (args.scraper2018) {
    choice = "2018";
  } else if (args.scraper2023) {
    choice = "2023";
  } else {
    choice = "both";
  }

  console.log(
    `📋 Selected option: ${
      choice === "both" ? "Both scrapers" : choice + " scraper"
    }\n`
  );

  console.log("⌛ Scraping subjects, please wait ... \n");

  try {
    let subjects2018: Subject[] = [];
    let subjects2023: Subject[] = [];

    if (choice === "2018" || choice === "both") {
      subjects2018 = await runScraper2018();
      if (choice === "2018") {
        saveResults(subjects2018, outputConfig.filenames["2018"], "2018");
      }
    }

    if (choice === "2023" || choice === "both") {
      subjects2023 = await runScraper2023();
      if (choice === "2023") {
        saveResults(subjects2023, outputConfig.filenames["2023"], "2023");
      }
    }
    if (choice === "both") {
      saveResults(subjects2018, outputConfig.filenames["2018"], "2018");
      saveResults(subjects2023, outputConfig.filenames["2023"], "2023");

      const overlaps = analyzeSubjectOverlaps(subjects2018, subjects2023);
      const combinedSubjects = combineResults(subjects2018, subjects2023);
      saveResults(
        combinedSubjects,
        outputConfig.filenames.combined,
        "Combined"
      );

      console.log(`\n📊 Final Results Summary:`);
      console.log(`   📚 2018 subjects: ${subjects2018.length}`);
      console.log(`   📚 2023 subjects: ${subjects2023.length}`);
      console.log(`   📚 Combined unique subjects: ${combinedSubjects.length}`);
      console.log(`   🔄 Duplicate subjects by name: ${overlaps}`);
    }
  } catch (error) {
    const result: ScrapingResult = {
      success: false,
      timestamp: new Date().toISOString(),
      totalSubjects: 0,
      totalStudyPrograms: 0,
      multiProgramSubjects: 0,
      subjectsWithMixedTypes: 0,
      subjects: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };

    console.error("❌ Error during scraping:", error);

    const outputPath = path.join(
      __dirname,
      config.output.directory,
      "scraping-error.json"
    );
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf8");
    console.log(`❌ Error result saved to: ${outputPath}`);

    throw error;
  }
}

main()
  .then(() => {
    console.log("\n✅ Script execution completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
