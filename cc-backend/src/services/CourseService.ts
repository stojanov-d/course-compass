import { TableService } from './TableService';
import { CourseEntity } from '../entities/CourseEntity';
import { CourseTableRepository } from '../repositories/azure/CourseTableRepository';
import type ICourseRepository from '../repositories/interfaces/ICourseRepository';

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
  private repo: ICourseRepository;

  constructor(repo?: ICourseRepository) {
    this.tableService = new TableService();
    this.repo = repo || new CourseTableRepository(this.tableService);
  }

  async getCourses(filters: CourseFilters = {}): Promise<CourseEntity[]> {
    try {
      const connectionString = this.tableService.getConnectionString();
      console.log(
        'Storage connection string (masked):',
        connectionString?.substring(0, 50) + '...'
      );

      const courses = await this.repo.list(filters);

      console.log(`Successfully retrieved ${courses.length} courses`);

      return courses.sort((a, b) => {
        if (a.semester !== b.semester) {
          return a.semester - b.semester;
        }
        return a.courseCode.localeCompare(b.courseCode);
      });
    } catch (error: any) {
      console.error('Detailed error in getCourses:', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack,
      });
      throw new Error(`Failed to retrieve courses: ${error.message}`);
    }
  }

  async getCoursesBySemester(semester: number): Promise<CourseEntity[]> {
    try {
      const courses = await this.repo.listBySemester(semester);
      return courses.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
    } catch (error: any) {
      console.error(`Error getting courses for semester ${semester}:`, error);
      throw new Error(`Failed to retrieve courses for semester ${semester}`);
    }
  }

  async getCourseById(courseId: string): Promise<CourseEntity | null> {
    try {
      return await this.repo.getById(courseId);
    } catch (error: any) {
      console.error(`Error getting course ${courseId}:`, error);
      throw new Error(`Failed to retrieve course ${courseId}`);
    }
  }

  async getCourseByCode(courseCode: string): Promise<CourseEntity | null> {
    try {
      return await this.repo.getByCode(courseCode);
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

      await this.repo.create(course);
      await this.repo.upsertCodeLookup(
        courseData.courseCode,
        course.courseId,
        courseData.semester
      );

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

        await this.repo.create(newCourse);

        if (
          updateData.courseCode &&
          updateData.courseCode !== course.courseCode
        ) {
          await this.repo.upsertCodeLookup(
            updatedCourse.courseCode,
            course.courseId,
            updatedCourse.semester
          );
        } else {
          await this.repo.upsertCodeLookup(
            course.courseCode,
            course.courseId,
            updatedCourse.semester
          );
        }

        return newCourse;
      } else {
        Object.assign(course, updatedCourse);
        await this.repo.update(course);

        if (
          updateData.courseCode &&
          updateData.courseCode !== course.courseCode
        ) {
          await this.repo.upsertCodeLookup(
            updatedCourse.courseCode,
            course.courseId,
            course.semester
          );
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
      return await this.repo.deleteSoft(courseId);
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
      await this.repo.updateRating(courseId, newAverageRating, totalReviews);
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
}
