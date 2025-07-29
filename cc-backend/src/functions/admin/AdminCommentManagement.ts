import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { ReviewService } from '../../services/ReviewService';
import { requireAdmin } from '../../middleware/authMiddleware';

export async function adminCommentManagement(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(
    `Admin Comment Management HTTP function processed request for URL "${request.url}"`
  );

  try {
    const method = request.method.toUpperCase();
    const url = new URL(request.url);
    const pathSegments = url.pathname
      .split('/')
      .filter((segment) => segment !== '');

    // Expected path: /api/admin/comments/{reviewId}/{commentId}
    const reviewId = pathSegments[3]; // admin/comments/{reviewId}
    const commentId = pathSegments[4]; // admin/comments/{reviewId}/{commentId}

    const reviewService = new ReviewService();

    switch (method) {
      case 'DELETE':
        if (!reviewId || !commentId) {
          return {
            status: 400,
            jsonBody: { error: 'Review ID and Comment ID are required' },
          };
        }
        return await adminDeleteComment(
          request,
          reviewId,
          commentId,
          reviewService
        );

      default:
        return {
          status: 405,
          jsonBody: { error: 'Method not allowed' },
        };
    }
  } catch (error: any) {
    context.log('Error in adminCommentManagement function:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error.message,
      },
    };
  }
}

async function adminDeleteComment(
  request: HttpRequest,
  reviewId: string,
  commentId: string,
  reviewService: ReviewService
): Promise<HttpResponseInit> {
  const authResult = await requireAdmin(request);
  if (!authResult.isValid) {
    return {
      status: authResult.error?.includes('Access denied') ? 403 : 401,
      jsonBody: { error: authResult.error },
    };
  }

  try {
    await reviewService.adminDeleteComment(commentId, reviewId);

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Comment deleted successfully by admin',
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

app.http('AdminCommentManagement', {
  methods: ['DELETE'],
  route: 'admin/comments/{reviewId}/{commentId}',
  authLevel: 'anonymous',
  handler: adminCommentManagement,
});
