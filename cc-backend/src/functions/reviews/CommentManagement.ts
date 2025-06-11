import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { ReviewService, CommentCreateData } from '../../services/ReviewService';
import { requireAuth } from '../../middleware/authMiddleware';

export async function commentManagement(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(
    `Comment Management HTTP function processed request for URL "${request.url}"`
  );

  try {
    const method = request.method.toUpperCase();
    const url = new URL(request.url);
    const pathSegments = url.pathname
      .split('/')
      .filter((segment) => segment !== '');

    // Expected path: /api/comments[/{reviewId}[/{commentId}]]
    const reviewId = pathSegments[2]; // comments/{reviewId}
    const commentId = pathSegments[3]; // comments/{reviewId}/{commentId}

    const reviewService = new ReviewService();

    switch (method) {
      case 'POST':
        return await createComment(request, reviewService);

      case 'GET':
        if (!reviewId) {
          return {
            status: 400,
            jsonBody: { error: 'Review ID is required' },
          };
        }
        return await getCommentsForReview(request, reviewId, reviewService);

      case 'PUT':
        if (!reviewId || !commentId) {
          return {
            status: 400,
            jsonBody: { error: 'Review ID and Comment ID are required' },
          };
        }
        return await updateComment(request, reviewId, commentId, reviewService);

      case 'DELETE':
        if (!reviewId || !commentId) {
          return {
            status: 400,
            jsonBody: { error: 'Review ID and Comment ID are required' },
          };
        }
        return await deleteComment(request, reviewId, commentId, reviewService);

      default:
        return {
          status: 405,
          jsonBody: { error: 'Method not allowed' },
        };
    }
  } catch (error: any) {
    context.log('Error in commentManagement function:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error.message,
      },
    };
  }
}

async function createComment(
  request: HttpRequest,
  reviewService: ReviewService
): Promise<HttpResponseInit> {
  const authResult = await requireAuth(request);
  if (!authResult.isValid) {
    return {
      status: 401,
      jsonBody: { error: authResult.error },
    };
  }

  const body = (await request.json()) as CommentCreateData;

  if (!body.reviewId || !body.commentText) {
    return {
      status: 400,
      jsonBody: {
        error: 'Missing required fields: reviewId, commentText',
      },
    };
  }

  body.userId = authResult.user!.userId;

  const comment = await reviewService.createComment(body);

  return {
    status: 201,
    jsonBody: {
      success: true,
      data: comment,
    },
  };
}

async function getCommentsForReview(
  request: HttpRequest,
  reviewId: string,
  reviewService: ReviewService
): Promise<HttpResponseInit> {
  const url = new URL(request.url);
  const limit = url.searchParams.get('limit')
    ? parseInt(url.searchParams.get('limit')!)
    : undefined;
  const continuationToken =
    url.searchParams.get('continuationToken') || undefined;
  const result = await reviewService.getCommentsForReview(reviewId, {
    limit,
    continuationToken,
  });

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.comments,
      continuationToken: result.continuationToken,
    },
  };
}

async function updateComment(
  request: HttpRequest,
  reviewId: string,
  commentId: string,
  reviewService: ReviewService
): Promise<HttpResponseInit> {
  const authResult = await requireAuth(request);
  if (!authResult.isValid) {
    return {
      status: 401,
      jsonBody: { error: authResult.error },
    };
  }

  try {
    const body = (await request.json()) as { commentText: string };

    if (!body.commentText) {
      return {
        status: 400,
        jsonBody: { error: 'commentText is required' },
      };
    }

    const comment = await reviewService.updateComment(
      commentId,
      reviewId,
      authResult.user!.userId,
      body.commentText
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: comment,
      },
    };
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return {
        status: 404,
        jsonBody: { error: error.message },
      };
    }
    if (error.message.includes('Unauthorized')) {
      return {
        status: 403,
        jsonBody: { error: error.message },
      };
    }
    throw error;
  }
}

async function deleteComment(
  request: HttpRequest,
  reviewId: string,
  commentId: string,
  reviewService: ReviewService
): Promise<HttpResponseInit> {
  const authResult = await requireAuth(request);
  if (!authResult.isValid) {
    return {
      status: 401,
      jsonBody: { error: authResult.error },
    };
  }

  try {
    await reviewService.deleteComment(
      commentId,
      reviewId,
      authResult.user!.userId
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Comment deleted successfully',
      },
    };
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return {
        status: 404,
        jsonBody: { error: error.message },
      };
    }
    if (error.message.includes('Unauthorized')) {
      return {
        status: 403,
        jsonBody: { error: error.message },
      };
    }
    throw error;
  }
}

app.http('CommentManagement', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  route: 'comments/{reviewId?}/{commentId?}',
  authLevel: 'anonymous',
  handler: commentManagement,
});
