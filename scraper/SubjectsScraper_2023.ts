import * as cheerio from "cheerio";
import axios from "axios";
import { Subject } from "./types";
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

async function scrapeSubjectDetails(subjectUrl: string): Promise<{
  semester?: number;
  prerequisites?: string;
  description?: string;
  professors?: string[];
}> {
  try {
    const response = await axios.get(subjectUrl);
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
    console.error(`Error scraping details for ${subjectUrl}:`, error);
    return {};
  }
}

async function scrapeSubjectsFromPage(
  url: string,
  programName: string
): Promise<Subject[]> {
  try {
    if (url.endsWith("/en")) return [];

    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const subjects: Subject[] = [];
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
            const subjectCode = $(tds[0]).find("span").text().trim();
            const anchor = $(tds[1]).find("a");
            const subjectName = anchor.text().trim();
            const subjectLink = anchor.attr("href");
            const subjectLevel = subjectCode.match(/L[1-3]/)?.[0];
            if (subjectCode.startsWith("F23") && subjectName) {
              subjects.push({
                code: [subjectCode],
                name: subjectName,
                link: subjectLink
                  ? `https://www.finki.ukim.mk${subjectLink}`
                  : undefined,
                studyPrograms: [{ name: cleanProgramName, type: "Mandatory" }],
                level: subjectLevel,
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
              const subjectCode = $(tds[0]).text().trim();
              const anchor = $(tds[1]).find("a");
              const subjectName =
                anchor.length > 0
                  ? anchor.text().trim()
                  : $(tds[1]).text().trim();
              const subjectLink = anchor.attr("href");

              if (subjectCode.startsWith("F23") && subjectName) {
                subjects.push({
                  code: [subjectCode],
                  name: subjectName,
                  link: subjectLink
                    ? `https://www.finki.ukim.mk${subjectLink}`
                    : undefined, // Capture the link!
                  studyPrograms: [{ name: cleanProgramName, type: "Elective" }],
                });
              }
            }
          });
        }
      }
    });

    return subjects;
  } catch (error) {
    return [];
  }
}

export class SubjectsScraper_2023 {
  private static instance: SubjectsScraper_2023;

  public static getInstance(): SubjectsScraper_2023 {
    if (!SubjectsScraper_2023.instance) {
      SubjectsScraper_2023.instance = new SubjectsScraper_2023();
    }
    return SubjectsScraper_2023.instance;
  }

  public async scrapeSubjects(): Promise<Subject[]> {
    const scraperConfig = config.scrapers["2023"];

    if (!scraperConfig.enabled) {
      return [];
    }

    const programs = await getProgrameLinks();
    const subjectsMap = new Map<string, Subject>();

    for (const program of programs) {
      console.log(`Scraping program: ${program.name}`);
      const subjects = await scrapeSubjectsFromPage(program.url, program.name);

      for (const subject of subjects) {
        const existingSubject = subjectsMap.get(subject.name);

        if (existingSubject) {
          const existingCodes = new Set(existingSubject.code);
          for (const code of subject.code) {
            if (!existingCodes.has(code)) {
              existingSubject.code.push(code);
            }
          }

          const cleanProgramName = program.name.replace(/\s+/g, " ").trim();
          const existingProgram = existingSubject.studyPrograms.find(
            (sp) => sp.name === cleanProgramName
          );

          if (!existingProgram) {
            existingSubject.studyPrograms.push(...subject.studyPrograms);
          }
        } else {
          subjectsMap.set(subject.name, subject);
        }
      }

      await new Promise((resolve) =>
        setTimeout(resolve, scraperConfig.delays.betweenPrograms)
      );
    }

    const subjects = Array.from(subjectsMap.values()).map((subject) => ({
      ...subject,
      studyPrograms: subject.studyPrograms.map((sp) => ({
        name: sp.name.replace(/\s+/g, " ").trim(),
        type: sp.type,
      })),
    }));

    return await this.enrichSubjectsWithDetails(subjects);
  }

  private async enrichSubjectsWithDetails(
    subjects: Subject[]
  ): Promise<Subject[]> {
    console.log(
      `Enriching ${subjects.length} subjects with detailed information...`
    );

    const subjectsWithLinks = subjects.filter((s) => s.link);
    console.log(
      `Found ${subjectsWithLinks.length} subjects with links to enrich.`
    );

    const enrichedSubjects = [...subjects];

    for (let i = 0; i < enrichedSubjects.length; i++) {
      const subject = enrichedSubjects[i];
      if (subject.link) {
        console.log(
          `Enriching: ${subject.name} (${
            subjectsWithLinks.indexOf(subject) + 1
          }/${subjectsWithLinks.length})`
        );
        try {
          const details = await scrapeSubjectDetails(subject.link);

          if (details.semester !== undefined) {
            subject.semester = details.semester;
          }
          if (details.prerequisites) {
            subject.prerequisites = details.prerequisites;
          }
          if (details.description) {
            subject.description = details.description;
          }
          if (details.professors) {
            (subject as any).professors = details.professors;
          }

          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Failed to enrich details for ${subject.name}:`, error);
        }
      }
    }

    return enrichedSubjects;
  }
}
