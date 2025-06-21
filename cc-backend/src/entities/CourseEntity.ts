import { BaseTableEntity } from './BaseEntity';

export interface ICourseEntity {
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
  createdAt: Date;
  updatedAt: Date;
  averageRating?: number;
  totalReviews?: number;
}

export class CourseEntity extends BaseTableEntity implements ICourseEntity {
  public courseId: string;
  public courseCode: string;
  public courseName: string;
  public semester: number;
  public isRequired: boolean;
  public credits: number;
  public description: string;
  public link?: string;
  public studyPrograms: Array<{
    name: string;
    type: 'Mandatory' | 'Elective';
  }>;
  public prerequisites?: string;
  public professors?: string[];
  public level?: string;
  public isActive: boolean;
  public createdAt: Date;
  public updatedAt: Date;
  public averageRating?: number;
  public totalReviews?: number;
  constructor(data: Omit<ICourseEntity, 'courseId'> & { courseId?: string }) {
    const courseId = data.courseId || crypto.randomUUID();
    super(`COURSE_S${data.semester}`, courseId);

    this.courseId = courseId;
    this.courseCode = data.courseCode;
    this.courseName = data.courseName;
    this.semester = data.semester;
    this.isRequired = data.isRequired;
    this.credits = data.credits;
    this.description = data.description;
    this.link = data.link; // This was missing!
    this.studyPrograms = data.studyPrograms;
    this.prerequisites = data.prerequisites;
    this.professors = data.professors;
    this.level = data.level;
    this.isActive = data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.averageRating = data.averageRating;
    this.totalReviews = data.totalReviews;
  }
}

export class CourseLookupEntity extends BaseTableEntity {
  public courseId: string;
  public semester: number;

  constructor(courseCode: string, courseId: string, semester: number) {
    super('COURSE_CODE', courseCode);
    this.courseId = courseId;
    this.semester = semester;
  }
}
