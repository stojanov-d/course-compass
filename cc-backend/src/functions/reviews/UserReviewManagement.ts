import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { ReviewService } from '../../services/ReviewService';
import { requireAuth } from '../../middleware/authMiddleware';

export async function userReviewManagement(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(
    `User Review Management HTTP function processed request for URL "${request.url}"`
  );

  try {
    const method = request.method.toUpperCase();

    if (method !== 'GET') {
      return {
        status: 405,
        jsonBody: { error: 'Method not allowed. Only GET is supported.' },
      };
    }

    // Require authentication
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
    // /api/user-reviews/me
    // /api/user-reviews/course/{courseId}
    // /api/user-reviews/{userId}
    if (pathSegments.length < 3 || !pathSegments[2]) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid or missing path. Expected "me", "course/{courseId}", or "{userId}".' },
      };
    }
    const target = pathSegments[2]; // me, course, or userId
    const additionalParam = pathSegments[3]; // courseId for course path

    const reviewService = new ReviewService();

    switch (target) {
      case 'me':
        return await getCurrentUserReviews(
          request,
          authResult.user!.userId,
          reviewService
        );

      case 'course':
        if (!additionalParam) {
          return {
            status: 400,
            jsonBody: { error: 'Course ID is required' },
          };
        }
        return await getUserReviewForCourse(
          authResult.user!.userId,
          additionalParam,
          reviewService
        );
      default: {
        // Treat as userId - but only allow users to see their own reviews unless admin
        const requestedUserId = target;
        if (
          requestedUserId !== authResult.user!.userId &&
          authResult.user!.role !== 'admin'
        ) {
          return {
            status: 403,
            jsonBody: { error: 'Forbidden: Can only view your own reviews' },
          };
        }
        return await getCurrentUserReviews(
          request,
          requestedUserId,
          reviewService
        );
      }
    }
  } catch (error: any) {
    context.log('Error in userReviewManagement function:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error.message,
      },
    };
  }
}

async function getCurrentUserReviews(
  _request: HttpRequest,
  _userId: string,
  _reviewService: ReviewService
): Promise<HttpResponseInit> {
  // Placeholder for future implementation
  return {
    status: 200,
    jsonBody: {
      success: true,
      message: 'Feature not yet implemented',
      data: [],
    },
  };
}

async function getUserReviewForCourse(
  userId: string,
  courseId: string,
  reviewService: ReviewService
): Promise<HttpResponseInit> {
  const review = await reviewService.getUserReviewForCourse(userId, courseId);

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: review,
      hasReviewed: review !== null,
    },
  };
}

app.http('UserReviewManagement', {
  methods: ['GET'],
  route: 'user-reviews/{target?}/{param?}',
  authLevel: 'anonymous',
  handler: userReviewManagement,
});
