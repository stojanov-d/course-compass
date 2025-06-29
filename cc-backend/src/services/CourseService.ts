import { TableService } from './TableService';
import { TABLE_NAMES } from '../config/tableStorage';
import { CourseEntity, CourseLookupEntity } from '../entities/CourseEntity';

export interface CourseFilters {
  semester?: number;
  isRequired?: boolean;
  isActive?: boolean;
  searchTerm?: string;
  level?: string;
  minRating?: number;
}

export interface CourseCreateRequest {
  courseCode: string;
  courseName: string;
  semester: number;
  isRequired: boolean;
  credits: number;
  description: string;
  link?: string;
  studyPrograms?: Array<{
    name: string;
    type: 'Mandatory' | 'Elective';
  }>;
  prerequisites?: string;
  professors: string[];
  level?: string;
}

export interface CourseUpdateRequest {
  courseCode?: string;
  courseName?: string;
  semester?: number;
  isRequired?: boolean;
  credits?: number;
  description?: string;
  isActive?: boolean;
  link?: string;
  prerequisites?: string;
  studyPrograms?: Array<{
    name: string;
    type: 'Mandatory' | 'Elective';
  }>;
  level?: string;
}

export class CourseService {
  private tableService: TableService;

  constructor() {
    this.tableService = new TableService();
  }

  async getCourses(filters: CourseFilters = {}): Promise<CourseEntity[]> {
    try {
      const coursesTable = this.tableService.getTableClient(
        TABLE_NAMES.COURSES
      );
      const entities = coursesTable.listEntities();
      const courses: CourseEntity[] = [];

      for await (const entity of entities) {
        if (entity.partitionKey === 'COURSE_CODE') {
          continue;
        }

        const course = this.mapTableEntityToCourse(entity);

        if (this.matchesFilters(course, filters)) {
          courses.push(course);
        }
      }

      return courses.sort((a, b) => {
        if (a.semester !== b.semester) {
          return a.semester - b.semester;
        }
        return a.courseCode.localeCompare(b.courseCode);
      });
    } catch (error: any) {
      console.error('Error getting courses:', error);
      throw new Error('Failed to retrieve courses');
    }
  }

  async getCoursesBySemester(semester: number): Promise<CourseEntity[]> {
    try {
      const coursesTable = this.tableService.getTableClient(
        TABLE_NAMES.COURSES
      );
      const partitionKey = `COURSE_S${semester}`;

      const entities = coursesTable.listEntities({
        queryOptions: {
          filter: `PartitionKey eq '${partitionKey}'`,
        },
      });

      const courses: CourseEntity[] = [];
      for await (const entity of entities) {
        courses.push(this.mapTableEntityToCourse(entity));
      }

      return courses.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
    } catch (error: any) {
      console.error(`Error getting courses for semester ${semester}:`, error);
      throw new Error(`Failed to retrieve courses for semester ${semester}`);
    }
  }

  async getCourseById(courseId: string): Promise<CourseEntity | null> {
    try {
      const coursesTable = this.tableService.getTableClient(
        TABLE_NAMES.COURSES
      );

      // We need to find the course by scanning since we don't know the partition key
      const entities = coursesTable.listEntities({
        queryOptions: {
          filter: `RowKey eq '${courseId}' and PartitionKey ne 'COURSE_CODE'`,
        },
      });

      for await (const entity of entities) {
        return this.mapTableEntityToCourse(entity);
      }

      return null;
    } catch (error: any) {
      console.error(`Error getting course ${courseId}:`, error);
      throw new Error(`Failed to retrieve course ${courseId}`);
    }
  }

  async getCourseByCode(courseCode: string): Promise<CourseEntity | null> {
    try {
      const coursesTable = this.tableService.getTableClient(
        TABLE_NAMES.COURSES
      );

      const lookupEntity = await coursesTable.getEntity(
        'COURSE_CODE',
        courseCode
      );
      if (!lookupEntity) {
        return null;
      }

      return await this.getCourseById(lookupEntity.courseId as string);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      console.error(`Error getting course by code ${courseCode}:`, error);
      throw new Error(`Failed to retrieve course with code ${courseCode}`);
    }
  }

  async createCourse(courseData: CourseCreateRequest): Promise<CourseEntity> {
    if (courseData.semester < 1 || courseData.semester > 8) {
      throw new Error('Semester must be between 1 and 8');
    }

    if (courseData.credits < 1 || courseData.credits > 12) {
      throw new Error('Credits must be between 1 and 12');
    }

    try {
      const existingCourse = await this.getCourseByCode(courseData.courseCode);
      if (existingCourse) {
        throw new Error(
          `Course with code ${courseData.courseCode} already exists`
        );
      }

      const coursesTable = this.tableService.getTableClient(
        TABLE_NAMES.COURSES
      );

      const course = new CourseEntity({
        courseCode: courseData.courseCode,
        courseName: courseData.courseName,
        semester: courseData.semester,
        isRequired: courseData.isRequired,
        credits: courseData.credits,
        description: courseData.description,
        link: courseData.link,
        studyPrograms: courseData.studyPrograms || [],
        prerequisites: courseData.prerequisites,
        professors: courseData.professors,
        level: courseData.level,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        averageRating: 0,
        totalReviews: 0,
      });

      await coursesTable.createEntity(course);

      const lookupEntity = new CourseLookupEntity(
        courseData.courseCode,
        course.courseId,
        courseData.semester
      );
      await coursesTable.createEntity(lookupEntity);

      return course;
    } catch (error: any) {
      console.error('Error creating course:', error);
      if (
        error.message.includes('already exists') ||
        error.message.includes('must be') ||
        error.message.includes('Semester must be') ||
        error.message.includes('Credits must be')
      ) {
        throw error;
      }
      throw new Error('Failed to create course');
    }
  }

  async updateCourse(
    courseId: string,
    updateData: CourseUpdateRequest
  ): Promise<CourseEntity | null> {
    try {
      const course = await this.getCourseById(courseId);
      if (!course) {
        return null;
      }

      const coursesTable = this.tableService.getTableClient(
        TABLE_NAMES.COURSES
      );

      if (
        updateData.courseCode &&
        updateData.courseCode !== course.courseCode
      ) {
        const existingCourse = await this.getCourseByCode(
          updateData.courseCode
        );
        if (existingCourse && existingCourse.courseId !== courseId) {
          throw new Error(
            `Course with code ${updateData.courseCode} already exists`
          );
        }
      }

      if (
        updateData.semester !== undefined &&
        (updateData.semester < 1 || updateData.semester > 8)
      ) {
        throw new Error('Semester must be between 1 and 8');
      }

      if (
        updateData.credits !== undefined &&
        (updateData.credits < 1 || updateData.credits > 12)
      ) {
        throw new Error('Credits must be between 1 and 12');
      }

      // Update course properties
      const updatedCourse = { ...course };
      if (updateData.courseCode !== undefined)
        updatedCourse.courseCode = updateData.courseCode;
      if (updateData.courseName !== undefined)
        updatedCourse.courseName = updateData.courseName;
      if (updateData.semester !== undefined)
        updatedCourse.semester = updateData.semester;
      if (updateData.isRequired !== undefined)
        updatedCourse.isRequired = updateData.isRequired;
      if (updateData.credits !== undefined)
        updatedCourse.credits = updateData.credits;
      if (updateData.description !== undefined)
        updatedCourse.description = updateData.description;
      if (updateData.isActive !== undefined)
        updatedCourse.isActive = updateData.isActive;
      updatedCourse.updatedAt = new Date();

      if (
        updateData.semester !== undefined &&
        updateData.semester !== course.semester
      ) {
        const newCourse = new CourseEntity({
          courseId: course.courseId,
          courseCode: updatedCourse.courseCode,
          courseName: updatedCourse.courseName,
          semester: updatedCourse.semester,
          isRequired: updatedCourse.isRequired,
          credits: updatedCourse.credits,
          description: updatedCourse.description,
          link: updatedCourse.link,
          studyPrograms: updatedCourse.studyPrograms,
          prerequisites: updatedCourse.prerequisites,
          professors: updatedCourse.professors,
          level: updatedCourse.level,
          isActive: updatedCourse.isActive,
          createdAt: updatedCourse.createdAt,
          updatedAt: updatedCourse.updatedAt,
          averageRating: updatedCourse.averageRating,
          totalReviews: updatedCourse.totalReviews,
        });

        await coursesTable.createEntity(newCourse);
        await coursesTable.deleteEntity(course.partitionKey!, course.rowKey!);

        if (
          updateData.courseCode &&
          updateData.courseCode !== course.courseCode
        ) {
          await coursesTable.deleteEntity('COURSE_CODE', course.courseCode);
          const newLookupEntity = new CourseLookupEntity(
            updatedCourse.courseCode,
            course.courseId,
            updatedCourse.semester
          );
          await coursesTable.createEntity(newLookupEntity);
        } else {
          try {
            const lookupEntity = await coursesTable.getEntity(
              'COURSE_CODE',
              course.courseCode
            );
            const updatedLookupEntity = {
              partitionKey: lookupEntity.partitionKey!,
              rowKey: lookupEntity.rowKey!,
              courseId: lookupEntity.courseId,
              semester: updatedCourse.semester,
              etag: lookupEntity.etag,
            };
            await coursesTable.updateEntity(updatedLookupEntity, 'Merge');
          } catch (error: any) {
            if (error.statusCode !== 404) {
              throw error;
            }
          }
        }

        return newCourse;
      } else {
        Object.assign(course, updatedCourse);
        await coursesTable.updateEntity(course, 'Merge');

        if (
          updateData.courseCode &&
          updateData.courseCode !== course.courseCode
        ) {
          await coursesTable.deleteEntity('COURSE_CODE', course.courseCode);
          const newLookupEntity = new CourseLookupEntity(
            updatedCourse.courseCode,
            course.courseId,
            course.semester
          );
          await coursesTable.createEntity(newLookupEntity);
        }

        return course;
      }
    } catch (error: any) {
      console.error(`Error updating course ${courseId}:`, error);
      if (
        error.message.includes('already exists') ||
        error.message.includes('must be')
      ) {
        throw error;
      }
      throw new Error(`Failed to update course ${courseId}`);
    }
  }

  async deleteCourse(courseId: string): Promise<boolean> {
    try {
      const course = await this.getCourseById(courseId);
      if (!course) {
        return false;
      }

      const coursesTable = this.tableService.getTableClient(
        TABLE_NAMES.COURSES
      );
      course.isActive = false;
      course.updatedAt = new Date();

      await coursesTable.updateEntity(course, 'Merge');
      return true;
    } catch (error: any) {
      console.error(`Error deleting course ${courseId}:`, error);
      throw new Error(`Failed to delete course ${courseId}`);
    }
  }

  async updateCourseRating(
    courseId: string,
    newAverageRating: number,
    totalReviews: number
  ): Promise<void> {
    try {
      const course = await this.getCourseById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      const coursesTable = this.tableService.getTableClient(
        TABLE_NAMES.COURSES
      );
      course.averageRating = Math.round(newAverageRating * 10) / 10; // Round to 1 decimal place
      course.totalReviews = totalReviews;
      course.updatedAt = new Date();

      await coursesTable.updateEntity(course, 'Merge');
    } catch (error: any) {
      console.error(`Error updating course rating for ${courseId}:`, error);
      if (error.message.includes('Course not found')) {
        throw error;
      }
      throw new Error(`Failed to update course rating for ${courseId}`);
    }
  }

  async getCourseStats(): Promise<{
    totalCourses: number;
    activeCourses: number;
    coursesBySemester: Record<number, number>;
    requiredCourses: number;
    electiveCourses: number;
  }> {
    try {
      const courses = await this.getCourses();

      const stats = {
        totalCourses: courses.length,
        activeCourses: courses.filter((c) => c.isActive).length,
        coursesBySemester: {} as Record<number, number>,
        requiredCourses: courses.filter((c) => c.isRequired && c.isActive)
          .length,
        electiveCourses: courses.filter((c) => !c.isRequired && c.isActive)
          .length,
      };

      for (let semester = 1; semester <= 8; semester++) {
        stats.coursesBySemester[semester] = courses.filter(
          (c) => c.semester === semester && c.isActive
        ).length;
      }

      return stats;
    } catch (error: any) {
      console.error('Error getting course statistics:', error);
      throw new Error('Failed to retrieve course statistics');
    }
  }

  private matchesFilters(
    course: CourseEntity,
    filters: CourseFilters
  ): boolean {
    if (
      filters.semester !== undefined &&
      course.semester !== filters.semester
    ) {
      return false;
    }

    if (
      filters.isRequired !== undefined &&
      course.isRequired !== filters.isRequired
    ) {
      return false;
    }

    if (
      filters.isActive !== undefined &&
      course.isActive !== filters.isActive
    ) {
      return false;
    }

    if (
      filters.minRating !== undefined &&
      (course.averageRating || 0) < filters.minRating
    ) {
      return false;
    }

    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      const courseNameText = course.courseName.toLowerCase();
      if (!courseNameText.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  }

  private mapTableEntityToCourse(entity: any): CourseEntity {
    return new CourseEntity({
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
  }
}
