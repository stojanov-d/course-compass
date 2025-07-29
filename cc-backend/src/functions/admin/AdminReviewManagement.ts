import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { ReviewService } from '../../services/ReviewService';
import { requireAdmin } from '../../middleware/authMiddleware';

export async function adminReviewManagement(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(
    `Admin Review Management HTTP function processed request for URL "${request.url}"`
  );

  try {
    const method = request.method.toUpperCase();
    const url = new URL(request.url);
    const pathSegments = url.pathname
      .split('/')
      .filter((segment) => segment !== '');

    // Expected path: /api/admin/reviews/{courseId}/{reviewId}
    const courseId = pathSegments[3]; // admin/reviews/{courseId}
    const reviewId = pathSegments[4]; // admin/reviews/{courseId}/{reviewId}

    const reviewService = new ReviewService();

    switch (method) {
      case 'DELETE':
        if (!courseId || !reviewId) {
          return {
            status: 400,
            jsonBody: { error: 'Course ID and Review ID are required' },
          };
        }
        return await adminDeleteReview(
          request,
          courseId,
          reviewId,
          reviewService
        );

      default:
        return {
          status: 405,
          jsonBody: { error: 'Method not allowed' },
        };
    }
  } catch (error: any) {
    context.log('Error in adminReviewManagement function:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error.message,
      },
    };
  }
}

async function adminDeleteReview(
  request: HttpRequest,
  courseId: string,
  reviewId: string,
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
    await reviewService.adminDeleteReview(reviewId, courseId);

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Review deleted successfully by admin',
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

app.http('AdminReviewManagement', {
  methods: ['DELETE'],
  route: 'admin/reviews/{courseId}/{reviewId}',
  authLevel: 'anonymous',
  handler: adminReviewManagement,
});
