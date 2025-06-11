import { HttpRequest, InvocationContext } from '@azure/functions';
import { userReviewManagement } from '../../functions/reviews/UserReviewManagement';
import { ReviewService } from '../../services/ReviewService';
import { requireAuth } from '../../middleware/authMiddleware';
import { ReviewEntity } from '../../entities/ReviewEntity';

// Mock dependencies
jest.mock('../../services/ReviewService');
jest.mock('../../middleware/authMiddleware');

describe('UserReviewManagement Functions', () => {
  let mockReviewService: jest.Mocked<ReviewService>;
  let mockContext: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReviewService = jest.mocked(new ReviewService());
    (ReviewService as jest.Mock).mockImplementation(() => mockReviewService);

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
      url: 'http://localhost/api/user-reviews',
      method: 'GET',
      ...overrides,
    } as any;
  };

  const mockUser = {
    userId: 'user-1',
    email: 'test@example.com',
    role: 'student',
    discordId: 'discord-123',
    discordUsername: 'testuser',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdminUser = {
    userId: 'admin-1',
    email: 'admin@example.com',
    role: 'admin',
    discordId: 'discord-admin',
    discordUsername: 'admin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReview = new ReviewEntity({
    userId: 'user-1',
    courseId: 'course-1',
    rating: 4,
    difficulty: 3,
    workload: 4,
    recommendsCourse: true,
    reviewText: 'Great course!',
    isAnonymous: false,
    isApproved: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    upvotes: 5,
    downvotes: 1,
  });

  describe('GET /api/user-reviews/me (Get Current User Reviews)', () => {
    beforeEach(() => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: mockUser,
      });
    });

    it('should return placeholder response for current user reviews', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/user-reviews/me',
      });

      const response = await userReviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        message: 'Feature not yet implemented',
        data: [],
      });
    });
  });

  describe('GET /api/user-reviews/course/{courseId} (Get User Review for Course)', () => {
    beforeEach(() => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: mockUser,
      });
    });

    it('should return user review for course when exists', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/user-reviews/course/course-1',
      });

      mockReviewService.getUserReviewForCourse.mockResolvedValue(mockReview);

      const response = await userReviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        data: mockReview,
        hasReviewed: true,
      });
      expect(mockReviewService.getUserReviewForCourse).toHaveBeenCalledWith(
        mockUser.userId,
        'course-1'
      );
    });

    it('should return null when user has not reviewed the course', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/user-reviews/course/course-1',
      });

      mockReviewService.getUserReviewForCourse.mockResolvedValue(null);

      const response = await userReviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        data: null,
        hasReviewed: false,
      });
    });

    it('should return 400 when course ID is missing', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/user-reviews/course',
      });

      const response = await userReviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody?.error).toBe('Course ID is required');
    });
  });

  describe('GET /api/user-reviews/{userId} (Get User Reviews by ID)', () => {
    it('should allow user to view their own reviews', async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: mockUser,
      });

      const mockRequest = createMockRequest({
        url: `http://localhost/api/user-reviews/${mockUser.userId}`,
      });

      const response = await userReviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        message: 'Feature not yet implemented',
        data: [],
      });
    });

    it('should allow admin to view any user reviews', async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: mockAdminUser,
      });

      const mockRequest = createMockRequest({
        url: 'http://localhost/api/user-reviews/user-2',
      });

      const response = await userReviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        message: 'Feature not yet implemented',
        data: [],
      });
    });

    it('should return 403 when non-admin user tries to view other user reviews', async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: mockUser,
      });

      const mockRequest = createMockRequest({
        url: 'http://localhost/api/user-reviews/different-user',
      });

      const response = await userReviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(403);
      expect(response.jsonBody?.error).toBe(
        'Forbidden: Can only view your own reviews'
      );
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for unauthenticated user', async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Invalid token',
      });

      const mockRequest = createMockRequest({
        url: 'http://localhost/api/user-reviews/me',
      });

      const response = await userReviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody?.error).toBe('Invalid token');
    });

    it('should return 405 for non-GET methods', async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: mockUser,
      });

      const mockRequest = createMockRequest({
        method: 'POST',
        url: 'http://localhost/api/user-reviews/me',
      });

      const response = await userReviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(405);
      expect(response.jsonBody?.error).toBe(
        'Method not allowed. Only GET is supported.'
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: mockUser,
      });
    });

    it('should handle unexpected errors', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/user-reviews/course/course-1',
      });

      mockReviewService.getUserReviewForCourse.mockRejectedValue(
        new Error('Unexpected database error')
      );

      const response = await userReviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(500);
      expect(response.jsonBody?.error).toBe('Internal server error');
      expect(response.jsonBody?.message).toBe('Unexpected database error');
    });
  });
});
