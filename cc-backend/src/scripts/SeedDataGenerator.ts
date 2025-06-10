import { TableService } from '../services/TableService';
import { TABLE_NAMES } from '../config/tableStorage';
import { UserEntity, UserRole } from '../entities/UserEntity';
import { CourseEntity, CourseLookupEntity } from '../entities/CourseEntity';
import { ProfessorEntity } from '../entities/ProfessorEntity';
import { ReviewEntity } from '../entities/ReviewEntity';
import { CommentEntity } from '../entities/CommentEntity';
import { VoteEntity } from '../entities/VoteEntity';

export class SeedDataGenerator {
  private tableService: TableService;
  private seededUsers: UserEntity[] = [];
  private seededProfessors: ProfessorEntity[] = [];
  private seededCourses: CourseEntity[] = [];
  private seededReviews: ReviewEntity[] = [];

  constructor() {
    this.tableService = new TableService();
  }

  async seedAll(): Promise<void> {
    console.log('🌱 Starting seed data generation...');

    await this.seedUsers();
    await this.seedProfessors();
    await this.seedCourses();
    await this.seedReviews();
    await this.seedComments();
    await this.seedVotes();

    console.log('✅ Seed data generation completed!');
  }

  private async seedUsers(): Promise<void> {
    console.log('👥 Seeding users...');
    const usersTable = this.tableService.getTableClient(TABLE_NAMES.USERS);

    const users = [
      new UserEntity({
        discordId: '123456789012345678',
        username: 'admin_user',
        email: 'admin@finki.ukim.mk',
        displayName: 'System Administrator',
        avatarUrl: 'https://example.com/admin-avatar.jpg',
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      }),
      new UserEntity({
        discordId: '234567890123456789',
        username: 'john_doe',
        email: 'john.doe@finki.ukim.mk',
        displayName: 'John Doe',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      }),
      new UserEntity({
        discordId: '345678901234567890',
        username: 'jane_smith',
        email: 'jane.smith@finki.ukim.mk',
        displayName: 'Jane Smith',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      new UserEntity({
        discordId: '456789012345678901',
        username: 'mike_wilson',
        email: 'mike.wilson@finki.ukim.mk',
        displayName: 'Mike Wilson',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      }),
      new UserEntity({
        discordId: '567890123456789012',
        username: 'sarah_jones',
        email: 'sarah.jones@finki.ukim.mk',
        displayName: 'Sarah Jones',
        role: UserRole.USER,
        isActive: false, // Example inactive user
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ];

    for (const user of users) {
      await usersTable.createEntity(user);
      const lookupEntity = user.toDiscordLookupEntity();
      await usersTable.createEntity(lookupEntity);
      this.seededUsers.push(user);
    }

    console.log(
      `✅ Seeded ${users.length} users (1 admin, ${users.length - 1} regular users)`
    );
  }

  private async seedProfessors(): Promise<void> {
    console.log('👨‍🏫 Seeding professors...');
    const professorsTable = this.tableService.getTableClient(
      TABLE_NAMES.PROFESSORS
    );

    const professors = [
      new ProfessorEntity({
        firstName: 'Marija',
        lastName: 'Mihova',
        email: 'marija.mihova@finki.ukim.mk',
        title: 'Prof. Dr.',
        department: 'Computer Science',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      new ProfessorEntity({
        firstName: 'Vladimir',
        lastName: 'Trajkovik',
        email: 'vladimir.trajkovik@finki.ukim.mk',
        title: 'Prof. Dr.',
        department: 'Software Engineering',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      new ProfessorEntity({
        firstName: 'Ana',
        lastName: 'Madevska',
        email: 'ana.madevska@finki.ukim.mk',
        title: 'Prof. Dr.',
        department: 'Information Systems',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      new ProfessorEntity({
        firstName: 'Dimitar',
        lastName: 'Trajanov',
        email: 'dimitar.trajanov@finki.ukim.mk',
        title: 'Prof. Dr.',
        department: 'Computer Science',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ];

    for (const professor of professors) {
      await professorsTable.createEntity(professor);
      this.seededProfessors.push(professor);
    }

    console.log(`✅ Seeded ${professors.length} professors`);
  }

  private async seedCourses(): Promise<void> {
    console.log('📚 Seeding courses...');
    const coursesTable = this.tableService.getTableClient(TABLE_NAMES.COURSES);

    const courses = [
      new CourseEntity({
        courseCode: 'CS101',
        courseName: 'Introduction to Programming',
        semester: 1,
        isRequired: true,
        credits: 6,
        description: 'Basic programming concepts and problem solving',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        averageRating: 4.2,
        totalReviews: 15,
      }),
      new CourseEntity({
        courseCode: 'CS201',
        courseName: 'Data Structures and Algorithms',
        semester: 2,
        isRequired: true,
        credits: 6,
        description: 'Fundamental data structures and algorithms',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        averageRating: 3.8,
        totalReviews: 22,
      }),
      new CourseEntity({
        courseCode: 'SE301',
        courseName: 'Software Engineering',
        semester: 3,
        isRequired: true,
        credits: 6,
        description: 'Software development methodologies and practices',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        averageRating: 4.5,
        totalReviews: 18,
      }),
      new CourseEntity({
        courseCode: 'DB401',
        courseName: 'Database Systems',
        semester: 4,
        isRequired: true,
        credits: 6,
        description: 'Relational databases, SQL, and database design',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        averageRating: 4.0,
        totalReviews: 12,
      }),
      new CourseEntity({
        courseCode: 'WEB501',
        courseName: 'Web Technologies',
        semester: 5,
        isRequired: false,
        credits: 6,
        description: 'Modern web development technologies and frameworks',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        averageRating: 4.3,
        totalReviews: 8,
      }),
    ];

    for (const course of courses) {
      await coursesTable.createEntity(course);

      const lookupEntity = new CourseLookupEntity(
        course.courseCode,
        course.courseId,
        course.semester
      );
      await coursesTable.createEntity(lookupEntity);

      this.seededCourses.push(course);
    }

    console.log(`✅ Seeded ${courses.length} courses`);
  }

  private async seedReviews(): Promise<void> {
    console.log('📝 Seeding reviews...');
    const reviewsTable = this.tableService.getTableClient(TABLE_NAMES.REVIEWS);

    const reviews = [
      // Reviews for CS101
      new ReviewEntity({
        userId: this.seededUsers[0].userId,
        courseId: this.seededCourses[0].courseId,
        professorId: this.seededProfessors[0].professorId,
        rating: 5,
        difficulty: 3,
        workload: 4,
        recommendsCourse: true,
        reviewText:
          'Great introduction to programming! Prof. Mihova explains concepts very clearly and the assignments are well-structured.',
        isAnonymous: false,
        isApproved: true,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
        upvotes: 8,
        downvotes: 1,
      }),
      new ReviewEntity({
        userId: this.seededUsers[1].userId,
        courseId: this.seededCourses[0].courseId,
        professorId: this.seededProfessors[0].professorId,
        rating: 4,
        difficulty: 4,
        workload: 5,
        recommendsCourse: true,
        reviewText:
          'Solid course but quite demanding. Make sure to practice coding regularly.',
        isAnonymous: true,
        isApproved: true,
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20'),
        upvotes: 5,
        downvotes: 0,
      }),

      // Reviews for CS201
      new ReviewEntity({
        userId: this.seededUsers[2].userId,
        courseId: this.seededCourses[1].courseId,
        professorId: this.seededProfessors[1].professorId,
        rating: 3,
        difficulty: 5,
        workload: 5,
        recommendsCourse: true,
        reviewText:
          'Very challenging course but essential for computer science. Prof. Trajkovik is demanding but fair.',
        isAnonymous: false,
        isApproved: true,
        createdAt: new Date('2024-02-10'),
        updatedAt: new Date('2024-02-10'),
        upvotes: 12,
        downvotes: 2,
      }),
      new ReviewEntity({
        userId: this.seededUsers[3].userId,
        courseId: this.seededCourses[1].courseId,
        professorId: this.seededProfessors[1].professorId,
        rating: 4,
        difficulty: 4,
        workload: 4,
        recommendsCourse: true,
        reviewText:
          'Loved the algorithmic challenges. The course really makes you think differently about problem-solving.',
        isAnonymous: false,
        isApproved: true,
        createdAt: new Date('2024-02-15'),
        updatedAt: new Date('2024-02-15'),
        upvotes: 6,
        downvotes: 0,
      }),

      // Reviews for SE301
      new ReviewEntity({
        userId: this.seededUsers[0].userId,
        courseId: this.seededCourses[2].courseId,
        professorId: this.seededProfessors[2].professorId,
        rating: 5,
        difficulty: 3,
        workload: 3,
        recommendsCourse: true,
        reviewText:
          'Excellent practical course. Team projects are very well organized and you learn real-world skills.',
        isAnonymous: false,
        isApproved: true,
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-01'),
        upvotes: 15,
        downvotes: 1,
      }),

      // Reviews for DB401
      new ReviewEntity({
        userId: this.seededUsers[1].userId,
        courseId: this.seededCourses[3].courseId,
        professorId: this.seededProfessors[3].professorId,
        rating: 4,
        difficulty: 3,
        workload: 3,
        recommendsCourse: true,
        reviewText:
          'Good coverage of database fundamentals. SQL exercises are helpful for building practical skills.',
        isAnonymous: false,
        isApproved: true,
        createdAt: new Date('2024-03-15'),
        updatedAt: new Date('2024-03-15'),
        upvotes: 7,
        downvotes: 1,
      }),
    ];

    for (const review of reviews) {
      await reviewsTable.createEntity(review);

      const userReviewEntity = review.toUserReviewEntity();
      await reviewsTable.createEntity(userReviewEntity);

      this.seededReviews.push(review);
    }

    console.log(`✅ Seeded ${reviews.length} reviews`);
  }

  private async seedComments(): Promise<void> {
    console.log('💬 Seeding comments...');
    const commentsTable = this.tableService.getTableClient(
      TABLE_NAMES.COMMENTS
    );

    const comments = [
      // Comments on first review
      new CommentEntity({
        commentId: 'comment-1',
        reviewId: this.seededReviews[0].reviewId,
        userId: this.seededUsers[1].userId,
        commentText:
          "I completely agree! Prof. Mihova is one of the best teachers I've had.",
        isAnonymous: false,
        isApproved: true,
        createdAt: new Date('2024-01-16'),
        updatedAt: new Date('2024-01-16'),
        upvotes: 3,
        downvotes: 0,
      }),
      new CommentEntity({
        commentId: 'comment-2',
        reviewId: this.seededReviews[0].reviewId,
        userId: this.seededUsers[2].userId,
        commentText:
          'The assignments really helped me understand the concepts better.',
        isAnonymous: true,
        isApproved: true,
        createdAt: new Date('2024-01-17'),
        updatedAt: new Date('2024-01-17'),
        upvotes: 2,
        downvotes: 0,
      }),

      // Comments on CS201 review
      new CommentEntity({
        commentId: 'comment-3',
        reviewId: this.seededReviews[2].reviewId,
        userId: this.seededUsers[0].userId,
        commentText:
          'Did you use any specific resources to study for this course?',
        isAnonymous: false,
        isApproved: true,
        createdAt: new Date('2024-02-11'),
        updatedAt: new Date('2024-02-11'),
        upvotes: 1,
        downvotes: 0,
      }),
      new CommentEntity({
        commentId: 'comment-4',
        reviewId: this.seededReviews[2].reviewId,
        userId: this.seededUsers[2].userId,
        parentCommentId: 'comment-3', // Reply to the previous comment
        commentText:
          "I found 'Introduction to Algorithms' by Cormen very helpful as supplementary reading.",
        isAnonymous: false,
        isApproved: true,
        createdAt: new Date('2024-02-12'),
        updatedAt: new Date('2024-02-12'),
        upvotes: 4,
        downvotes: 0,
      }),

      // Comments on SE301 review
      new CommentEntity({
        commentId: 'comment-5',
        reviewId: this.seededReviews[4].reviewId,
        userId: this.seededUsers[3].userId,
        commentText: 'What was your favorite part of the team project?',
        isAnonymous: false,
        isApproved: true,
        createdAt: new Date('2024-03-02'),
        updatedAt: new Date('2024-03-02'),
        upvotes: 1,
        downvotes: 0,
      }),
    ];

    for (const comment of comments) {
      await commentsTable.createEntity(comment);
    }

    console.log(`✅ Seeded ${comments.length} comments`);
  }

  private async seedVotes(): Promise<void> {
    console.log('🗳️ Seeding votes...');
    const votesTable = this.tableService.getTableClient(TABLE_NAMES.VOTES);

    const votes = [
      // Votes for CS101 - John Doe's review (upvotes: 8, downvotes: 1)
      ...this.createVotesForTarget('review', this.seededReviews[0].reviewId, [
        { userId: this.seededUsers[1].userId, voteType: 'upvote' },
        { userId: this.seededUsers[2].userId, voteType: 'upvote' },
        { userId: this.seededUsers[3].userId, voteType: 'upvote' },
        { userId: 'user-demo-1', voteType: 'upvote' },
        { userId: 'user-demo-2', voteType: 'upvote' },
        { userId: 'user-demo-3', voteType: 'upvote' },
        { userId: 'user-demo-4', voteType: 'upvote' },
        { userId: 'user-demo-5', voteType: 'upvote' },
        { userId: 'user-demo-6', voteType: 'downvote' },
      ]),

      // Votes for CS101 - Jane Smith's review (upvotes: 5, downvotes: 0)
      ...this.createVotesForTarget('review', this.seededReviews[1].reviewId, [
        { userId: this.seededUsers[0].userId, voteType: 'upvote' },
        { userId: this.seededUsers[2].userId, voteType: 'upvote' },
        { userId: this.seededUsers[3].userId, voteType: 'upvote' },
        { userId: 'user-demo-1', voteType: 'upvote' },
        { userId: 'user-demo-2', voteType: 'upvote' },
      ]),

      // Votes for CS201 - Mike Wilson's review (upvotes: 12, downvotes: 2)
      ...this.createVotesForTarget('review', this.seededReviews[2].reviewId, [
        { userId: this.seededUsers[0].userId, voteType: 'upvote' },
        { userId: this.seededUsers[1].userId, voteType: 'upvote' },
        { userId: this.seededUsers[3].userId, voteType: 'upvote' },
        { userId: 'user-demo-1', voteType: 'upvote' },
        { userId: 'user-demo-2', voteType: 'upvote' },
        { userId: 'user-demo-3', voteType: 'upvote' },
        { userId: 'user-demo-4', voteType: 'upvote' },
        { userId: 'user-demo-5', voteType: 'upvote' },
        { userId: 'user-demo-6', voteType: 'upvote' },
        { userId: 'user-demo-7', voteType: 'upvote' },
        { userId: 'user-demo-8', voteType: 'upvote' },
        { userId: 'user-demo-9', voteType: 'upvote' },
        { userId: 'user-demo-10', voteType: 'downvote' },
        { userId: 'user-demo-11', voteType: 'downvote' },
      ]),

      // Votes for CS201 - Sarah Jones review (upvotes: 6, downvotes: 0)
      ...this.createVotesForTarget('review', this.seededReviews[3].reviewId, [
        { userId: this.seededUsers[0].userId, voteType: 'upvote' },
        { userId: this.seededUsers[1].userId, voteType: 'upvote' },
        { userId: this.seededUsers[2].userId, voteType: 'upvote' },
        { userId: 'user-demo-1', voteType: 'upvote' },
        { userId: 'user-demo-2', voteType: 'upvote' },
        { userId: 'user-demo-3', voteType: 'upvote' },
      ]),

      // Votes for SE301 - John Doe's review (upvotes: 15, downvotes: 1)
      ...this.createVotesForTarget('review', this.seededReviews[4].reviewId, [
        { userId: this.seededUsers[1].userId, voteType: 'upvote' },
        { userId: this.seededUsers[2].userId, voteType: 'upvote' },
        { userId: this.seededUsers[3].userId, voteType: 'upvote' },
        { userId: 'user-demo-1', voteType: 'upvote' },
        { userId: 'user-demo-2', voteType: 'upvote' },
        { userId: 'user-demo-3', voteType: 'upvote' },
        { userId: 'user-demo-4', voteType: 'upvote' },
        { userId: 'user-demo-5', voteType: 'upvote' },
        { userId: 'user-demo-6', voteType: 'upvote' },
        { userId: 'user-demo-7', voteType: 'upvote' },
        { userId: 'user-demo-8', voteType: 'upvote' },
        { userId: 'user-demo-9', voteType: 'upvote' },
        { userId: 'user-demo-10', voteType: 'upvote' },
        { userId: 'user-demo-11', voteType: 'upvote' },
        { userId: 'user-demo-12', voteType: 'upvote' },
        { userId: 'user-demo-13', voteType: 'downvote' },
      ]),

      // Votes for DB401 - Jane Smith's review (upvotes: 7, downvotes: 1)
      ...this.createVotesForTarget('review', this.seededReviews[5].reviewId, [
        { userId: this.seededUsers[0].userId, voteType: 'upvote' },
        { userId: this.seededUsers[2].userId, voteType: 'upvote' },
        { userId: this.seededUsers[3].userId, voteType: 'upvote' },
        { userId: 'user-demo-1', voteType: 'upvote' },
        { userId: 'user-demo-2', voteType: 'upvote' },
        { userId: 'user-demo-3', voteType: 'upvote' },
        { userId: 'user-demo-4', voteType: 'upvote' },
        { userId: 'user-demo-5', voteType: 'downvote' },
      ]),
    ];

    // Add comment votes based on existing upvotes/downvotes
    const commentVotes = this.createCommentVotes();
    votes.push(...commentVotes);

    for (const vote of votes) {
      await votesTable.createEntity(vote);
    }

    console.log(
      `✅ Seeded ${votes.length} votes (${votes.filter((v) => v.targetType === 'review').length} review votes, ${votes.filter((v) => v.targetType === 'comment').length} comment votes)`
    );
  }

  private createVotesForTarget(
    targetType: 'review' | 'comment',
    targetId: string,
    userVotes: Array<{ userId: string; voteType: 'upvote' | 'downvote' }>
  ): VoteEntity[] {
    return userVotes.map(
      ({ userId, voteType }) =>
        new VoteEntity({
          targetType,
          targetId,
          voteType,
          userId,
          createdAt: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
          ), // Random date within last 30 days
          updatedAt: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
          ),
        })
    );
  }

  private createCommentVotes(): VoteEntity[] {
    // Comment votes need to be created based on the seeded comments
    // We'll create votes for comments that match their upvotes/downvotes counts
    const commentVotes: VoteEntity[] = [];

    // Comment 1: upvotes: 3, downvotes: 0 (comment on first review)
    const comment1Votes = this.createVotesForTarget('comment', 'comment-1', [
      { userId: this.seededUsers[0].userId, voteType: 'upvote' },
      { userId: this.seededUsers[2].userId, voteType: 'upvote' },
      { userId: this.seededUsers[3].userId, voteType: 'upvote' },
    ]);

    // Comment 2: upvotes: 2, downvotes: 0 (anonymous comment on first review)
    const comment2Votes = this.createVotesForTarget('comment', 'comment-2', [
      { userId: this.seededUsers[0].userId, voteType: 'upvote' },
      { userId: this.seededUsers[3].userId, voteType: 'upvote' },
    ]);

    // Comment 3: upvotes: 1, downvotes: 0 (comment on CS201 review)
    const comment3Votes = this.createVotesForTarget('comment', 'comment-3', [
      { userId: this.seededUsers[1].userId, voteType: 'upvote' },
    ]);

    // Comment 4: upvotes: 4, downvotes: 0 (reply comment on CS201 review)
    const comment4Votes = this.createVotesForTarget('comment', 'comment-4', [
      { userId: this.seededUsers[0].userId, voteType: 'upvote' },
      { userId: this.seededUsers[1].userId, voteType: 'upvote' },
      { userId: this.seededUsers[3].userId, voteType: 'upvote' },
      { userId: 'user-demo-1', voteType: 'upvote' },
    ]);

    // Comment 5: upvotes: 1, downvotes: 0 (comment on SE301 review)
    const comment5Votes = this.createVotesForTarget('comment', 'comment-5', [
      { userId: this.seededUsers[2].userId, voteType: 'upvote' },
    ]);

    commentVotes.push(
      ...comment1Votes,
      ...comment2Votes,
      ...comment3Votes,
      ...comment4Votes,
      ...comment5Votes
    );

    return commentVotes;
  }
}
