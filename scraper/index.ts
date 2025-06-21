import { CoursesScraper_2018 } from "./CoursesScraper_2018";
import { CoursesScraper_2023 } from "./CoursesScraper_2023";
import { ScrapingResult, Course } from "./types";
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

async function runScraper2018(): Promise<Course[]> {
  const scraper2018 = CoursesScraper_2018.getInstance();
  return await scraper2018.scrapeCourses();
}

async function runScraper2023(): Promise<Course[]> {
  const scraper2023 = CoursesScraper_2023.getInstance();
  return await scraper2023.scrapeCourses();
}

function saveResults(courses: Course[], filename: string, scraperType: string) {
  const outputConfig = config.output;

  const allPrograms = new Set<string>();
  courses.forEach((course) => {
    course.studyPrograms.forEach((program) => {
      allPrograms.add(program.name);
    });
  });

  const result: ScrapingResult = {
    success: true,
    timestamp: new Date().toISOString(),
    totalCourses: courses.length,
    totalStudyPrograms: allPrograms.size,
    multiProgramCourses: courses.filter((c) => c.studyPrograms.length > 1)
      .length,
    coursesWithMixedTypes: courses.filter((course) => {
      const types = new Set(course.studyPrograms.map((sp) => sp.type));
      return types.size > 1;
    }).length,
    courses: courses,
  };

  const outputPath = path.join(__dirname, outputConfig.directory, filename);
  fs.writeFileSync(outputPath, JSON.stringify(courses, null, 2), "utf8");

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
  courses2018: Course[],
  courses2023: Course[]
): Course[] {
  const combinedMap = new Map<string, Course>();

  courses2018.forEach((course) => {
    combinedMap.set(course.name, { ...course, code: [...course.code] });
  });

  courses2023.forEach((course) => {
    const existing = combinedMap.get(course.name);
    if (existing) {
      const existingCodes = new Set(existing.code);
      for (const code of course.code) {
        if (!existingCodes.has(code)) {
          existing.code.push(code);
        }
      }

      course.studyPrograms.forEach((newProgram) => {
        const existingProgram = existing.studyPrograms.find(
          (sp) => sp.name === newProgram.name && sp.type === newProgram.type
        );
        if (!existingProgram) {
          existing.studyPrograms.push(newProgram);
        }
      });
    } else {
      combinedMap.set(course.name, { ...course, code: [...course.code] });
    }
  });

  return Array.from(combinedMap.values());
}

function analyzeCourseOverlaps(
  courses2018: Course[],
  courses2023: Course[]
): number {
  const nameMap2018 = new Map<string, Course[]>();
  const nameMap2023 = new Map<string, Course[]>();

  courses2018.forEach((course) => {
    const normalizedName = course.name.toLowerCase().trim();
    if (!nameMap2018.has(normalizedName)) {
      nameMap2018.set(normalizedName, []);
    }
    nameMap2018.get(normalizedName)!.push(course);
  });

  courses2023.forEach((course) => {
    const normalizedName = course.name.toLowerCase().trim();
    if (!nameMap2023.has(normalizedName)) {
      nameMap2023.set(normalizedName, []);
    }
    nameMap2023.get(normalizedName)!.push(course);
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

  console.log("⌛ Scraping courses, please wait ... \n");

  try {
    let courses2018: Course[] = [];
    let courses2023: Course[] = [];

    if (choice === "2018" || choice === "both") {
      courses2018 = await runScraper2018();
      if (choice === "2018") {
        saveResults(courses2018, outputConfig.filenames["2018"], "2018");
      }
    }

    if (choice === "2023" || choice === "both") {
      courses2023 = await runScraper2023();
      if (choice === "2023") {
        saveResults(courses2023, outputConfig.filenames["2023"], "2023");
      }
    }
    if (choice === "both") {
      saveResults(courses2018, outputConfig.filenames["2018"], "2018");
      saveResults(courses2023, outputConfig.filenames["2023"], "2023");

      const overlaps = analyzeCourseOverlaps(courses2018, courses2023);
      const combinedCourses = combineResults(courses2018, courses2023);
      saveResults(combinedCourses, outputConfig.filenames.combined, "Combined");

      console.log(`\n📊 Final Results Summary:`);
      console.log(`   📚 2018 courses: ${courses2018.length}`);
      console.log(`   📚 2023 courses: ${courses2023.length}`);
      console.log(`   📚 Combined unique courses: ${combinedCourses.length}`);
      console.log(`   🔄 Duplicate courses by name: ${overlaps}`);
    }
  } catch (error) {
    const result: ScrapingResult = {
      success: false,
      timestamp: new Date().toISOString(),
      totalCourses: 0,
      totalStudyPrograms: 0,
      multiProgramCourses: 0,
      coursesWithMixedTypes: 0,
      courses: [],
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
