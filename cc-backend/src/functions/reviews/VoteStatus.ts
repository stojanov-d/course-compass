import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { ReviewService } from '../../services/ReviewService';
import { requireAuth } from '../../middleware/authMiddleware';

export async function voteStatus(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(
    `Vote Status HTTP function processed request for URL "${request.url}"`
  );

  try {
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

    // Expected path: /api/vote-status/{targetType}/{targetId}
    const targetType = pathSegments[2] as 'review' | 'comment';
    const targetId = pathSegments[3];

    if (
      !targetType ||
      !targetId ||
      !['review', 'comment'].includes(targetType)
    ) {
      return {
        status: 400,
        jsonBody: {
          error:
            'Invalid path. Expected /api/vote-status/{review|comment}/{targetId}',
        },
      };
    }

    const reviewService = new ReviewService();
    const userVote = await reviewService.getUserVote(
      authResult.user!.userId,
      targetType,
      targetId
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: {
          hasVoted: userVote !== null,
          voteType: userVote?.voteType || null,
          votedAt: userVote?.createdAt || null,
        },
      },
    };
  } catch (error: any) {
    context.log('Error in voteStatus function:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error.message,
      },
    };
  }
}

app.http('VoteStatus', {
  methods: ['GET'],
  route: 'vote-status/{targetType}/{targetId}',
  authLevel: 'anonymous',
  handler: voteStatus,
});
