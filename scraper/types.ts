export interface Course {
  code: string[];
  name: string;
  link?: string;
  studyPrograms: Array<{
    name: string;
    type: "Mandatory" | "Elective";
  }>;
  description?: string;
  semester?: number;
  prerequisites?: string;
  professors?: string[];
  level?: string;
}

export interface ScrapingResult {
  success: boolean;
  timestamp: string;
  totalCourses: number;
  totalStudyPrograms: number;
  multiProgramCourses: number;
  coursesWithMixedTypes: number;
  courses: Course[];
  error?: string;
}
