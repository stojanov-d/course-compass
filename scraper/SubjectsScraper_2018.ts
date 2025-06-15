import axios from "axios";
import * as cheerio from "cheerio";
import { Subject } from "./types";
import { config } from "./config";

function getProgramLinks(): { url: string; name: string }[] {
  const scraperConfig = config.scrapers["2018"];
  return scraperConfig.programUrls.map((url, index) => ({
    url,
    name: scraperConfig.programNames[index],
  }));
}

async function getSubjectCode(url: string): Promise<string | null> {
  try {
    const httpConfig = config.http;
    const response = await axios.get(url, {
      timeout: httpConfig.timeout,
      headers: {
        "User-Agent": httpConfig.userAgent,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "mk,en-US;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      maxRedirects: httpConfig.maxRedirects,
      validateStatus: (status) => status < 500,
    });

    if (response.status !== 200) return null;

    const $ = cheerio.load(response.data);
    const codeSelectors = [
      "div.field.field-name-field-subjectcode.field-type-text.field-label-above > div.field-items > div",
      ".field-name-field-subjectcode .field-items div",
      ".field-subjectcode .field-items div",
      "div[class*='subjectcode'] div.field-item",
      ".field-type-text .field-items div",
    ];

    for (const selector of codeSelectors) {
      const codeElement = $(selector);
      if (codeElement.length > 0) {
        const code = codeElement.first().text().trim();
        if (code && code.length > 0) {
          return code;
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function scrapeSubjectsFromPage(
  url: string,
  programName: string
): Promise<Subject[]> {
  try {
    const httpConfig = config.http;
    const scraperConfig = config.scrapers["2018"];

    const response = await axios.get(url, {
      timeout: httpConfig.timeout,
      headers: {
        "User-Agent": httpConfig.userAgent,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "mk,en-US;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      maxRedirects: httpConfig.maxRedirects,
    });

    const $ = cheerio.load(response.data);
    const subjects: Subject[] = [];
    const cleanProgramName = programName.replace(/\s+/g, " ").trim();

    const subjectData: Array<{
      name: string;
      link: string;
      type: "Mandatory" | "Elective";
    }> = [];

    $(".view-grouping").each((_, grouping) => {
      const $grouping = $(grouping);

      $grouping.find("table.views-table").each((_, table) => {
        const $table = $(table);
        const caption = $table.find("caption").text().trim();
        const isMandatory = caption.includes("Задолжителни предмети");
        const subjectType = isMandatory ? "Mandatory" : "Elective";

        $table.find("tbody tr").each((_, row) => {
          const $row = $(row);
          const tds = $row.find("td");

          if (tds.length >= 3) {
            const $firstTd = $(tds[0]);
            const anchor = $firstTd.find("a");
            const subjectName = anchor.text().trim();
            const subjectLink = anchor.attr("href");

            if (subjectName && subjectLink) {
              const fullSubjectLink = subjectLink.startsWith("http")
                ? subjectLink
                : `https://www.finki.ukim.mk${subjectLink}`;

              subjectData.push({
                name: subjectName,
                link: fullSubjectLink,
                type: subjectType,
              });
            }
          }
        });
      });
    });

    if (scraperConfig.batching.enabled) {
      const batchSize = scraperConfig.batching.batchSize;

      for (let i = 0; i < subjectData.length; i += batchSize) {
        const batch = subjectData.slice(i, i + batchSize);

        const batchPromises = batch.map(
          async (data): Promise<Subject | null> => {
            try {
              const subjectCode = await getSubjectCode(data.link);
              if (subjectCode) {
                return {
                  code: [subjectCode],
                  name: data.name,
                  link: data.link,
                  studyPrograms: [{ name: cleanProgramName, type: data.type }],
                };
              }
            } catch (error) {
              return null;
            }
            return null;
          }
        );

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach((result) => {
          if (result !== null) {
            subjects.push(result);
          }
        });

        if (i + batchSize < subjectData.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, scraperConfig.delays.betweenBatches)
          );
        }
      }
    } else {
      for (const data of subjectData) {
        try {
          const subjectCode = await getSubjectCode(data.link);
          if (subjectCode) {
            subjects.push({
              code: [subjectCode],
              name: data.name,
              link: data.link,
              studyPrograms: [{ name: cleanProgramName, type: data.type }],
            });
          }

          await new Promise((resolve) =>
            setTimeout(resolve, scraperConfig.delays.betweenSubjects)
          );
        } catch (error) {
          continue;
        }
      }
    }

    return subjects;
  } catch (error) {
    return [];
  }
}

export class SubjectsScraper_2018 {
  private static instance: SubjectsScraper_2018;

  public static getInstance(): SubjectsScraper_2018 {
    if (!SubjectsScraper_2018.instance) {
      SubjectsScraper_2018.instance = new SubjectsScraper_2018();
    }
    return SubjectsScraper_2018.instance;
  }
  public async scrapeSubjects(): Promise<Subject[]> {
    const scraperConfig = config.scrapers["2018"];

    if (!scraperConfig.enabled) {
      return [];
    }

    const programs = getProgramLinks();
    const subjectsMap = new Map<string, Subject>();

    for (let i = 0; i < programs.length; i++) {
      const program = programs[i];

      try {
        const subjects = await scrapeSubjectsFromPage(
          program.url,
          program.name
        );

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
      } catch (error) {
        continue;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, scraperConfig.delays.betweenPrograms)
      );
    }

    return Array.from(subjectsMap.values()).map((subject) => ({
      ...subject,
      studyPrograms: subject.studyPrograms.map((sp) => ({
        name: sp.name.replace(/\s+/g, " ").trim(),
        type: sp.type,
      })),
    }));
  }
}
