import { HttpRequest, InvocationContext } from '@azure/functions';
import { voteStatus } from '../../functions/reviews/VoteStatus';
import { ReviewService } from '../../services/ReviewService';
import { requireAuth } from '../../middleware/authMiddleware';
import { VoteEntity } from '../../entities/VoteEntity';

// Mock dependencies
jest.mock('../../services/ReviewService');
jest.mock('../../middleware/authMiddleware');

describe('VoteStatus Functions', () => {
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
      url: 'http://localhost/api/vote-status',
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

  const mockVote = new VoteEntity({
    targetType: 'review',
    targetId: 'review-1',
    voteType: 'upvote',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    (requireAuth as jest.Mock).mockResolvedValue({
      isValid: true,
      user: mockUser,
    });
  });

  describe('GET /api/vote-status/{targetType}/{targetId}', () => {
    it('should return vote status when user has voted on review', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote-status/review/review-1',
      });

      mockReviewService.getUserVote.mockResolvedValue(mockVote);

      const response = await voteStatus(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        data: {
          hasVoted: true,
          voteType: 'upvote',
          votedAt: mockVote.createdAt,
        },
      });
      expect(mockReviewService.getUserVote).toHaveBeenCalledWith(
        mockUser.userId,
        'review',
        'review-1'
      );
    });

    it('should return vote status when user has voted on comment', async () => {
      const commentVote = new VoteEntity({
        targetType: 'comment',
        targetId: 'comment-1',
        voteType: 'downvote',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote-status/comment/comment-1',
      });

      mockReviewService.getUserVote.mockResolvedValue(commentVote);

      const response = await voteStatus(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        data: {
          hasVoted: true,
          voteType: 'downvote',
          votedAt: commentVote.createdAt,
        },
      });
      expect(mockReviewService.getUserVote).toHaveBeenCalledWith(
        mockUser.userId,
        'comment',
        'comment-1'
      );
    });

    it('should return no vote status when user has not voted', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote-status/review/review-1',
      });

      mockReviewService.getUserVote.mockResolvedValue(null);

      const response = await voteStatus(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        data: {
          hasVoted: false,
          voteType: null,
          votedAt: null,
        },
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Invalid token',
      });

      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote-status/review/review-1',
      });

      const response = await voteStatus(mockRequest, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody?.error).toBe('Invalid token');
    });

    it('should return 400 for invalid target type', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote-status/invalid/target-1',
      });

      const response = await voteStatus(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody?.error).toContain('Invalid path');
    });

    it('should return 400 for missing target type', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote-status',
      });

      const response = await voteStatus(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody?.error).toContain('Invalid path');
    });

    it('should return 400 for missing target ID', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote-status/review',
      });

      const response = await voteStatus(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody?.error).toContain('Invalid path');
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors', async () => {
      const mockRequest = createMockRequest({
        url: 'http://localhost/api/vote-status/review/review-1',
      });

      mockReviewService.getUserVote.mockRejectedValue(
        new Error('Unexpected database error')
      );

      const response = await voteStatus(mockRequest, mockContext);

      expect(response.status).toBe(500);
      expect(response.jsonBody?.error).toBe('Internal server error');
      expect(response.jsonBody?.message).toBe('Unexpected database error');
    });
  });
});
