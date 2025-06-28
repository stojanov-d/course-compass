export interface Course {
  courseId: string;
  courseCode: string;
  courseName: string;
  semester: number; // 1-8
  isRequired: boolean;
  credits: number;
  description: string;
  link?: string;
  studyPrograms: Array<{
    name: string;
    type: 'Mandatory' | 'Elective';
  }>;
  prerequisites?: string;
  professors?: string[];
  level?: string;
  isActive: boolean;
  averageRating?: number;
  totalReviews?: number;
}

export interface CourseFilters {
  semester?: number;
  isRequired?: boolean;
  isActive?: boolean;
  searchTerm?: string;
  level?: string;
  minCredits?: number;
  maxCredits?: number;
  minRating?: number;
}

export interface CoursesResponse {
  courses: Course[];
  total: number;
  filters: CourseFilters;
}

export interface CoursesBySemesterResponse {
  semester: number;
  courses: Course[];
  total: number;
}

export interface CourseStats {
  totalCourses: number;
  activeCourses: number;
  coursesBySemester: Record<number, number>;
  requiredCourses: number;
  electiveCourses: number;
}
