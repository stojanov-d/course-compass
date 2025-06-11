import { HttpRequest, InvocationContext } from '@azure/functions';
import { commentManagement } from '../../functions/reviews/CommentManagement';
import { ReviewService } from '../../services/ReviewService';
import { requireAuth } from '../../middleware/authMiddleware';
import { CommentEntity } from '../../entities/CommentEntity';

// Mock dependencies
jest.mock('../../services/ReviewService');
jest.mock('../../middleware/authMiddleware');

describe('CommentManagement Functions', () => {
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
      url: 'http://localhost/api/comments',
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

  const mockComment = new CommentEntity({
    reviewId: 'review-1',
    userId: 'user-1',
    commentText: 'Great review!',
    isAnonymous: false,
    isApproved: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    upvotes: 2,
    downvotes: 0,
  });

  describe('POST /api/comments (Create Comment)', () => {
    beforeEach(() => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: mockUser,
      });
    });

    it('should create comment successfully with valid data', async () => {
      const requestBody = {
        reviewId: 'review-1',
        commentText: 'Great review!',
        isAnonymous: false,
      };

      const mockRequest = createMockRequest({
        method: 'POST',
        url: 'http://localhost/api/comments',
        json: jest.fn().mockResolvedValue(requestBody),
      });

      mockReviewService.createComment.mockResolvedValue(mockComment);

      const response = await commentManagement(mockRequest, mockContext);

      expect(response.status).toBe(201);
      expect(response.jsonBody).toEqual({
        success: true,
        data: mockComment,
      });
      expect(mockReviewService.createComment).toHaveBeenCalledWith({
        ...requestBody,
        userId: mockUser.userId,
      });
    });

    it('should return 400 for missing required fields', async () => {
      const requestBody = {
        reviewId: 'review-1',
        // Missing commentText
      };

      const mockRequest = createMockRequest({
        method: 'POST',
        json: jest.fn().mockResolvedValue(requestBody),
      });

      const response = await commentManagement(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody?.error).toBe(
        'Missing required fields: reviewId, commentText'
      );
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

      const response = await commentManagement(mockRequest, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody?.error).toBe('Invalid token');
    });
  });

  describe('GET /api/comments/{reviewId} (Get Comments for Review)', () => {
    it('should return comments for review successfully', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/comments/review-1',
      });

      const mockResult = {
        comments: [mockComment],
        continuationToken: 'token-123',
      };

      mockReviewService.getCommentsForReview.mockResolvedValue(mockResult);

      const response = await commentManagement(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        data: mockResult.comments,
        continuationToken: mockResult.continuationToken,
      });
      expect(mockReviewService.getCommentsForReview).toHaveBeenCalledWith(
        'review-1',
        {}
      );
    });

    it('should handle query parameters', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/comments/review-1?limit=10&continuationToken=abc123',
      });

      mockReviewService.getCommentsForReview.mockResolvedValue({
        comments: [mockComment],
      });

      await commentManagement(mockRequest, mockContext);

      expect(mockReviewService.getCommentsForReview).toHaveBeenCalledWith(
        'review-1',
        {
          limit: 10,
          continuationToken: 'abc123',
        }
      );
    });

    it('should return 400 when review ID is missing', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/comments',
      });

      const response = await commentManagement(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody?.error).toBe('Review ID is required');
    });
  });

  describe('PUT /api/comments/{reviewId}/{commentId} (Update Comment)', () => {
    beforeEach(() => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: mockUser,
      });
    });

    it('should update comment successfully', async () => {
      const updateData = {
        commentText: 'Updated comment text',
      };

      const mockRequest = createMockRequest({
        method: 'PUT',
        url: 'http://localhost/api/comments/review-1/comment-1',
        json: jest.fn().mockResolvedValue(updateData),
      });

      const updatedComment = {
        ...mockComment,
        commentText: updateData.commentText,
      };
      mockReviewService.updateComment.mockResolvedValue(updatedComment as any);

      const response = await commentManagement(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        data: updatedComment,
      });
      expect(mockReviewService.updateComment).toHaveBeenCalledWith(
        'comment-1',
        'review-1',
        mockUser.userId,
        updateData.commentText
      );
    });

    it('should return 400 for missing commentText', async () => {
      const mockRequest = createMockRequest({
        method: 'PUT',
        url: 'http://localhost/api/comments/review-1/comment-1',
        json: jest.fn().mockResolvedValue({}),
      });

      const response = await commentManagement(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody?.error).toBe('commentText is required');
    });

    it('should return 404 when comment not found', async () => {
      const mockRequest = createMockRequest({
        method: 'PUT',
        url: 'http://localhost/api/comments/review-1/comment-1',
        json: jest.fn().mockResolvedValue({ commentText: 'Updated' }),
      });

      mockReviewService.updateComment.mockRejectedValue(
        new Error('Comment not found')
      );

      const response = await commentManagement(mockRequest, mockContext);

      expect(response.status).toBe(404);
      expect(response.jsonBody?.error).toContain('not found');
    });

    it('should return 403 for unauthorized user', async () => {
      const mockRequest = createMockRequest({
        method: 'PUT',
        url: 'http://localhost/api/comments/review-1/comment-1',
        json: jest.fn().mockResolvedValue({ commentText: 'Updated' }),
      });

      mockReviewService.updateComment.mockRejectedValue(
        new Error('Unauthorized: Can only update your own comments')
      );

      const response = await commentManagement(mockRequest, mockContext);

      expect(response.status).toBe(403);
      expect(response.jsonBody?.error).toContain('Unauthorized');
    });

    it('should return 400 when review ID or comment ID is missing', async () => {
      const mockRequest = createMockRequest({
        method: 'PUT',
        url: 'http://localhost/api/comments/review-1',
        json: jest.fn().mockResolvedValue({ commentText: 'Updated' }),
      });

      const response = await commentManagement(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody?.error).toBe(
        'Review ID and Comment ID are required'
      );
    });
  });

  describe('DELETE /api/comments/{reviewId}/{commentId} (Delete Comment)', () => {
    beforeEach(() => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: mockUser,
      });
    });

    it('should delete comment successfully', async () => {
      const mockRequest = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost/api/comments/review-1/comment-1',
      });

      mockReviewService.deleteComment.mockResolvedValue();

      const response = await commentManagement(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        message: 'Comment deleted successfully',
      });
      expect(mockReviewService.deleteComment).toHaveBeenCalledWith(
        'comment-1',
        'review-1',
        mockUser.userId
      );
    });

    it('should return 404 when comment not found', async () => {
      const mockRequest = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost/api/comments/review-1/comment-1',
      });

      mockReviewService.deleteComment.mockRejectedValue(
        new Error('Comment not found')
      );

      const response = await commentManagement(mockRequest, mockContext);

      expect(response.status).toBe(404);
      expect(response.jsonBody?.error).toContain('not found');
    });

    it('should return 403 for unauthorized user', async () => {
      const mockRequest = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost/api/comments/review-1/comment-1',
      });

      mockReviewService.deleteComment.mockRejectedValue(
        new Error('Unauthorized: Can only delete your own comments')
      );

      const response = await commentManagement(mockRequest, mockContext);

      expect(response.status).toBe(403);
      expect(response.jsonBody?.error).toContain('Unauthorized');
    });

    it('should return 400 when review ID or comment ID is missing', async () => {
      const mockRequest = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost/api/comments/review-1',
      });

      const response = await commentManagement(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody?.error).toBe(
        'Review ID and Comment ID are required'
      );
    });
  });

  describe('Unsupported Methods', () => {
    it('should return 405 for unsupported HTTP method', async () => {
      const mockRequest = createMockRequest({
        method: 'PATCH',
        url: 'http://localhost/api/comments/review-1',
      });

      const response = await commentManagement(mockRequest, mockContext);

      expect(response.status).toBe(405);
      expect(response.jsonBody?.error).toBe('Method not allowed');
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/comments/review-1',
      });

      mockReviewService.getCommentsForReview.mockRejectedValue(
        new Error('Unexpected database error')
      );

      const response = await commentManagement(mockRequest, mockContext);

      expect(response.status).toBe(500);
      expect(response.jsonBody?.error).toBe('Internal server error');
      expect(response.jsonBody?.message).toBe('Unexpected database error');
    });
  });
});
