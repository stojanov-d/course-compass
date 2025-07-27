import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { ReviewService, VoteData } from '../../services/ReviewService';
import { requireAuth } from '../../middleware/authMiddleware';

export async function voteManagement(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(
    `Vote Management HTTP function processed request for URL "${request.url}"`
  );

  try {
    const method = request.method.toUpperCase();

    if (method !== 'POST') {
      return {
        status: 405,
        jsonBody: {
          error: 'Method not allowed. Only POST is supported for voting.',
        },
      };
    }

    const authResult = await requireAuth(request);
    if (!authResult.isValid) {
      return {
        status: 401,
        jsonBody: { error: authResult.error },
      };
    }

    const url = new URL(request.url);
    const pathSegments = url.pathname
      .split('/')
      .filter((segment) => segment !== '');

    // Expected paths:
    // /api/vote/review/{courseId}/{reviewId}
    // /api/vote/comment/{reviewId}/{commentId}
    const voteType = pathSegments[2]; // review or comment
    const firstId = pathSegments[3];
    const secondId = pathSegments[4];

    if (!voteType || !firstId || !secondId) {
      return {
        status: 400,
        jsonBody: {
          error:
            'Invalid vote path. Expected /api/vote/review/{courseId}/{reviewId} or /api/vote/comment/{reviewId}/{commentId}',
        },
      };
    }

    const body = (await request.json()) as { voteType: 'upvote' | 'downvote' };

    if (!body.voteType || !['upvote', 'downvote'].includes(body.voteType)) {
      return {
        status: 400,
        jsonBody: {
          error: 'Invalid vote type. Must be "upvote" or "downvote"',
        },
      };
    }

    const voteData: VoteData = {
      userId: authResult.user!.userId,
      voteType: body.voteType,
    };

    const reviewService = new ReviewService();

    switch (voteType) {
      case 'review':
        return await voteOnReview(firstId, secondId, voteData, reviewService);

      case 'comment':
        return await voteOnComment(firstId, secondId, voteData, reviewService);

      default:
        return {
          status: 400,
          jsonBody: {
            error: 'Invalid vote target. Must be "review" or "comment"',
          },
        };
    }
  } catch (error: any) {
    context.log('Error in voteManagement function:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error.message,
      },
    };
  }
}

async function voteOnReview(
  courseId: string,
  reviewId: string,
  voteData: VoteData,
  reviewService: ReviewService
): Promise<HttpResponseInit> {
  try {
    const result = await reviewService.voteOnReview(
      reviewId,
      courseId,
      voteData
    );

    const message = getVoteMessage(result.voteResult);

    return {
      status: 200,
      jsonBody: {
        success: true,
        message,
        data: {
          reviewId: result.review.reviewId,
          upvotes: result.review.upvotes,
          downvotes: result.review.downvotes,
          voteResult: result.voteResult,
        },
      },
    };
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return {
        status: 404,
        jsonBody: { error: error.message },
      };
    }
    throw error;
  }
}

async function voteOnComment(
  reviewId: string,
  commentId: string,
  voteData: VoteData,
  reviewService: ReviewService
): Promise<HttpResponseInit> {
  try {
    const result = await reviewService.voteOnComment(
      commentId,
      reviewId,
      voteData
    );

    const message = getVoteMessage(result.voteResult);

    return {
      status: 200,
      jsonBody: {
        success: true,
        message,
        data: {
          commentId: result.comment.commentId,
          upvotes: result.comment.upvotes,
          downvotes: result.comment.downvotes,
          voteResult: result.voteResult,
        },
      },
    };
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return {
        status: 404,
        jsonBody: { error: error.message },
      };
    }
    throw error;
  }
}

function getVoteMessage(voteResult: any): string {
  switch (voteResult.action) {
    case 'created':
      return `Vote ${voteResult.currentVote} added`;
    case 'updated':
      return `Vote changed from ${voteResult.previousVote} to ${voteResult.currentVote}`;
    case 'removed':
      return `Vote ${voteResult.previousVote} removed`;
    default:
      return 'Vote processed';
  }
}

app.http('VoteManagement', {
  methods: ['POST'],
  route: 'vote/{voteTarget}/{firstId}/{secondId}',
  authLevel: 'anonymous',
  handler: voteManagement,
});
