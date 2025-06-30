import { CourseService, CourseFilters } from '../../services/CourseService';
import { TableService } from '../../services/TableService';

// Mock TableService
jest.mock('../../services/TableService');

describe('CourseService', () => {
  let courseService: CourseService;
  let mockTableService: jest.Mocked<TableService>;

  beforeEach(() => {
    jest.clearAllMocks();
    courseService = new CourseService();
    mockTableService = jest.mocked(new TableService());
    (courseService as any).tableService = mockTableService;
  });

  describe('getCourses', () => {
    const mockCourses = [
      {
        partitionKey: 'COURSE_S1',
        rowKey: 'course-1',
        courseCode: 'CS101',
        courseName: 'Introduction to Programming',
        semester: 1,
        isRequired: true,
        credits: 6,
        description: 'Basic programming concepts',
        link: 'https://www.finki.ukim.mk/subject/CS101',
        studyPrograms: JSON.stringify([
          { name: 'Computer Science', type: 'Mandatory' },
        ]),
        prerequisites: 'None',
        professors: JSON.stringify(['Prof. John Doe']),
        level: 'L1',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        averageRating: 4.2,
        totalReviews: 15,
      },
      {
        partitionKey: 'COURSE_S2',
        rowKey: 'course-2',
        courseCode: 'CS201',
        courseName: 'Data Structures',
        semester: 2,
        isRequired: true,
        credits: 6,
        description: 'Advanced data structures',
        link: 'https://www.finki.ukim.mk/subject/CS201',
        studyPrograms: JSON.stringify([
          { name: 'Computer Science', type: 'Mandatory' },
        ]),
        prerequisites: 'CS101',
        professors: JSON.stringify(['Prof. Jane Smith']),
        level: 'L1',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        averageRating: 3.8,
        totalReviews: 22,
      },
      {
        partitionKey: 'COURSE_CODE',
        rowKey: 'CS101',
        courseId: 'course-1',
        semester: 1,
      },
    ];

    beforeEach(() => {
      const mockClient = {
        listEntities: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            for (const course of mockCourses) {
              yield course;
            }
          },
        }),
      };
      mockTableService.getTableClient.mockReturnValue(mockClient as any);
    });

    it('should return all courses excluding lookup entities', async () => {
      const courses = await courseService.getCourses();

      expect(courses).toHaveLength(2);
      expect(courses[0].courseCode).toBe('CS101');
      expect(courses[1].courseCode).toBe('CS201');
    });

    it('should filter courses by semester', async () => {
      const filters: CourseFilters = { semester: 1 };
      const courses = await courseService.getCourses(filters);

      expect(courses).toHaveLength(1);
      expect(courses[0].courseCode).toBe('CS101');
    });

    it('should filter courses by search term', async () => {
      const filters: CourseFilters = { searchTerm: 'data' };
      const courses = await courseService.getCourses(filters);

      expect(courses).toHaveLength(1);
      expect(courses[0].courseCode).toBe('CS201');
    });

    it('should filter courses by required status', async () => {
      const filters: CourseFilters = { isRequired: true };
      const courses = await courseService.getCourses(filters);

      expect(courses).toHaveLength(2);
    });

    it('should filter courses by active status', async () => {
      const filters: CourseFilters = { isActive: true };
      const courses = await courseService.getCourses(filters);

      expect(courses).toHaveLength(2);
    });

    it('should filter courses by minimum rating', async () => {
      const filters: CourseFilters = { minRating: 4.0 };
      const courses = await courseService.getCourses(filters);

      expect(courses).toHaveLength(1);
      expect(courses[0].courseCode).toBe('CS101');
    });

    it('should sort courses by semester and course code', async () => {
      const courses = await courseService.getCourses();

      expect(courses[0].semester).toBe(1);
      expect(courses[1].semester).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      mockTableService.getTableClient.mockImplementation(() => {
        throw new Error('Table error');
      });

      await expect(courseService.getCourses()).rejects.toThrow(
        'Failed to retrieve courses'
      );
    });
  });

  describe('getCourseById', () => {
    it('should return course by ID', async () => {
      const mockCourse = {
        rowKey: 'course-1',
        courseCode: 'CS101',
        courseName: 'Introduction to Programming',
        semester: 1,
        isRequired: true,
        credits: 6,
        description: 'Basic programming concepts',
        link: 'https://www.finki.ukim.mk/subject/CS101',
        studyPrograms: JSON.stringify([
          { name: 'Computer Science', type: 'Mandatory' },
        ]),
        prerequisites: 'None',
        professors: JSON.stringify(['Prof. John Doe']),
        level: 'L1',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        averageRating: 4.2,
        totalReviews: 15,
      };

      const mockClient = {
        listEntities: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockCourse;
          },
        }),
      };
      mockTableService.getTableClient.mockReturnValue(mockClient as any);

      const course = await courseService.getCourseById('course-1');

      expect(course).toBeDefined();
      expect(course?.courseId).toBe('course-1');
      expect(course?.courseCode).toBe('CS101');
    });

    it('should return null if course not found', async () => {
      const mockClient = {
        listEntities: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {},
        }),
      };
      mockTableService.getTableClient.mockReturnValue(mockClient as any);

      const course = await courseService.getCourseById('nonexistent');

      expect(course).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockTableService.getTableClient.mockImplementation(() => {
        throw new Error('Table error');
      });

      await expect(courseService.getCourseById('course-1')).rejects.toThrow(
        'Failed to retrieve course course-1'
      );
    });
  });

  describe('getCourseByCode', () => {
    it('should return course by code', async () => {
      const mockLookupEntity = {
        courseId: 'course-1',
        semester: 1,
      };

      const mockCourse = {
        rowKey: 'course-1',
        courseCode: 'CS101',
        courseName: 'Introduction to Programming',
        semester: 1,
        isRequired: true,
        credits: 6,
        description: 'Basic programming concepts',
        link: 'https://www.finki.ukim.mk/subject/CS101',
        studyPrograms: JSON.stringify([
          { name: 'Computer Science', type: 'Mandatory' },
        ]),
        prerequisites: 'None',
        professors: JSON.stringify(['Prof. John Doe']),
        level: 'L1',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        averageRating: 4.2,
        totalReviews: 15,
      };

      const mockClient = {
        getEntity: jest.fn().mockResolvedValue(mockLookupEntity),
        listEntities: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockCourse;
          },
        }),
      };
      mockTableService.getTableClient.mockReturnValue(mockClient as any);

      const course = await courseService.getCourseByCode('CS101');

      expect(course).toBeDefined();
      expect(course?.courseCode).toBe('CS101');
    });

    it('should return null if course code not found', async () => {
      const mockClient = {
        getEntity: jest.fn().mockRejectedValue({ statusCode: 404 }),
      };
      mockTableService.getTableClient.mockReturnValue(mockClient as any);

      const course = await courseService.getCourseByCode('NONEXISTENT');

      expect(course).toBeNull();
    });
  });

  describe('createCourse', () => {
    it('should create a new course successfully', async () => {
      const courseData = {
        courseCode: 'CS101',
        courseName: 'Introduction to Programming',
        semester: 1,
        isRequired: true,
        credits: 6,
        description: 'Basic programming concepts',
        professors: ['Prof. John Doe'],
      };

      const mockClient = {
        getEntity: jest.fn().mockRejectedValue({ statusCode: 404 }), // Course doesn't exist
        createEntity: jest.fn().mockResolvedValue({}),
        listEntities: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {},
        }),
      };
      mockTableService.getTableClient.mockReturnValue(mockClient as any);

      const course = await courseService.createCourse(courseData);

      expect(course).toBeDefined();
      expect(course.courseCode).toBe(courseData.courseCode);
      expect(course.courseName).toBe(courseData.courseName);
      expect(course.isActive).toBe(true);
      expect(mockClient.createEntity).toHaveBeenCalledTimes(2); // Course + lookup entity
    });

    it('should throw error if course code already exists', async () => {
      const courseData = {
        courseCode: 'CS101',
        courseName: 'Introduction to Programming',
        semester: 1,
        isRequired: true,
        credits: 6,
        description: 'Basic programming concepts',
        professors: ['Prof. John Doe'],
      };

      // Mock that course already exists
      const mockClient = {
        getEntity: jest.fn().mockResolvedValue({ courseId: 'existing-id' }),
        listEntities: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield {
              rowKey: 'existing-id',
              courseCode: 'CS101',
              courseName: 'Existing Course',
              semester: 1,
              isRequired: true,
              credits: 6,
              description: 'Existing description',
              link: 'https://www.finki.ukim.mk/subject/CS101',
              studyPrograms: JSON.stringify([
                { name: 'Computer Science', type: 'Mandatory' },
              ]),
              prerequisites: 'None',
              professors: JSON.stringify(['Prof. Existing']),
              level: 'L1',
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              averageRating: 0,
              totalReviews: 0,
            };
          },
        }),
      };
      mockTableService.getTableClient.mockReturnValue(mockClient as any);

      await expect(courseService.createCourse(courseData)).rejects.toThrow(
        'Course with code CS101 already exists'
      );
    });

    it('should validate semester range', async () => {
      const courseData = {
        courseCode: 'CS101',
        courseName: 'Introduction to Programming',
        semester: 9, // Invalid semester
        isRequired: true,
        credits: 6,
        description: 'Basic programming concepts',
        professors: ['Prof. John Doe'],
      };

      await expect(courseService.createCourse(courseData)).rejects.toThrow(
        'Semester must be between 1 and 8'
      );
    });

    it('should validate credits range', async () => {
      const courseData = {
        courseCode: 'CS101',
        courseName: 'Introduction to Programming',
        semester: 1,
        isRequired: true,
        credits: 15, // Invalid credits
        description: 'Basic programming concepts',
        professors: ['Prof. John Doe'],
      };

      await expect(courseService.createCourse(courseData)).rejects.toThrow(
        'Credits must be between 1 and 12'
      );
    });
  });

  describe('updateCourse', () => {
    const existingCourse = {
      rowKey: 'course-1',
      partitionKey: 'COURSE_S1',
      courseCode: 'CS101',
      courseName: 'Introduction to Programming',
      semester: 1,
      isRequired: true,
      credits: 6,
      description: 'Basic programming concepts',
      link: 'https://www.finki.ukim.mk/subject/CS101',
      studyPrograms: JSON.stringify([
        { name: 'Computer Science', type: 'Mandatory' },
      ]),
      prerequisites: 'None',
      professors: JSON.stringify(['Prof. John Doe']),
      level: 'L1',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      averageRating: 4.2,
      totalReviews: 15,
    };

    it('should update course successfully', async () => {
      const updateData = {
        courseName: 'Updated Course Name',
        description: 'Updated description',
      };

      const mockClient = {
        listEntities: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield existingCourse;
          },
        }),
        updateEntity: jest.fn().mockResolvedValue({}),
      };
      mockTableService.getTableClient.mockReturnValue(mockClient as any);

      const updatedCourse = await courseService.updateCourse(
        'course-1',
        updateData
      );

      expect(updatedCourse).toBeDefined();
      expect(updatedCourse?.courseName).toBe(updateData.courseName);
      expect(updatedCourse?.description).toBe(updateData.description);
      expect(mockClient.updateEntity).toHaveBeenCalled();
    });

    it('should return null if course not found', async () => {
      const mockClient = {
        listEntities: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {},
        }),
      };
      mockTableService.getTableClient.mockReturnValue(mockClient as any);

      const updatedCourse = await courseService.updateCourse('nonexistent', {
        courseName: 'New Name',
      });

      expect(updatedCourse).toBeNull();
    });

    it('should validate semester range when updating', async () => {
      const mockClient = {
        listEntities: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield existingCourse;
          },
        }),
      };
      mockTableService.getTableClient.mockReturnValue(mockClient as any);

      await expect(
        courseService.updateCourse('course-1', { semester: 10 })
      ).rejects.toThrow('Semester must be between 1 and 8');
    });

    it('should validate credits range when updating', async () => {
      const mockClient = {
        listEntities: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield existingCourse;
          },
        }),
      };
      mockTableService.getTableClient.mockReturnValue(mockClient as any);

      await expect(
        courseService.updateCourse('course-1', { credits: 20 })
      ).rejects.toThrow('Credits must be between 1 and 12');
    });
  });

  describe('deleteCourse', () => {
    it('should soft delete course successfully', async () => {
      const existingCourse = {
        rowKey: 'course-1',
        partitionKey: 'COURSE_S1',
        courseCode: 'CS101',
        courseName: 'Introduction to Programming',
        semester: 1,
        isRequired: true,
        credits: 6,
        description: 'Basic programming concepts',
        link: 'https://www.finki.ukim.mk/subject/CS101',
        studyPrograms: JSON.stringify([
          { name: 'Computer Science', type: 'Mandatory' },
        ]),
        prerequisites: 'None',
        professors: JSON.stringify(['Prof. John Doe']),
        level: 'L1',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        averageRating: 4.2,
        totalReviews: 15,
      };

      const mockClient = {
        listEntities: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield existingCourse;
          },
        }),
        updateEntity: jest.fn().mockResolvedValue({}),
      };
      mockTableService.getTableClient.mockReturnValue(mockClient as any);

      const result = await courseService.deleteCourse('course-1');

      expect(result).toBe(true);
      expect(mockClient.updateEntity).toHaveBeenCalled();
    });

    it('should return false if course not found', async () => {
      const mockClient = {
        listEntities: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {},
        }),
      };
      mockTableService.getTableClient.mockReturnValue(mockClient as any);

      const result = await courseService.deleteCourse('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('updateCourseRating', () => {
    it('should update course rating successfully', async () => {
      const existingCourse = {
        rowKey: 'course-1',
        partitionKey: 'COURSE_S1',
        courseCode: 'CS101',
        courseName: 'Introduction to Programming',
        semester: 1,
        isRequired: true,
        credits: 6,
        description: 'Basic programming concepts',
        link: 'https://www.finki.ukim.mk/subject/CS101',
        studyPrograms: JSON.stringify([
          { name: 'Computer Science', type: 'Mandatory' },
        ]),
        prerequisites: 'None',
        professors: JSON.stringify(['Prof. John Doe']),
        level: 'L1',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        averageRating: 4.2,
        totalReviews: 15,
      };

      const mockClient = {
        listEntities: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield existingCourse;
          },
        }),
        updateEntity: jest.fn().mockResolvedValue({}),
      };
      mockTableService.getTableClient.mockReturnValue(mockClient as any);

      await courseService.updateCourseRating('course-1', 4.5, 20);

      expect(mockClient.updateEntity).toHaveBeenCalled();
    });

    it('should throw error if course not found', async () => {
      const mockClient = {
        listEntities: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {},
        }),
      };
      mockTableService.getTableClient.mockReturnValue(mockClient as any);

      await expect(
        courseService.updateCourseRating('nonexistent', 4.5, 20)
      ).rejects.toThrow('Course not found');
    });
  });

  describe('getCourseStats', () => {
    it('should return course statistics', async () => {
      const mockCourses = [
        {
          partitionKey: 'COURSE_S1',
          rowKey: 'course-1',
          courseCode: 'CS101',
          courseName: 'Introduction to Programming',
          semester: 1,
          isRequired: true,
          credits: 6,
          description: 'Basic programming concepts',
          link: 'https://www.finki.ukim.mk/subject/CS101',
          studyPrograms: JSON.stringify([
            { name: 'Computer Science', type: 'Mandatory' },
          ]),
          prerequisites: 'None',
          professors: JSON.stringify(['Prof. John Doe']),
          level: 'L1',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          averageRating: 4.2,
          totalReviews: 15,
        },
        {
          partitionKey: 'COURSE_S1',
          rowKey: 'course-2',
          courseCode: 'MATH101',
          courseName: 'Mathematics',
          semester: 1,
          isRequired: false,
          credits: 6,
          description: 'Basic mathematics',
          link: 'https://www.finki.ukim.mk/subject/MATH101',
          studyPrograms: JSON.stringify([
            { name: 'Computer Science', type: 'Elective' },
          ]),
          prerequisites: 'None',
          professors: JSON.stringify(['Prof. Jane Smith']),
          level: 'L1',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          averageRating: 3.8,
          totalReviews: 22,
        },
        {
          partitionKey: 'COURSE_S2',
          rowKey: 'course-3',
          courseCode: 'CS201',
          courseName: 'Data Structures',
          semester: 2,
          isRequired: true,
          credits: 6,
          description: 'Advanced data structures',
          link: 'https://www.finki.ukim.mk/subject/CS201',
          studyPrograms: JSON.stringify([
            { name: 'Computer Science', type: 'Mandatory' },
          ]),
          prerequisites: 'CS101',
          professors: JSON.stringify(['Prof. Bob Wilson']),
          level: 'L1',
          isActive: false,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          averageRating: 4.5,
          totalReviews: 18,
        },
      ];

      const mockClient = {
        listEntities: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            for (const course of mockCourses) {
              yield course;
            }
          },
        }),
      };
      mockTableService.getTableClient.mockReturnValue(mockClient as any);

      const stats = await courseService.getCourseStats();

      expect(stats.totalCourses).toBe(3);
      expect(stats.activeCourses).toBe(2);
      expect(stats.requiredCourses).toBe(1);
      expect(stats.electiveCourses).toBe(1);
      expect(stats.coursesBySemester[1]).toBe(2);
      expect(stats.coursesBySemester[2]).toBe(0);
    });
  });
});
