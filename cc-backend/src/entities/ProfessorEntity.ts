import { BaseTableEntity } from "./BaseEntity";

export interface IProfessorEntity {
  professorId: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string; // Dr., Prof., etc.
  department: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  averageRating?: number;
  totalReviews?: number;
}

export class ProfessorEntity
  extends BaseTableEntity
  implements IProfessorEntity
{
  public professorId: string;
  public firstName: string;
  public lastName: string;
  public email: string;
  public title: string;
  public department: string;
  public isActive: boolean;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(
    data: Omit<IProfessorEntity, "professorId"> & { professorId?: string }
  ) {
    const professorId = data.professorId || crypto.randomUUID();
    super("PROFESSOR", professorId);

    this.professorId = professorId;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.email = data.email;
    this.title = data.title;
    this.department = data.department;
    this.isActive = data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
