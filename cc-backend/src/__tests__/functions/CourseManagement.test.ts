import { HttpRequest, InvocationContext } from '@azure/functions';
import {
  GetCourses,
  GetCoursesBySemester,
  GetCourseById,
  GetCourseByCode,
  CreateCourse,
  UpdateCourse,
  DeleteCourse,
  GetCourseStats,
} from '../../functions/CourseManagement';
import { CourseService } from '../../services/CourseService';
import { requireAdmin } from '../../middleware/authMiddleware';

// Mock dependencies
jest.mock('../../services/CourseService');
jest.mock('../../middleware/authMiddleware');

describe('Course Management Functions', () => {
  let mockCourseService: jest.Mocked<CourseService>;
  let mockContext: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCourseService = jest.mocked(new CourseService());
    (CourseService as jest.Mock).mockImplementation(() => mockCourseService);

    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
    } as any;
  });

  const createMockRequest = (
    overrides: Partial<HttpRequest> = {}
  ): HttpRequest => {
    return {
      query: new URLSearchParams(),
      params: {},
      headers: new Headers(),
      json: jest.fn(),
      text: jest.fn(),
      arrayBuffer: jest.fn(),
      formData: jest.fn(),
      url: 'http://localhost',
      method: 'GET',
      ...overrides,
    } as any;
  };

  describe('GetCourses', () => {
    it('should return courses successfully', async () => {
      const mockCourses = [
        {
          courseId: 'course-1',
          courseCode: 'CS101',
          courseName: 'Introduction to Programming',
          semester: 1,
          isRequired: true,
          credits: 6,
          description: 'Basic programming concepts',
          isActive: true,
          averageRating: 4.2,
          totalReviews: 15,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockCourseService.getCourses.mockResolvedValue(mockCourses as any);

      const mockRequest = createMockRequest();
      const response = await GetCourses(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.courses).toHaveLength(1);
      expect(response.jsonBody.courses[0].courseCode).toBe('CS101');
    });

    it('should apply filters from query parameters', async () => {
      const queryParams = new URLSearchParams([
        ['semester', '1'],
        ['isRequired', 'true'],
        ['searchTerm', 'programming'],
      ]);

      const mockRequest = createMockRequest({
        query: queryParams,
      });

      mockCourseService.getCourses.mockResolvedValue([]);

      await GetCourses(mockRequest, mockContext);

      expect(mockCourseService.getCourses).toHaveBeenCalledWith({
        semester: 1,
        isRequired: true,
        searchTerm: 'programming',
        isActive: true,
      });
    });

    it('should handle service errors', async () => {
      mockCourseService.getCourses.mockRejectedValue(
        new Error('Service error')
      );

      const mockRequest = createMockRequest();
      const response = await GetCourses(mockRequest, mockContext);

      expect(response.status).toBe(500);
      expect(response.jsonBody.error).toBe('Internal server error');
    });
  });

  describe('GetCoursesBySemester', () => {
    it('should return courses for valid semester', async () => {
      const mockRequest = createMockRequest({
        params: { semester: '1' },
      });

      const mockCourses = [
        {
          courseId: 'course-1',
          courseCode: 'CS101',
          semester: 1,
          isActive: true,
        },
      ];

      mockCourseService.getCoursesBySemester.mockResolvedValue(
        mockCourses as any
      );

      const response = await GetCoursesBySemester(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.semester).toBe(1);
      expect(response.jsonBody.courses).toHaveLength(1);
    });

    it('should return 400 for invalid semester', async () => {
      const mockRequest = createMockRequest({
        params: { semester: '10' },
      });

      const response = await GetCoursesBySemester(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody.error).toBe('Valid semester (1-8) is required');
    });
  });

  describe('GetCourseById', () => {
    it('should return course for valid ID', async () => {
      const mockRequest = createMockRequest({
        params: { courseId: 'course-1' },
      });

      const mockCourse = {
        courseId: 'course-1',
        courseCode: 'CS101',
        isActive: true,
      };

      mockCourseService.getCourseById.mockResolvedValue(mockCourse as any);

      const response = await GetCourseById(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.id).toBe('course-1');
    });

    it('should return 404 for inactive course', async () => {
      const mockRequest = createMockRequest({
        params: { courseId: 'course-1' },
      });

      const mockCourse = {
        courseId: 'course-1',
        courseCode: 'CS101',
        isActive: false,
      };

      mockCourseService.getCourseById.mockResolvedValue(mockCourse as any);

      const response = await GetCourseById(mockRequest, mockContext);

      expect(response.status).toBe(404);
      expect(response.jsonBody.error).toBe('Course not found');
    });

    it('should return 404 for non-existent course', async () => {
      const mockRequest = createMockRequest({
        params: { courseId: 'nonexistent' },
      });

      mockCourseService.getCourseById.mockResolvedValue(null);

      const response = await GetCourseById(mockRequest, mockContext);

      expect(response.status).toBe(404);
      expect(response.jsonBody.error).toBe('Course not found');
    });

    it('should return 400 for missing course ID', async () => {
      const mockRequest = createMockRequest({
        params: {},
      });

      const response = await GetCourseById(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody.error).toBe('Course ID is required');
    });
  });

  describe('GetCourseByCode', () => {
    it('should return course for valid code', async () => {
      const mockRequest = createMockRequest({
        params: { courseCode: 'CS101' },
      });

      const mockCourse = {
        courseId: 'course-1',
        courseCode: 'CS101',
        isActive: true,
      };

      mockCourseService.getCourseByCode.mockResolvedValue(mockCourse as any);

      const response = await GetCourseByCode(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.courseCode).toBe('CS101');
    });

    it('should return 404 for non-existent course code', async () => {
      const mockRequest = createMockRequest({
        params: { courseCode: 'NONEXISTENT' },
      });

      mockCourseService.getCourseByCode.mockResolvedValue(null);

      const response = await GetCourseByCode(mockRequest, mockContext);

      expect(response.status).toBe(404);
      expect(response.jsonBody.error).toBe('Course not found');
    });
  });

  describe('CreateCourse (Admin)', () => {
    beforeEach(() => {
      (requireAdmin as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { userId: 'admin-1' },
      });
    });

    it('should create course successfully with valid data', async () => {
      const courseData = {
        courseCode: 'F18L1W005',
        courseName: 'Introduction to Programming',
        semester: 1,
        isRequired: true,
        credits: 6,
        description: 'Basic programming concepts',
      };

      const mockRequest = createMockRequest({
        json: jest.fn().mockResolvedValue(courseData),
      });

      const mockCreatedCourse = {
        courseId: 'course-1',
        ...courseData,
        isActive: true,
        createdAt: new Date(),
      };

      mockCourseService.createCourse.mockResolvedValue(
        mockCreatedCourse as any
      );

      const response = await CreateCourse(mockRequest, mockContext);

      expect(response.status).toBe(201);
      expect(response.jsonBody.success).toBe(true);
      expect(response.jsonBody.course.courseCode).toBe('F18L1W005');
    });

    it('should return 400 for invalid course code format', async () => {
      const courseData = {
        courseCode: 'InvalidCode',
        courseName: 'Test Course',
        semester: 1,
        isRequired: true,
        credits: 6,
        description: 'Test description',
      };

      const mockRequest = createMockRequest({
        json: jest.fn().mockResolvedValue(courseData),
      });

      const response = await CreateCourse(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody.error).toBe(
        'Course code must be in format like F18L1W005, F19L2S012, etc.'
      );
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        courseCode: 'CS101',
        // Missing required fields
      };

      const mockRequest = createMockRequest({
        json: jest.fn().mockResolvedValue(incompleteData),
      });

      const response = await CreateCourse(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody.error).toBe(
        'Missing required fields: courseCode, courseName, semester, credits, isRequired'
      );
    });

    it('should return 403 for non-admin user', async () => {
      (requireAdmin as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Access denied',
      });

      const mockRequest = createMockRequest();
      const response = await CreateCourse(mockRequest, mockContext);

      expect(response.status).toBe(403);
      expect(response.jsonBody.error).toBe('Access denied');
    });

    it('should handle service errors', async () => {
      const courseData = {
        courseCode: 'F18L1W005',
        courseName: 'Introduction to Programming',
        semester: 1,
        isRequired: true,
        credits: 6,
        description: 'Basic programming concepts',
      };

      const mockRequest = createMockRequest({
        json: jest.fn().mockResolvedValue(courseData),
      });

      mockCourseService.createCourse.mockRejectedValue(
        new Error('Course already exists')
      );

      const response = await CreateCourse(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody.error).toBe('Course already exists');
    });
  });

  describe('UpdateCourse (Admin)', () => {
    beforeEach(() => {
      (requireAdmin as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { userId: 'admin-1' },
      });
    });

    it('should update course successfully', async () => {
      const updateData = {
        courseName: 'Updated Course Name',
        description: 'Updated description',
      };

      const mockRequest = createMockRequest({
        params: { courseId: 'course-1' },
        json: jest.fn().mockResolvedValue(updateData),
      });

      const mockUpdatedCourse = {
        courseId: 'course-1',
        courseCode: 'F18L1W005',
        courseName: 'Updated Course Name',
        description: 'Updated description',
        updatedAt: new Date(),
      };

      mockCourseService.updateCourse.mockResolvedValue(
        mockUpdatedCourse as any
      );

      const response = await UpdateCourse(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.success).toBe(true);
      expect(response.jsonBody.course.courseName).toBe('Updated Course Name');
    });

    it('should return 404 for non-existent course', async () => {
      const mockRequest = createMockRequest({
        params: { courseId: 'nonexistent' },
        json: jest.fn().mockResolvedValue({ courseName: 'New Name' }),
      });

      mockCourseService.updateCourse.mockResolvedValue(null);

      const response = await UpdateCourse(mockRequest, mockContext);

      expect(response.status).toBe(404);
      expect(response.jsonBody.error).toBe('Course not found');
    });

    it('should return 400 for invalid course code format', async () => {
      const mockRequest = createMockRequest({
        params: { courseId: 'course-1' },
        json: jest.fn().mockResolvedValue({
          courseCode: 'InvalidFormat',
        }),
      });

      const response = await UpdateCourse(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody.error).toBe(
        'Course code must be in format like F18L1W005, F19L2S012, etc.'
      );
    });

    it('should return 403 for non-admin user', async () => {
      (requireAdmin as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Access denied',
      });

      const mockRequest = createMockRequest();
      const response = await UpdateCourse(mockRequest, mockContext);

      expect(response.status).toBe(403);
      expect(response.jsonBody.error).toBe('Access denied');
    });
  });

  describe('DeleteCourse (Admin)', () => {
    beforeEach(() => {
      (requireAdmin as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { userId: 'admin-1' },
      });
    });

    it('should delete course successfully', async () => {
      const mockRequest = createMockRequest({
        params: { courseId: 'course-1' },
      });

      const mockCourse = {
        courseId: 'course-1',
        courseCode: 'CS101',
      };

      mockCourseService.getCourseById.mockResolvedValue(mockCourse as any);
      mockCourseService.deleteCourse.mockResolvedValue(true);

      const response = await DeleteCourse(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.success).toBe(true);
      expect(response.jsonBody.message).toBe('Course deleted successfully');
    });

    it('should return 404 for non-existent course', async () => {
      const mockRequest = createMockRequest({
        params: { courseId: 'nonexistent' },
      });

      mockCourseService.getCourseById.mockResolvedValue(null);

      const response = await DeleteCourse(mockRequest, mockContext);

      expect(response.status).toBe(404);
      expect(response.jsonBody.error).toBe('Course not found');
    });

    it('should return 400 for missing course ID', async () => {
      const mockRequest = createMockRequest({
        params: {},
      });

      const response = await DeleteCourse(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody.error).toBe('Course ID is required');
    });

    it('should return 403 for non-admin user', async () => {
      (requireAdmin as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Access denied',
      });

      const mockRequest = createMockRequest();
      const response = await DeleteCourse(mockRequest, mockContext);

      expect(response.status).toBe(403);
      expect(response.jsonBody.error).toBe('Access denied');
    });
  });

  describe('GetCourseStats (Admin)', () => {
    beforeEach(() => {
      (requireAdmin as jest.Mock).mockResolvedValue({
        isValid: true,
        user: { userId: 'admin-1' },
      });
    });

    it('should return course statistics successfully', async () => {
      const mockStats = {
        totalCourses: 10,
        activeCourses: 8,
        coursesBySemester: { 1: 2, 2: 2, 3: 2, 4: 2 },
        requiredCourses: 6,
        electiveCourses: 2,
      };

      mockCourseService.getCourseStats.mockResolvedValue(mockStats);

      const mockRequest = createMockRequest();
      const response = await GetCourseStats(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual(mockStats);
    });

    it('should return 403 for non-admin user', async () => {
      (requireAdmin as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Access denied',
      });

      const mockRequest = createMockRequest();
      const response = await GetCourseStats(mockRequest, mockContext);

      expect(response.status).toBe(403);
      expect(response.jsonBody.error).toBe('Access denied');
    });

    it('should handle service errors', async () => {
      mockCourseService.getCourseStats.mockRejectedValue(
        new Error('Service error')
      );

      const mockRequest = createMockRequest();
      const response = await GetCourseStats(mockRequest, mockContext);

      expect(response.status).toBe(500);
      expect(response.jsonBody.error).toBe('Internal server error');
    });
  });
});
