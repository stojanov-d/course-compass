import { TableService } from '../services/TableService';
import { TABLE_NAMES } from '../config/tableStorage';
import * as fs from 'fs';
import * as path from 'path';

interface JsonCourse {
  code: string[];
  name: string;
  link: string;
  studyPrograms: Array<{
    name: string;
    type: string;
  }>;
  level: string;
  semester: number;
  prerequisites: string;
  description: string;
  professors?: string[];
}

export class CourseJsonLoader {
  private tableService: TableService;

  constructor() {
    this.tableService = new TableService();
  }

  private determineIfRequired(
    studyPrograms: Array<{ name: string; type: string }>
  ): boolean {
    return studyPrograms.some(
      (program) =>
        program.type === 'Mandatory' ||
        program.type === 'Задолжителен' ||
        program.type === 'задолжителен'
    );
  }

  private cleanDescription(description: string): string {
    if (!description || description === 'Нема' || description.trim() === '') {
      return 'Опис не е достапен.';
    }
    return description.trim();
  }

  private cleanPrerequisites(prerequisites: string): string {
    if (
      !prerequisites ||
      prerequisites === 'Нема' ||
      prerequisites.trim() === ''
    ) {
      return 'Нема';
    }
    return prerequisites.trim();
  }
  private mapJsonCourseToCourseEntity(jsonCourse: JsonCourse): any {
    const courseCode = jsonCourse.code[0];
    const credits = 6; // Default ECTS credits for FINKI courses
    const isRequired = this.determineIfRequired(jsonCourse.studyPrograms);

    const studyPrograms = jsonCourse.studyPrograms.map((sp) => ({
      name: sp.name,
      type:
        sp.type === 'Mandatory' ||
        sp.type === 'Задолжителен' ||
        sp.type === 'задолжителен'
          ? ('Mandatory' as const)
          : ('Elective' as const),
    }));

    const courseId = require('crypto').randomUUID();
    const partitionKey = `COURSE_S${jsonCourse.semester}`;

    return {
      partitionKey: partitionKey,
      rowKey: courseId,
      courseId: courseId,
      courseCode: courseCode,
      courseName: this.truncateString(jsonCourse.name, 255),
      semester: jsonCourse.semester,
      isRequired: isRequired,
      credits: credits,
      description: this.truncateString(
        this.cleanDescription(jsonCourse.description),
        32000
      ),
      link: jsonCourse.link || '',
      studyPrograms: this.serializeForTableStorage(studyPrograms),
      prerequisites: this.truncateString(
        this.cleanPrerequisites(jsonCourse.prerequisites),
        1000
      ),
      professors: this.serializeForTableStorage(jsonCourse.professors || []),
      level: jsonCourse.level || 'L1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      averageRating: 0,
      totalReviews: 0,
    };
  }

  private truncateString(str: string, maxLength: number): string {
    if (!str) return '';
    return str.length > maxLength
      ? str.substring(0, maxLength - 3) + '...'
      : str;
  }

  private serializeForTableStorage(data: any): string {
    try {
      const serialized = JSON.stringify(data);
      const maxSize = 64000;
      if (serialized.length > maxSize) {
        console.warn(`Data too large for table storage, truncating...`);
        return JSON.stringify(data).substring(0, maxSize - 3) + '...';
      }
      return serialized;
    } catch (error) {
      console.error('Error serializing data for table storage:', error);
      return '[]';
    }
  }

  private async batchCreateEntities(
    tableClient: any,
    entities: any[],
    batchSize: number = 100
  ): Promise<{ success: number; failed: number }> {
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);

      for (const entity of batch) {
        try {
          await tableClient.createEntity(entity);
          successCount++;

          if (successCount % 25 === 0) {
            console.log(`✅ Processed ${successCount} entities...`);
          }
        } catch (error: any) {
          console.error(`❌ Error creating entity:`, error.message);
          failedCount++;
        }
      }
    }

    return { success: successCount, failed: failedCount };
  }

  async initializeTables(): Promise<void> {
    console.log('🔄 Initializing tables...');
    await this.tableService.initializeTables();
    console.log('✅ Tables initialized successfully!');
  }

  async clearCourseTables(): Promise<void> {
    console.log('🧹 Clearing existing course data...');
    await this.tableService.clearTable(TABLE_NAMES.COURSES);
    console.log('✅ Course tables cleared!');
  }
  async loadCoursesFromJson(jsonFilePath: string): Promise<void> {
    try {
      console.log('📚 Loading courses from JSON file...');
      console.log(`📁 Reading from: ${path.resolve(jsonFilePath)}`);

      if (!fs.existsSync(jsonFilePath)) {
        throw new Error(`JSON file not found: ${jsonFilePath}`);
      }

      const jsonData = fs.readFileSync(jsonFilePath, 'utf-8');
      const jsonCourses: JsonCourse[] = JSON.parse(jsonData);

      console.log(`Found ${jsonCourses.length} courses in JSON file`);

      const validCourses = jsonCourses.filter((course) => {
        return (
          course &&
          course.name &&
          course.code &&
          course.code.length > 0 &&
          course.semester &&
          course.semester >= 1 &&
          course.semester <= 8
        );
      });

      console.log(`${validCourses.length} valid courses found`);

      const coursesTable = this.tableService.getTableClient(
        TABLE_NAMES.COURSES
      );

      const courseEntities: any[] = [];
      const lookupEntities: any[] = [];
      const processedCodes = new Set<string>();
      let skipCount = 0;

      for (const jsonCourse of validCourses) {
        try {
          const courseCode = jsonCourse.code[0];
          if (processedCodes.has(courseCode)) {
            console.warn(
              `⚠️  Duplicate course code found: ${courseCode}, skipping...`
            );
            skipCount++;
            continue;
          }
          processedCodes.add(courseCode);

          const courseEntity = this.mapJsonCourseToCourseEntity(jsonCourse);
          courseEntities.push(courseEntity);

          const lookupEntity = {
            partitionKey: 'COURSE_CODE',
            rowKey: courseEntity.courseCode,
            courseId: courseEntity.courseId,
            semester: courseEntity.semester,
          };
          lookupEntities.push(lookupEntity);
        } catch (error: any) {
          console.error(
            `❌ Error preparing course ${jsonCourse.name}:`,
            error.message
          );
          skipCount++;
        }
      }

      console.log(`Prepared ${courseEntities.length} course entities`);

      console.log('📝 Creating course entities...');
      const courseResults = await this.batchCreateEntities(
        coursesTable,
        courseEntities
      );

      console.log('🔍 Creating lookup entities...');
      const lookupResults = await this.batchCreateEntities(
        coursesTable,
        lookupEntities
      );

      const totalSuccess = courseResults.success + lookupResults.success;
      const totalFailed =
        courseResults.failed + lookupResults.failed + skipCount;

      console.log(`✅ Successfully created ${totalSuccess} entities`);
      if (totalFailed > 0) {
        console.log(`⚠️  Failed to process ${totalFailed} entities`);
      }
    } catch (error) {
      console.error('❌ Error loading courses from JSON:', error);
      throw error;
    }
  }
  async run(jsonFilePath: string): Promise<void> {
    try {
      await this.initializeTables();
      await this.clearCourseTables();
      await this.loadCoursesFromJson(jsonFilePath);
      console.log('✅ All courses loaded successfully!');
    } catch (error) {
      console.error('❌ Error during course loading:', error);
    }
  }
  static async createAndRun(jsonFilePath: string): Promise<void> {
    const loader = new CourseJsonLoader();
    await loader.run(jsonFilePath);
  }
}
