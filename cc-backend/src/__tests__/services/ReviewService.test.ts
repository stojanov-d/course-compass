import {
  ReviewService,
  ReviewCreateData,
  CommentCreateData,
  VoteData,
} from '../../services/ReviewService';
import { ReviewEntity } from '../../entities/ReviewEntity';
import { CommentEntity } from '../../entities/CommentEntity';
import { VoteEntity, VoteResult } from '../../entities/VoteEntity';
import { TableService } from '../../services/TableService';

// Mock TableService
jest.mock('../../services/TableService');

describe('ReviewService', () => {
  let reviewService: ReviewService;
  let mockTableService: jest.Mocked<TableService>;
  let mockReviewsTable: any;
  let mockCommentsTable: any;
  let mockVotesTable: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock table clients
    mockReviewsTable = {
      createEntity: jest.fn(),
      getEntity: jest.fn(),
      updateEntity: jest.fn(),
      deleteEntity: jest.fn(),
      listEntities: jest.fn(),
    };

    mockCommentsTable = {
      createEntity: jest.fn(),
      getEntity: jest.fn(),
      updateEntity: jest.fn(),
      deleteEntity: jest.fn(),
      listEntities: jest.fn(),
    };

    mockVotesTable = {
      createEntity: jest.fn(),
      getEntity: jest.fn(),
      updateEntity: jest.fn(),
      deleteEntity: jest.fn(),
      listEntities: jest.fn(),
    };

    mockTableService = jest.mocked(new TableService());
    mockTableService.getTableClient = jest
      .fn()
      .mockImplementation((tableName) => {
        switch (tableName) {
          case 'reviews':
            return mockReviewsTable;
          case 'comments':
            return mockCommentsTable;
          case 'votes':
            return mockVotesTable;
          default:
            return {};
        }
      });

    (TableService as jest.Mock).mockImplementation(() => mockTableService);

    reviewService = new ReviewService();
  });

  describe('createReview', () => {
    const mockReviewData: ReviewCreateData = {
      userId: 'user-1',
      courseId: 'course-1',
      rating: 4,
      difficulty: 3,
      workload: 4,
      recommendsCourse: true,
      reviewText: 'Great course!',
      isAnonymous: false,
    };

    it('should create a review successfully', async () => {
      // Mock that no existing review exists
      jest
        .spyOn(reviewService, 'getUserReviewForCourse')
        .mockResolvedValue(null);
      mockReviewsTable.createEntity.mockResolvedValue({});

      const result = await reviewService.createReview(mockReviewData);

      expect(result).toBeInstanceOf(ReviewEntity);
      expect(result.userId).toBe(mockReviewData.userId);
      expect(result.courseId).toBe(mockReviewData.courseId);
      expect(result.rating).toBe(mockReviewData.rating);
      expect(result.upvotes).toBe(0);
      expect(result.downvotes).toBe(0);
      expect(mockReviewsTable.createEntity).toHaveBeenCalledTimes(2); // Review + UserReview entity
    });
    it('should throw error if user already reviewed the course', async () => {
      const existingReview = new ReviewEntity({
        ...mockReviewData,
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        upvotes: 0,
        downvotes: 0,
      });

      jest
        .spyOn(reviewService, 'getUserReviewForCourse')
        .mockResolvedValue(existingReview);

      await expect(reviewService.createReview(mockReviewData)).rejects.toThrow(
        'User has already reviewed this course'
      );
    });

    it('should validate rating ranges', async () => {
      const invalidData = { ...mockReviewData, rating: 6 };
      jest
        .spyOn(reviewService, 'getUserReviewForCourse')
        .mockResolvedValue(null);

      await expect(reviewService.createReview(invalidData)).rejects.toThrow(
        'Rating must be between 1 and 5'
      );
    });

    it('should validate difficulty ranges', async () => {
      const invalidData = { ...mockReviewData, difficulty: 0 };
      jest
        .spyOn(reviewService, 'getUserReviewForCourse')
        .mockResolvedValue(null);

      await expect(reviewService.createReview(invalidData)).rejects.toThrow(
        'Difficulty must be between 1 and 5'
      );
    });

    it('should validate workload ranges', async () => {
      const invalidData = { ...mockReviewData, workload: -1 };
      jest
        .spyOn(reviewService, 'getUserReviewForCourse')
        .mockResolvedValue(null);

      await expect(reviewService.createReview(invalidData)).rejects.toThrow(
        'Workload must be between 1 and 5'
      );
    });
  });

  describe('getReviewById', () => {
    it('should return review when found', async () => {
      const mockEntity = {
        partitionKey: 'REVIEW_course-1',
        rowKey: 'review-1',
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
        upvotes: 0,
        downvotes: 0,
      };

      mockReviewsTable.getEntity.mockResolvedValue(mockEntity);

      const result = await reviewService.getReviewById('review-1', 'course-1');

      expect(result).toBeInstanceOf(ReviewEntity);
      expect(result?.reviewId).toBe('review-1');
      expect(mockReviewsTable.getEntity).toHaveBeenCalledWith(
        'REVIEW_course-1',
        'review-1'
      );
    });

    it('should return null when review not found', async () => {
      mockReviewsTable.getEntity.mockRejectedValue({ statusCode: 404 });

      const result = await reviewService.getReviewById(
        'non-existent',
        'course-1'
      );

      expect(result).toBeNull();
    });

    it('should throw error for other failures', async () => {
      mockReviewsTable.getEntity.mockRejectedValue(new Error('Database error'));

      await expect(
        reviewService.getReviewById('review-1', 'course-1')
      ).rejects.toThrow('Failed to get review: Database error');
    });
  });

  describe('updateReview', () => {
    const existingReview = new ReviewEntity({
      reviewId: 'review-1',
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
      upvotes: 0,
      downvotes: 0,
    });

    it('should update review successfully', async () => {
      jest
        .spyOn(reviewService, 'getReviewById')
        .mockResolvedValue(existingReview);
      mockReviewsTable.updateEntity.mockResolvedValue({});

      const updateData = { rating: 5, reviewText: 'Excellent course!' };
      const result = await reviewService.updateReview(
        'review-1',
        'course-1',
        'user-1',
        updateData
      );

      expect(result.rating).toBe(5);
      expect(result.reviewText).toBe('Excellent course!');
      expect(mockReviewsTable.updateEntity).toHaveBeenCalled();
    });

    it('should throw error if review not found', async () => {
      jest.spyOn(reviewService, 'getReviewById').mockResolvedValue(null);

      await expect(
        reviewService.updateReview('non-existent', 'course-1', 'user-1', {})
      ).rejects.toThrow('Review not found');
    });

    it('should throw error if user is not the owner', async () => {
      jest
        .spyOn(reviewService, 'getReviewById')
        .mockResolvedValue(existingReview);

      await expect(
        reviewService.updateReview('review-1', 'course-1', 'different-user', {})
      ).rejects.toThrow('Unauthorized: Can only update your own reviews');
    });
  });

  describe('deleteReview', () => {
    const existingReview = new ReviewEntity({
      reviewId: 'review-1',
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
      upvotes: 0,
      downvotes: 0,
    });

    it('should delete review successfully', async () => {
      jest
        .spyOn(reviewService, 'getReviewById')
        .mockResolvedValue(existingReview);
      mockReviewsTable.deleteEntity.mockResolvedValue({});
      jest
        .spyOn(reviewService as any, 'deleteCommentsForReview')
        .mockResolvedValue(undefined);

      await reviewService.deleteReview('review-1', 'course-1', 'user-1');

      expect(mockReviewsTable.deleteEntity).toHaveBeenCalledWith(
        'REVIEW_course-1',
        'review-1'
      );
      expect(mockReviewsTable.deleteEntity).toHaveBeenCalledWith(
        'USER_REVIEWS_user-1',
        'review-1'
      );
    });

    it('should throw error if user is not the owner', async () => {
      jest
        .spyOn(reviewService, 'getReviewById')
        .mockResolvedValue(existingReview);

      await expect(
        reviewService.deleteReview('review-1', 'course-1', 'different-user')
      ).rejects.toThrow('Unauthorized: Can only delete your own reviews');
    });
  });

  describe('createComment', () => {
    const mockCommentData: CommentCreateData = {
      reviewId: 'review-1',
      userId: 'user-2',
      commentText: 'I agree with this review!',
      isAnonymous: false,
    };

    it('should create comment successfully', async () => {
      mockCommentsTable.createEntity.mockResolvedValue({});

      const result = await reviewService.createComment(mockCommentData);

      expect(result).toBeInstanceOf(CommentEntity);
      expect(result.reviewId).toBe(mockCommentData.reviewId);
      expect(result.userId).toBe(mockCommentData.userId);
      expect(result.commentText).toBe(mockCommentData.commentText);
      expect(result.upvotes).toBe(0);
      expect(result.downvotes).toBe(0);
      expect(mockCommentsTable.createEntity).toHaveBeenCalled();
    });
  });

  describe('voteOnReview', () => {
    const mockReview = new ReviewEntity({
      reviewId: 'review-1',
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
      upvotes: 0,
      downvotes: 0,
    });

    const voteData: VoteData = {
      userId: 'user-2',
      voteType: 'upvote',
    };

    it('should create new vote successfully', async () => {
      jest.spyOn(reviewService, 'getReviewById').mockResolvedValue(mockReview);
      jest.spyOn(reviewService as any, 'processVote').mockResolvedValue({
        success: true,
        action: 'created',
        previousVote: null,
        currentVote: 'upvote',
        upvotes: 1,
        downvotes: 0,
      } as VoteResult);
      jest
        .spyOn(reviewService as any, 'updateReviewVoteCounts')
        .mockResolvedValue(mockReview);

      const result = await reviewService.voteOnReview(
        'review-1',
        'course-1',
        voteData
      );

      expect(result.review).toBe(mockReview);
      expect(result.voteResult.action).toBe('created');
    });

    it('should throw error when voting on own review', async () => {
      const ownVoteData = { ...voteData, userId: 'user-1' };
      jest.spyOn(reviewService, 'getReviewById').mockResolvedValue(mockReview);

      await expect(
        reviewService.voteOnReview('review-1', 'course-1', ownVoteData)
      ).rejects.toThrow('Cannot vote on your own review');
    });

    it('should throw error when review not found', async () => {
      jest.spyOn(reviewService, 'getReviewById').mockResolvedValue(null);

      await expect(
        reviewService.voteOnReview('non-existent', 'course-1', voteData)
      ).rejects.toThrow('Review not found');
    });
  });

  describe('voteOnComment', () => {
    const mockComment = new CommentEntity({
      commentId: 'comment-1',
      reviewId: 'review-1',
      userId: 'user-1',
      commentText: 'Great point!',
      isAnonymous: false,
      isApproved: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      upvotes: 0,
      downvotes: 0,
    });

    const voteData: VoteData = {
      userId: 'user-2',
      voteType: 'upvote',
    };

    it('should create new vote on comment successfully', async () => {
      const mockEntity = {
        partitionKey: 'COMMENT_review-1',
        rowKey: 'comment-1',
        userId: 'user-1',
        reviewId: 'review-1',
        commentText: 'Great point!',
        isAnonymous: false,
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        upvotes: 0,
        downvotes: 0,
      };

      mockCommentsTable.getEntity.mockResolvedValue(mockEntity);
      jest.spyOn(reviewService as any, 'processVote').mockResolvedValue({
        success: true,
        action: 'created',
        previousVote: null,
        currentVote: 'upvote',
        upvotes: 1,
        downvotes: 0,
      } as VoteResult);
      jest
        .spyOn(reviewService as any, 'updateCommentVoteCounts')
        .mockResolvedValue(mockComment);

      const result = await reviewService.voteOnComment(
        'comment-1',
        'review-1',
        voteData
      );

      expect(result.comment).toBe(mockComment);
      expect(result.voteResult.action).toBe('created');
    });

    it('should throw error when voting on own comment', async () => {
      const mockEntity = {
        partitionKey: 'COMMENT_review-1',
        rowKey: 'comment-1',
        userId: 'user-2', // Same as vote user
        reviewId: 'review-1',
        commentText: 'Great point!',
        isAnonymous: false,
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        upvotes: 0,
        downvotes: 0,
      };

      mockCommentsTable.getEntity.mockResolvedValue(mockEntity);

      await expect(
        reviewService.voteOnComment('comment-1', 'review-1', voteData)
      ).rejects.toThrow('Cannot vote on your own comment');
    });
  });

  describe('getUserVote', () => {
    it('should return user vote when exists', async () => {
      const mockVoteEntity = {
        partitionKey: 'VOTE_REVIEW_review-1',
        rowKey: 'user-1',
        targetType: 'review',
        targetId: 'review-1',
        voteType: 'upvote',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockVotesTable.getEntity.mockResolvedValue(mockVoteEntity);

      const result = await reviewService.getUserVote(
        'user-1',
        'review',
        'review-1'
      );

      expect(result).toBeInstanceOf(VoteEntity);
      expect(result?.voteType).toBe('upvote');
    });

    it('should return null when vote does not exist', async () => {
      mockVotesTable.getEntity.mockRejectedValue({ statusCode: 404 });

      const result = await reviewService.getUserVote(
        'user-1',
        'review',
        'review-1'
      );

      expect(result).toBeNull();
    });
  });
});
