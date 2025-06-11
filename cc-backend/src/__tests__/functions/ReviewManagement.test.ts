import { HttpRequest, InvocationContext } from '@azure/functions';
import { reviewManagement } from '../../functions/reviews/ReviewManagement';
import { ReviewService } from '../../services/ReviewService';
import { requireAuth } from '../../middleware/authMiddleware';
import { ReviewEntity } from '../../entities/ReviewEntity';

// Mock dependencies
jest.mock('../../services/ReviewService');
jest.mock('../../middleware/authMiddleware');

describe('ReviewManagement Functions', () => {
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
      url: 'http://localhost/api/reviews',
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

  describe('POST /api/reviews (Create Review)', () => {
    beforeEach(() => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: mockUser,
      });
    });

    it('should create review successfully with valid data', async () => {
      const requestBody = {
        courseId: 'course-1',
        rating: 4,
        difficulty: 3,
        workload: 4,
        recommendsCourse: true,
        reviewText: 'Great course!',
        isAnonymous: false,
      };

      const mockRequest = createMockRequest({
        method: 'POST',
        url: 'http://localhost/api/reviews',
        json: jest.fn().mockResolvedValue(requestBody),
      });

      mockReviewService.createReview.mockResolvedValue(mockReview);

      const response = await reviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(201);
      expect(response.jsonBody).toEqual({
        success: true,
        data: mockReview,
      });
      expect(mockReviewService.createReview).toHaveBeenCalledWith({
        ...requestBody,
        userId: mockUser.userId,
      });
    });

    it('should return 400 for missing required fields', async () => {
      const requestBody = {
        courseId: 'course-1',
        // Missing other required fields
      };

      const mockRequest = createMockRequest({
        method: 'POST',
        json: jest.fn().mockResolvedValue(requestBody),
      });

      const response = await reviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody?.error).toContain('Missing required fields');
    });

    it('should return 401 for unauthenticated user', async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Invalid token',
      });

      const mockRequest = createMockRequest({
        method: 'POST',
        json: jest.fn().mockResolvedValue({}),
      });

      const response = await reviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody?.error).toBe('Invalid token');
    });

    it('should return 409 when user already reviewed the course', async () => {
      const requestBody = {
        courseId: 'course-1',
        rating: 4,
        difficulty: 3,
        workload: 4,
        recommendsCourse: true,
        reviewText: 'Great course!',
        isAnonymous: false,
      };

      const mockRequest = createMockRequest({
        method: 'POST',
        json: jest.fn().mockResolvedValue(requestBody),
      });

      mockReviewService.createReview.mockRejectedValue(
        new Error('User has already reviewed this course')
      );

      const response = await reviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(409);
      expect(response.jsonBody?.error).toContain('already reviewed');
    });
  });

  describe('GET /api/reviews/{courseId} (Get Reviews for Course)', () => {
    it('should return reviews for course successfully', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/reviews/course-1',
      });

      const mockResult = {
        reviews: [mockReview],
        continuationToken: 'token-123',
      };

      mockReviewService.getReviewsForCourse.mockResolvedValue(mockResult);

      const response = await reviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        data: mockResult.reviews,
        continuationToken: mockResult.continuationToken,
      });
      expect(mockReviewService.getReviewsForCourse).toHaveBeenCalledWith(
        'course-1',
        {}
      );
    });

    it('should handle query parameters', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/reviews/course-1?limit=10&continuationToken=abc123',
      });

      mockReviewService.getReviewsForCourse.mockResolvedValue({
        reviews: [mockReview],
      });

      await reviewManagement(mockRequest, mockContext);

      expect(mockReviewService.getReviewsForCourse).toHaveBeenCalledWith(
        'course-1',
        {
          limit: 10,
          continuationToken: 'abc123',
        }
      );
    });

    it('should return 400 when course ID is missing', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/reviews',
      });

      const response = await reviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody?.error).toBe('Course ID is required');
    });
  });

  describe('GET /api/reviews/{courseId}/{reviewId} (Get Single Review)', () => {
    it('should return review successfully', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/reviews/course-1/review-1',
      });

      mockReviewService.getReviewById.mockResolvedValue(mockReview);

      const response = await reviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        data: mockReview,
      });
      expect(mockReviewService.getReviewById).toHaveBeenCalledWith(
        'review-1',
        'course-1'
      );
    });

    it('should return 404 when review not found', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/reviews/course-1/non-existent',
      });

      mockReviewService.getReviewById.mockResolvedValue(null);

      const response = await reviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(404);
      expect(response.jsonBody?.error).toBe('Review not found');
    });
  });

  describe('PUT /api/reviews/{courseId}/{reviewId} (Update Review)', () => {
    beforeEach(() => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: mockUser,
      });
    });

    it('should update review successfully', async () => {
      const updateData = {
        rating: 5,
        reviewText: 'Updated review text',
      };

      const mockRequest = createMockRequest({
        method: 'PUT',
        url: 'http://localhost/api/reviews/course-1/review-1',
        json: jest.fn().mockResolvedValue(updateData),
      });

      const updatedReview = { ...mockReview, ...updateData };
      mockReviewService.updateReview.mockResolvedValue(updatedReview as any);

      const response = await reviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        data: updatedReview,
      });
      expect(mockReviewService.updateReview).toHaveBeenCalledWith(
        'review-1',
        'course-1',
        mockUser.userId,
        updateData
      );
    });

    it('should return 404 when review not found', async () => {
      const mockRequest = createMockRequest({
        method: 'PUT',
        url: 'http://localhost/api/reviews/course-1/review-1',
        json: jest.fn().mockResolvedValue({}),
      });

      mockReviewService.updateReview.mockRejectedValue(
        new Error('Review not found')
      );

      const response = await reviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(404);
      expect(response.jsonBody?.error).toContain('not found');
    });

    it('should return 403 for unauthorized user', async () => {
      const mockRequest = createMockRequest({
        method: 'PUT',
        url: 'http://localhost/api/reviews/course-1/review-1',
        json: jest.fn().mockResolvedValue({}),
      });

      mockReviewService.updateReview.mockRejectedValue(
        new Error('Unauthorized: Can only update your own reviews')
      );

      const response = await reviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(403);
      expect(response.jsonBody?.error).toContain('Unauthorized');
    });

    it('should return 400 when course ID or review ID is missing', async () => {
      const mockRequest = createMockRequest({
        method: 'PUT',
        url: 'http://localhost/api/reviews/course-1',
        json: jest.fn().mockResolvedValue({}),
      });

      const response = await reviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody?.error).toBe(
        'Course ID and Review ID are required'
      );
    });
  });

  describe('DELETE /api/reviews/{courseId}/{reviewId} (Delete Review)', () => {
    beforeEach(() => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: mockUser,
      });
    });

    it('should delete review successfully', async () => {
      const mockRequest = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost/api/reviews/course-1/review-1',
      });

      mockReviewService.deleteReview.mockResolvedValue();

      const response = await reviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        message: 'Review deleted successfully',
      });
      expect(mockReviewService.deleteReview).toHaveBeenCalledWith(
        'review-1',
        'course-1',
        mockUser.userId
      );
    });

    it('should return 404 when review not found', async () => {
      const mockRequest = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost/api/reviews/course-1/review-1',
      });

      mockReviewService.deleteReview.mockRejectedValue(
        new Error('Review not found')
      );

      const response = await reviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(404);
      expect(response.jsonBody?.error).toContain('not found');
    });

    it('should return 403 for unauthorized user', async () => {
      const mockRequest = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost/api/reviews/course-1/review-1',
      });

      mockReviewService.deleteReview.mockRejectedValue(
        new Error('Unauthorized: Can only delete your own reviews')
      );

      const response = await reviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(403);
      expect(response.jsonBody?.error).toContain('Unauthorized');
    });
  });

  describe('Unsupported Methods', () => {
    it('should return 405 for unsupported HTTP method', async () => {
      const mockRequest = createMockRequest({
        method: 'PATCH',
        url: 'http://localhost/api/reviews/course-1',
      });

      const response = await reviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(405);
      expect(response.jsonBody?.error).toBe('Method not allowed');
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/reviews/course-1',
      });

      mockReviewService.getReviewsForCourse.mockRejectedValue(
        new Error('Unexpected database error')
      );

      const response = await reviewManagement(mockRequest, mockContext);

      expect(response.status).toBe(500);
      expect(response.jsonBody?.error).toBe('Internal server error');
      expect(response.jsonBody?.message).toBe('Unexpected database error');
    });
  });
});
