import axios from "axios";
import * as cheerio from "cheerio";
import { Course } from "./types";
import { config } from "./config";

function getProgramLinks(): { url: string; name: string }[] {
  const scraperConfig = config.scrapers["2018"];
  return scraperConfig.programUrls.map((url, index) => ({
    url,
    name: scraperConfig.programNames[index],
  }));
}

async function getCourseCode(url: string): Promise<string | null> {
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

async function scrapeCoursesFromPage(
  url: string,
  programName: string
): Promise<Course[]> {
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
    const courses: Course[] = [];
    const cleanProgramName = programName.replace(/\s+/g, " ").trim();

    const courseData: Array<{
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
        const courseType = isMandatory ? "Mandatory" : "Elective";

        $table.find("tbody tr").each((_, row) => {
          const $row = $(row);
          const tds = $row.find("td");

          if (tds.length >= 3) {
            const $firstTd = $(tds[0]);
            const anchor = $firstTd.find("a");
            const courseName = anchor.text().trim();
            const courseLink = anchor.attr("href");

            if (courseName && courseLink) {
              const fullCourseLink = courseLink.startsWith("http")
                ? courseLink
                : `https://www.finki.ukim.mk${courseLink}`;

              courseData.push({
                name: courseName,
                link: fullCourseLink,
                type: courseType,
              });
            }
          }
        });
      });
    });

    if (scraperConfig.batching.enabled) {
      const batchSize = scraperConfig.batching.batchSize;

      for (let i = 0; i < courseData.length; i += batchSize) {
        const batch = courseData.slice(i, i + batchSize);

        const batchPromises = batch.map(
          async (data): Promise<Course | null> => {
            try {
              const courseCode = await getCourseCode(data.link);
              if (courseCode) {
                return {
                  code: [courseCode],
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
            courses.push(result);
          }
        });

        if (i + batchSize < courseData.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, scraperConfig.delays.betweenBatches)
          );
        }
      }
    } else {
      for (const data of courseData) {
        try {
          const courseCode = await getCourseCode(data.link);
          if (courseCode) {
            courses.push({
              code: [courseCode],
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

    return courses;
  } catch (error) {
    return [];
  }
}

export class CoursesScraper_2018 {
  private static instance: CoursesScraper_2018;

  public static getInstance(): CoursesScraper_2018 {
    if (!CoursesScraper_2018.instance) {
      CoursesScraper_2018.instance = new CoursesScraper_2018();
    }
    return CoursesScraper_2018.instance;
  }
  public async scrapeCourses(): Promise<Course[]> {
    const scraperConfig = config.scrapers["2018"];

    if (!scraperConfig.enabled) {
      return [];
    }

    const programs = getProgramLinks();
    const coursesMap = new Map<string, Course>();

    for (let i = 0; i < programs.length; i++) {
      const program = programs[i];

      try {
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
      } catch (error) {
        continue;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, scraperConfig.delays.betweenPrograms)
      );
    }

    return Array.from(coursesMap.values()).map((course) => ({
      ...course,
      studyPrograms: course.studyPrograms.map((sp) => ({
        name: sp.name.replace(/\s+/g, " ").trim(),
        type: sp.type,
      })),
    }));
  }
}
