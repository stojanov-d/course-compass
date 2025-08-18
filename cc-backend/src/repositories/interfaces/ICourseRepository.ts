import { CourseEntity } from '../../entities/CourseEntity';

export interface CourseFilters {
  semester?: number;
  isRequired?: boolean;
  isActive?: boolean;
  searchTerm?: string;
  level?: string;
  minRating?: number;
}

export interface ICourseRepository {
  list(filters?: CourseFilters): Promise<CourseEntity[]>;
  listBySemester(semester: number): Promise<CourseEntity[]>;
  getById(courseId: string): Promise<CourseEntity | null>;
  getByCode(courseCode: string): Promise<CourseEntity | null>;
  create(course: CourseEntity): Promise<void>;
  update(course: CourseEntity): Promise<void>;
  deleteSoft(courseId: string): Promise<boolean>;
  upsertCodeLookup(
    courseCode: string,
    courseId: string,
    semester: number
  ): Promise<void>;
  updateRating(
    courseId: string,
    averageRating: number,
    totalReviews: number
  ): Promise<void>;
}

export default ICourseRepository;
