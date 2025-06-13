import * as cheerio from "cheerio";
import axios from "axios";
import { Subject } from "./types";

async function getProgrameLinks(): Promise<{ url: string; name: string }[]> {
  const url = "https://www.finki.ukim.mk/mk/dodiplomski-studii";
  const baseUrl = "https://www.finki.ukim.mk";

  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

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
    console.error("Error getting program links:", error);
    return [];
  }
}

async function scrapeSubjectsFromPage(
  url: string,
  programName: string
): Promise<Subject[]> {
  try {
    if (url.endsWith("/en")) return [];

    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);
    const subjects: Subject[] = [];
    const cleanProgramName = programName.replace(/\s+/g, " ").trim();

    // Scrape mandatory subjects
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

            if (subjectCode.startsWith("F23") && subjectName) {
              subjects.push({
                code: subjectCode,
                name: subjectName,
                link: subjectLink
                  ? `https://www.finki.ukim.mk${subjectLink}`
                  : undefined,
                studyPrograms: [{ name: cleanProgramName, type: "Mandatory" }],
              });
            }
          }
        });
      }
    });

    // Scrape elective subjects
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
              const subjectName = $(tds[1]).text().trim();

              if (subjectCode.startsWith("F23") && subjectName) {
                subjects.push({
                  code: subjectCode,
                  name: subjectName,
                  link: undefined,
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
    console.error(`Error scraping subjects from ${url}:`, error);
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
    try {
      const programs = await getProgrameLinks();
      const subjectsMap = new Map<string, Subject>();

      for (const program of programs) {
        const subjects = await scrapeSubjectsFromPage(
          program.url,
          program.name
        );

        for (const subject of subjects) {
          const existingSubject = subjectsMap.get(subject.code);

          if (existingSubject) {
            const cleanProgramName = program.name.replace(/\s+/g, " ").trim();
            const existingProgram = existingSubject.studyPrograms.find(
              (sp) => sp.name === cleanProgramName
            );

            if (!existingProgram) {
              existingSubject.studyPrograms.push(...subject.studyPrograms);
            }
          } else {
            subjectsMap.set(subject.code, subject);
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      return Array.from(subjectsMap.values()).map((subject) => ({
        ...subject,
        studyPrograms: subject.studyPrograms.map((sp) => ({
          name: sp.name.replace(/\s+/g, " ").trim(),
          type: sp.type,
        })),
      }));
    } catch (error) {
      console.error("Error scraping subjects:", error);
      return [];
    }
  }
}
