import { TableService } from "../services/TableService";
import { TABLE_NAMES } from "../config/tableStorage";
import { UserEntity } from "../entities/UserEntity";
import { CourseEntity } from "../entities/CourseEntity";
import { ProfessorEntity } from "../entities/ProfessorEntity";
import { ReviewEntity } from "../entities/ReviewEntity";

export class SeedDataGenerator {
  private tableService: TableService;

  constructor() {
    this.tableService = new TableService();
  }

  async seedAll(): Promise<void> {
    console.log("🌱 Starting seed data generation...");

    await this.seedUsers();
    await this.seedProfessors();
    await this.seedCourses();
    await this.seedReviews();

    console.log("✅ Seed data generation completed!");
  }

  private async seedUsers(): Promise<void> {
    console.log("👥 Seeding users...");
    const usersTable = this.tableService.getTableClient(TABLE_NAMES.USERS);

    const users = [
      new UserEntity({
        discordId: "123456789012345678",
        username: "john_doe",
        email: "john.doe@finki.ukim.mk",
        displayName: "John Doe",
        avatarUrl: "https://example.com/avatar1.jpg",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      }),
      new UserEntity({
        discordId: "234567890123456789",
        username: "jane_smith",
        email: "jane.smith@finki.ukim.mk",
        displayName: "Jane Smith",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      }),
      new UserEntity({
        discordId: "345678901234567890",
        username: "mike_wilson",
        email: "mike.wilson@finki.ukim.mk",
        displayName: "Mike Wilson",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ];

    for (const user of users) {
      await usersTable.createEntity(user);
      const lookupEntity = user.toDiscordLookupEntity();
      await usersTable.createEntity(lookupEntity);
    }

    console.log(`✅ Seeded ${users.length} users`);
  }

  private async seedProfessors(): Promise<void> {
    console.log("👨‍🏫 Seeding professors...");
    const professorsTable = this.tableService.getTableClient(
      TABLE_NAMES.PROFESSORS
    );

    const professors = [
      new ProfessorEntity({
        firstName: "Marija",
        lastName: "Mihova",
        email: "marija.mihova@finki.ukim.mk",
        title: "Prof. Dr.",
        department: "Computer Science",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      new ProfessorEntity({
        firstName: "Vladimir",
        lastName: "Trajkovik",
        email: "vladimir.trajkovik@finki.ukim.mk",
        title: "Prof. Dr.",
        department: "Software Engineering",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      new ProfessorEntity({
        firstName: "Ana",
        lastName: "Madevska",
        email: "ana.madevska@finki.ukim.mk",
        title: "Prof. Dr.",
        department: "Information Systems",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ];

    for (const professor of professors) {
      await professorsTable.createEntity(professor);
    }

    console.log(`✅ Seeded ${professors.length} professors`);
  }

  private async seedCourses(): Promise<void> {
    console.log("📚 Seeding courses...");
    const coursesTable = this.tableService.getTableClient(TABLE_NAMES.COURSES);

    const courses = [
      new CourseEntity({
        courseCode: "CS101",
        courseName: "Introduction to Programming",
        semester: 1,
        isRequired: true,
        credits: 6,
        description: "Basic programming concepts and problem solving",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        averageRating: 4.2,
        totalReviews: 15,
      }),
      new CourseEntity({
        courseCode: "CS201",
        courseName: "Data Structures and Algorithms",
        semester: 2,
        isRequired: true,
        credits: 6,
        description: "Fundamental data structures and algorithms",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        averageRating: 3.8,
        totalReviews: 22,
      }),
      new CourseEntity({
        courseCode: "SE301",
        courseName: "Software Engineering",
        semester: 3,
        isRequired: true,
        credits: 6,
        description: "Software development methodologies and practices",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        averageRating: 4.5,
        totalReviews: 18,
      }),
    ];

    for (const course of courses) {
      await coursesTable.createEntity(course);
    }

    console.log(`✅ Seeded ${courses.length} courses`);
  }

  private async seedReviews(): Promise<void> {
    console.log("📝 Seeding reviews (structure ready for implementation)...");
    // Implementation would require getting actual user and course IDs from seeded data
    console.log(
      `ℹ️  Review seeding ready for implementation with actual entity IDs`
    );
  }
}
