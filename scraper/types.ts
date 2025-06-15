export interface Subject {
  code: string[];
  name: string;
  link?: string;
  studyPrograms: Array<{
    name: string;
    type: "Mandatory" | "Elective";
  }>;
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
