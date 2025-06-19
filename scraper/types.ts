export interface Subject {
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
  totalSubjects: number;
  totalStudyPrograms: number;
  multiProgramSubjects: number;
  subjectsWithMixedTypes: number;
  subjects: Subject[];
  error?: string;
}
