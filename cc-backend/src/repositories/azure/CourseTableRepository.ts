import { TableClient } from '@azure/data-tables';
import { TABLE_NAMES } from '../../config/tableStorage';
import { TableService } from '../../services/TableService';
import { CourseEntity, CourseLookupEntity } from '../../entities/CourseEntity';
import ICourseRepository, {
  CourseFilters,
} from '../interfaces/ICourseRepository';

export class CourseTableRepository implements ICourseRepository {
  private coursesTable: TableClient;

  constructor(private readonly tableService = new TableService()) {
    this.coursesTable = this.tableService.getTableClient(TABLE_NAMES.COURSES);
  }

  async list(filters: CourseFilters = {}): Promise<CourseEntity[]> {
    const clauses: string[] = ["PartitionKey ne 'COURSE_CODE'"];
    if (filters.semester !== undefined) {
      clauses.push(`PartitionKey eq 'COURSE_S${filters.semester}'`);
    }
    if (filters.isActive !== undefined) {
      clauses.push(`isActive eq ${filters.isActive}`);
    }
    if (filters.minRating !== undefined) {
      clauses.push(`averageRating ge ${filters.minRating}`);
    }

    const filter = clauses.length ? clauses.join(' and ') : undefined;

    const entities = this.coursesTable.listEntities({
      queryOptions: filter ? { filter } : undefined,
    });

    const results: CourseEntity[] = [];
    for await (const e of entities) {
      if (e.partitionKey === 'COURSE_CODE') continue;
      const course = this.map(e);

      if (filters.searchTerm) {
        const s = filters.searchTerm.toLowerCase();
        if (
          !course.courseName.toLowerCase().includes(s) &&
          !course.courseCode.toLowerCase().includes(s)
        ) {
          continue;
        }
      }
      if (filters.level && course.level !== filters.level) continue;
      if (
        filters.isRequired !== undefined &&
        course.isRequired !== filters.isRequired
      )
        continue;

      results.push(course);
    }

    results.sort(
      (a, b) =>
        a.semester - b.semester || a.courseCode.localeCompare(b.courseCode)
    );
    return results;
  }

  async listBySemester(semester: number): Promise<CourseEntity[]> {
    const partitionKey = `COURSE_S${semester}`;
    const entities = this.coursesTable.listEntities({
      queryOptions: { filter: `PartitionKey eq '${partitionKey}'` },
    });
    const results: CourseEntity[] = [];
    for await (const e of entities) {
      results.push(this.map(e));
    }
    return results.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  }

  async getById(courseId: string): Promise<CourseEntity | null> {
    const entities = this.coursesTable.listEntities({
      queryOptions: {
        filter: `RowKey eq '${courseId}' and PartitionKey ne 'COURSE_CODE'`,
      },
    });
    for await (const e of entities) {
      return this.map(e);
    }
    return null;
  }

  async getByCode(courseCode: string): Promise<CourseEntity | null> {
    try {
      const lookup = (await this.coursesTable.getEntity(
        'COURSE_CODE',
        courseCode
      )) as any as CourseLookupEntity;
      if (!lookup) return null;
      const entity = await this.coursesTable.getEntity(
        `COURSE_S${lookup.semester}`,
        lookup.courseId
      );
      return this.map(entity);
    } catch (err: any) {
      if (err.statusCode === 404) return null;
      throw err;
    }
  }

  async create(course: CourseEntity): Promise<void> {
    await this.coursesTable.createEntity(course as any);
  }

  async update(course: CourseEntity): Promise<void> {
    const etag = (course as any).etag;
    await this.coursesTable.updateEntity(course as any, 'Merge', {
      etag,
    });
  }

  async deleteSoft(courseId: string): Promise<boolean> {
    const course = await this.getById(courseId);
    if (!course) return false;
    course.isActive = false;
    course.updatedAt = new Date();
    await this.update(course);
    return true;
  }

  async upsertCodeLookup(
    courseCode: string,
    courseId: string,
    semester: number
  ): Promise<void> {
    const lookup = new CourseLookupEntity(
      courseCode,
      courseId,
      semester
    ) as any;
    try {
      await this.coursesTable.upsertEntity(lookup, 'Merge');
    } catch {
      await this.coursesTable.createEntity(lookup);
    }
  }

  async updateRating(
    courseId: string,
    averageRating: number,
    totalReviews: number
  ): Promise<void> {
    const course = await this.getById(courseId);
    if (!course) throw new Error('Course not found');
    course.averageRating = Math.round(averageRating * 10) / 10;
    course.totalReviews = totalReviews;
    course.updatedAt = new Date();
    await this.update(course);
  }

  private map(entity: any): CourseEntity {
    const mapped = new CourseEntity({
      courseId: entity.rowKey,
      courseCode: entity.courseCode,
      courseName: entity.courseName,
      semester: entity.semester,
      isRequired: entity.isRequired,
      credits: entity.credits,
      description: entity.description,
      link: entity.link,
      studyPrograms: entity.studyPrograms,
      prerequisites: entity.prerequisites,
      professors: entity.professors,
      level: entity.level,
      isActive: entity.isActive,
      createdAt: new Date(entity.createdAt),
      updatedAt: new Date(entity.updatedAt),
      averageRating: entity.averageRating,
      totalReviews: entity.totalReviews,
    });
    (mapped as any).etag = entity.etag;
    return mapped;
  }
}

export default CourseTableRepository;
