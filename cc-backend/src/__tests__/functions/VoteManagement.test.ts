import { HttpRequest, InvocationContext } from '@azure/functions';
import { voteManagement } from '../../functions/reviews/VoteManagement';
import { ReviewService } from '../../services/ReviewService';
import { requireAuth } from '../../middleware/authMiddleware';
import { ReviewEntity } from '../../entities/ReviewEntity';
import { CommentEntity } from '../../entities/CommentEntity';
import { VoteResult } from '../../entities/VoteEntity';

// Mock dependencies
jest.mock('../../services/ReviewService');
jest.mock('../../middleware/authMiddleware');

describe('VoteManagement Functions', () => {
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
      url: 'http://localhost/api/vote',
      method: 'POST',
      ...overrides,
    } as any;
  };

  const mockUser = {
    userId: 'user-2',
    email: 'voter@example.com',
    role: 'student',
    discordId: 'discord-456',
    discordUsername: 'voter',
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

  describe('POST /api/vote/review/{courseId}/{reviewId} (Vote on Review)', () => {
    beforeEach(() => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: mockUser,
      });
    });

    it('should create upvote on review successfully', async () => {
      const requestBody = { voteType: 'upvote' as const };

      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote/review/course-1/review-1',
        json: jest.fn().mockResolvedValue(requestBody),
      });

      const mockVoteResult: VoteResult = {
        success: true,
        action: 'created',
        previousVote: null,
        currentVote: 'upvote',
        upvotes: 6,
        downvotes: 1,
      };

      const updatedReview = { ...mockReview, upvotes: 6 };

      mockReviewService.voteOnReview.mockResolvedValue({
        review: updatedReview as any,
        voteResult: mockVoteResult,
      });

      const response = await voteManagement(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        message: 'Vote upvote added',
        data: {
          reviewId: updatedReview.reviewId,
          upvotes: 6,
          downvotes: 1,
          voteResult: mockVoteResult,
        },
      });
      expect(mockReviewService.voteOnReview).toHaveBeenCalledWith(
        'review-1',
        'course-1',
        {
          userId: mockUser.userId,
          voteType: 'upvote',
        }
      );
    });

    it('should create downvote on review successfully', async () => {
      const requestBody = { voteType: 'downvote' as const };

      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote/review/course-1/review-1',
        json: jest.fn().mockResolvedValue(requestBody),
      });

      const mockVoteResult: VoteResult = {
        success: true,
        action: 'created',
        previousVote: null,
        currentVote: 'downvote',
        upvotes: 5,
        downvotes: 2,
      };

      const updatedReview = { ...mockReview, downvotes: 2 };

      mockReviewService.voteOnReview.mockResolvedValue({
        review: updatedReview as any,
        voteResult: mockVoteResult,
      });

      const response = await voteManagement(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody?.message).toBe('Vote downvote added');
    });

    it('should update existing vote', async () => {
      const requestBody = { voteType: 'upvote' as const };

      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote/review/course-1/review-1',
        json: jest.fn().mockResolvedValue(requestBody),
      });

      const mockVoteResult: VoteResult = {
        success: true,
        action: 'updated',
        previousVote: 'downvote',
        currentVote: 'upvote',
        upvotes: 6,
        downvotes: 0,
      };

      mockReviewService.voteOnReview.mockResolvedValue({
        review: mockReview,
        voteResult: mockVoteResult,
      });

      const response = await voteManagement(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody?.message).toBe(
        'Vote changed from downvote to upvote'
      );
    });

    it('should remove existing vote', async () => {
      const requestBody = { voteType: 'upvote' as const };

      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote/review/course-1/review-1',
        json: jest.fn().mockResolvedValue(requestBody),
      });

      const mockVoteResult: VoteResult = {
        success: true,
        action: 'removed',
        previousVote: 'upvote',
        currentVote: null,
        upvotes: 4,
        downvotes: 1,
      };

      mockReviewService.voteOnReview.mockResolvedValue({
        review: mockReview,
        voteResult: mockVoteResult,
      });

      const response = await voteManagement(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody?.message).toBe('Vote upvote removed');
    });

    it('should return 404 when review not found', async () => {
      const requestBody = { voteType: 'upvote' as const };

      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote/review/course-1/non-existent',
        json: jest.fn().mockResolvedValue(requestBody),
      });

      mockReviewService.voteOnReview.mockRejectedValue(
        new Error('Review not found')
      );

      const response = await voteManagement(mockRequest, mockContext);

      expect(response.status).toBe(404);
      expect(response.jsonBody?.error).toContain('not found');
    });

    it('should return 403 when voting on own review', async () => {
      const requestBody = { voteType: 'upvote' as const };

      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote/review/course-1/review-1',
        json: jest.fn().mockResolvedValue(requestBody),
      });

      mockReviewService.voteOnReview.mockRejectedValue(
        new Error('Cannot vote on your own review')
      );

      const response = await voteManagement(mockRequest, mockContext);

      expect(response.status).toBe(403);
      expect(response.jsonBody?.error).toContain('Cannot vote on your own');
    });
  });

  describe('POST /api/vote/comment/{reviewId}/{commentId} (Vote on Comment)', () => {
    beforeEach(() => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: mockUser,
      });
    });

    it('should create upvote on comment successfully', async () => {
      const requestBody = { voteType: 'upvote' as const };

      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote/comment/review-1/comment-1',
        json: jest.fn().mockResolvedValue(requestBody),
      });

      const mockVoteResult: VoteResult = {
        success: true,
        action: 'created',
        previousVote: null,
        currentVote: 'upvote',
        upvotes: 3,
        downvotes: 0,
      };

      const updatedComment = { ...mockComment, upvotes: 3 };

      mockReviewService.voteOnComment.mockResolvedValue({
        comment: updatedComment as any,
        voteResult: mockVoteResult,
      });

      const response = await voteManagement(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        message: 'Vote upvote added',
        data: {
          commentId: updatedComment.commentId,
          upvotes: 3,
          downvotes: 0,
          voteResult: mockVoteResult,
        },
      });
      expect(mockReviewService.voteOnComment).toHaveBeenCalledWith(
        'comment-1',
        'review-1',
        {
          userId: mockUser.userId,
          voteType: 'upvote',
        }
      );
    });

    it('should return 404 when comment not found', async () => {
      const requestBody = { voteType: 'upvote' as const };

      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote/comment/review-1/non-existent',
        json: jest.fn().mockResolvedValue(requestBody),
      });

      mockReviewService.voteOnComment.mockRejectedValue(
        new Error('Comment not found')
      );

      const response = await voteManagement(mockRequest, mockContext);

      expect(response.status).toBe(404);
      expect(response.jsonBody?.error).toContain('not found');
    });

    it('should return 403 when voting on own comment', async () => {
      const requestBody = { voteType: 'upvote' as const };

      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote/comment/review-1/comment-1',
        json: jest.fn().mockResolvedValue(requestBody),
      });

      mockReviewService.voteOnComment.mockRejectedValue(
        new Error('Cannot vote on your own comment')
      );

      const response = await voteManagement(mockRequest, mockContext);

      expect(response.status).toBe(403);
      expect(response.jsonBody?.error).toContain('Cannot vote on your own');
    });
  });

  describe('Request Validation', () => {
    beforeEach(() => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: true,
        user: mockUser,
      });
    });

    it('should return 405 for non-POST methods', async () => {
      const mockRequest = createMockRequest({
        method: 'GET',
        url: 'http://localhost/api/vote/review/course-1/review-1',
      });

      const response = await voteManagement(mockRequest, mockContext);

      expect(response.status).toBe(405);
      expect(response.jsonBody?.error).toBe(
        'Method not allowed. Only POST is supported for voting.'
      );
    });

    it('should return 401 for unauthenticated user', async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Invalid token',
      });

      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote/review/course-1/review-1',
        json: jest.fn().mockResolvedValue({ voteType: 'upvote' }),
      });

      const response = await voteManagement(mockRequest, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody?.error).toBe('Invalid token');
    });

    it('should return 400 for invalid vote path', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote/invalid',
        json: jest.fn().mockResolvedValue({ voteType: 'upvote' }),
      });

      const response = await voteManagement(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody?.error).toContain('Invalid vote path');
    });

    it('should return 400 for missing vote type', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote/review/course-1/review-1',
        json: jest.fn().mockResolvedValue({}),
      });

      const response = await voteManagement(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody?.error).toBe(
        'Invalid vote type. Must be "upvote" or "downvote"'
      );
    });

    it('should return 400 for invalid vote type', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote/review/course-1/review-1',
        json: jest.fn().mockResolvedValue({ voteType: 'invalid' }),
      });

      const response = await voteManagement(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody?.error).toBe(
        'Invalid vote type. Must be "upvote" or "downvote"'
      );
    });

    it('should return 400 for invalid vote target', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote/invalid/id1/id2',
        json: jest.fn().mockResolvedValue({ voteType: 'upvote' }),
      });

      const response = await voteManagement(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody?.error).toBe(
        'Invalid vote target. Must be "review" or "comment"'
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
        url: 'http://localhost/api/vote/review/course-1/review-1',
        json: jest.fn().mockResolvedValue({ voteType: 'upvote' }),
      });

      mockReviewService.voteOnReview.mockRejectedValue(
        new Error('Unexpected database error')
      );

      const response = await voteManagement(mockRequest, mockContext);

      expect(response.status).toBe(500);
      expect(response.jsonBody?.error).toBe('Internal server error');
      expect(response.jsonBody?.message).toBe('Unexpected database error');
    });
  });
});
