import * as cheerio from "cheerio";
import axios from "axios";
import { Course } from "./types";
import { config } from "./config";

async function getProgrameLinks(): Promise<{ url: string; name: string }[]> {
  const scraperConfig = config.scrapers["2023"];
  const baseUrl = "https://www.finki.ukim.mk";

  try {
    const response = await axios.get(scraperConfig.baseUrl);
    const $ = cheerio.load(response.data);

    return $(
      "#block-views-akreditacija-2023-block-1 > div > div > div > div > div > ul > li > div > a"
    )
      .map((_, element) => {
        const link = $(element).attr("href");
        const name = $(element).text().replace(/\s+/g, " ").trim();
        return link ? { url: baseUrl + link, name } : null;
      })
      .get()
      .filter(Boolean)
      .filter((program) => !program.url.endsWith("/en"));
  } catch (error) {
    return [];
  }
}

async function scrapeCourseDetails(courseUrl: string): Promise<{
  semester?: number;
  prerequisites?: string;
  description?: string;
  professors?: string[];
}> {
  try {
    const response = await axios.get(courseUrl);
    const $ = cheerio.load(response.data);

    let semester: number | undefined;
    let prerequisites: string | undefined;
    let description: string | undefined;
    let professors: string[] = [];

    const semesterSelector =
      "#block-system-main > div > div > div > div:nth-child(6) > div > div:nth-child(2) > table > tbody > tr:nth-child(6) > td:nth-child(2) > p:nth-child(2) > span:nth-child(1)";
    const professorsSelector =
      "#block-system-main > div > div > div > div:nth-child(6) > div > div:nth-child(2) > table > tbody > tr:nth-child(7) > td:nth-child(3) > p";
    const prerequisitesSelector =
      "#block-system-main > div > div > div > div:nth-child(6) > div > div:nth-child(2) > table > tbody > tr:nth-child(8) > td:nth-child(3) > p > span";
    const descriptionSelector =
      "#block-system-main > div > div > div > div:nth-child(6) > div > div:nth-child(2) > table > tbody > tr:nth-child(9) > td:nth-child(2) > p:nth-child(3) > span";

    const semesterText = $(semesterSelector).text().trim();
    if (semesterText) {
      const semesterMatch = semesterText.match(/(\d+)/);
      if (semesterMatch) {
        semester = parseInt(semesterMatch[1]);
      }
    }

    const professorsText = $(professorsSelector).text().trim();
    if (professorsText && professorsText !== "-") {
      const cleanText = professorsText
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const professorMatches = cleanText.match(
        /((?:ворн\.\s+)?(?:проф\.|доц\.|асс\.)\s+(?:д-р|м-р)\s+[А-Яа-яЁё\s]+?)(?=\s+(?:ворн\.\s+)?(?:проф\.|доц\.|асс\.)\s+(?:д-р|м-р)|$)/g
      );

      if (professorMatches) {
        professors = professorMatches
          .map((prof) => prof.trim())
          .filter((prof) => prof.length > 0 && prof !== "-")
          .map((prof) => {
            return prof.replace(/\s+/g, " ").trim();
          });
      }
    }

    const prerequisitesText = $(prerequisitesSelector).text().trim();
    if (
      prerequisitesText &&
      prerequisitesText !== "-" &&
      prerequisitesText.toLowerCase() !== "нема"
    ) {
      prerequisites = prerequisitesText;
    } else {
      prerequisites = "Нема";
    }
    const descriptionText = $(descriptionSelector).text().trim();
    if (descriptionText && descriptionText.length > 10) {
      description = descriptionText;
    }

    return {
      semester,
      prerequisites,
      description,
      professors: professors.length > 0 ? professors : undefined,
    };
  } catch (error) {
    console.error(`Error scraping details for ${courseUrl}:`, error);
    return {};
  }
}

async function scrapeCoursesFromPage(
  url: string,
  programName: string
): Promise<Course[]> {
  try {
    if (url.endsWith("/en")) return [];

    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const courses: Course[] = [];
    const cleanProgramName = programName.replace(/\s+/g, " ").trim();

    $("table.table.table-striped.table-bordered").each((_, table) => {
      const $table = $(table);
      const hasMandatoryHeader = $table
        .find("h4")
        .text()
        .includes("Задолжителни предмети");

      if (
        hasMandatoryHeader ||
        $table.closest(".col-md-6").find("h3").length > 0
      ) {
        $table.find("tr").each((_, row) => {
          const $row = $(row);
          const tds = $row.find("td");

          if (tds.length >= 2) {
            const courseCode = $(tds[0]).find("span").text().trim();
            const anchor = $(tds[1]).find("a");
            const courseName = anchor.text().trim();
            const courseLink = anchor.attr("href");
            const courseLevel = courseCode.match(/L[1-3]/)?.[0];
            if (courseCode.startsWith("F23") && courseName) {
              courses.push({
                code: [courseCode],
                name: courseName,
                link: courseLink
                  ? `https://www.finki.ukim.mk${courseLink}`
                  : undefined,
                studyPrograms: [{ name: cleanProgramName, type: "Mandatory" }],
                level: courseLevel,
              });
            }
          }
        });
      }
    });

    $("h3").each((_, heading) => {
      const $heading = $(heading);
      const headingText = $heading.text().trim();

      if (headingText.includes("Изборни предмети од група")) {
        const $table = $heading
          .nextAll("table.table.table-striped.table-bordered")
          .first();

        if ($table.length > 0) {
          $table.find("tr").each((_, row) => {
            const $row = $(row);
            const tds = $row.find("td");

            if ($row.find("th").length > 0) return;

            if (tds.length >= 2) {
              const courseCode = $(tds[0]).text().trim();
              const anchor = $(tds[1]).find("a");
              const courseName =
                anchor.length > 0
                  ? anchor.text().trim()
                  : $(tds[1]).text().trim();
              const courseLink = anchor.attr("href");

              if (courseCode.startsWith("F23") && courseName) {
                courses.push({
                  code: [courseCode],
                  name: courseName,
                  link: courseLink
                    ? `https://www.finki.ukim.mk${courseLink}`
                    : undefined, // Capture the link!
                  studyPrograms: [{ name: cleanProgramName, type: "Elective" }],
                });
              }
            }
          });
        }
      }
    });

    return courses;
  } catch (error) {
    return [];
  }
}

export class CoursesScraper_2023 {
  private static instance: CoursesScraper_2023;

  public static getInstance(): CoursesScraper_2023 {
    if (!CoursesScraper_2023.instance) {
      CoursesScraper_2023.instance = new CoursesScraper_2023();
    }
    return CoursesScraper_2023.instance;
  }

  public async scrapeCourses(): Promise<Course[]> {
    const scraperConfig = config.scrapers["2023"];

    if (!scraperConfig.enabled) {
      return [];
    }

    const programs = await getProgrameLinks();
    const coursesMap = new Map<string, Course>();

    for (const program of programs) {
      console.log(`Scraping program: ${program.name}`);
      const courses = await scrapeCoursesFromPage(program.url, program.name);

      for (const course of courses) {
        const existingCourse = coursesMap.get(course.name);

        if (existingCourse) {
          const existingCodes = new Set(existingCourse.code);
          for (const code of course.code) {
            if (!existingCodes.has(code)) {
              existingCourse.code.push(code);
            }
          }

          const cleanProgramName = program.name.replace(/\s+/g, " ").trim();
          const existingProgram = existingCourse.studyPrograms.find(
            (sp) => sp.name === cleanProgramName
          );

          if (!existingProgram) {
            existingCourse.studyPrograms.push(...course.studyPrograms);
          }
        } else {
          coursesMap.set(course.name, course);
        }
      }

      await new Promise((resolve) =>
        setTimeout(resolve, scraperConfig.delays.betweenPrograms)
      );
    }

    const coureses = Array.from(coursesMap.values()).map((course) => ({
      ...course,
      studyPrograms: course.studyPrograms.map((sp) => ({
        name: sp.name.replace(/\s+/g, " ").trim(),
        type: sp.type,
      })),
    }));

    return await this.enrichCoursesWithDetails(coureses);
  }

  private async enrichCoursesWithDetails(courses: Course[]): Promise<Course[]> {
    console.log(
      `Enriching ${courses.length} courses with detailed information...`
    );

    const coursesWithLinks = courses.filter((s) => s.link);
    console.log(
      `Found ${coursesWithLinks.length} courses with links to enrich.`
    );

    const enrichedCourses = [...courses];

    for (let i = 0; i < enrichedCourses.length; i++) {
      const course = enrichedCourses[i];
      if (course.link) {
        console.log(
          `Enriching: ${course.name} (${coursesWithLinks.indexOf(course) + 1}/${
            coursesWithLinks.length
          })`
        );
        try {
          const details = await scrapeCourseDetails(course.link);

          if (details.semester !== undefined) {
            course.semester = details.semester;
          }
          if (details.prerequisites) {
            course.prerequisites = details.prerequisites;
          }
          if (details.description) {
            course.description = details.description;
          }
          if (details.professors) {
            (course as any).professors = details.professors;
          }

          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Failed to enrich details for ${course.name}:`, error);
        }
      }
    }

    return enrichedCourses;
  }
}
