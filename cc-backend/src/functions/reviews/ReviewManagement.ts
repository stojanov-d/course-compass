import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { ReviewService, ReviewCreateData } from '../../services/ReviewService';
import { requireAuth } from '../../middleware/authMiddleware';

export async function reviewManagement(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(
    `Review Management HTTP function processed request for URL "${request.url}"`
  );

  try {
    const method = request.method.toUpperCase();
    const url = new URL(request.url);
    const pathSegments = url.pathname
      .split('/')
      .filter((segment) => segment !== '');

    // Expected path: /api/reviews[/{courseId}[/{reviewId}]]
    const courseId = pathSegments[2]; // reviews/{courseId}
    const reviewId = pathSegments[3]; // reviews/{courseId}/{reviewId}

    const reviewService = new ReviewService();

    switch (method) {
      case 'POST':
        return await createReview(request, reviewService);

      case 'GET':
        if (courseId && reviewId) {
          return await getReview(courseId, reviewId, reviewService);
        } else if (courseId) {
          return await getReviewsForCourse(request, courseId, reviewService);
        } else {
          return {
            status: 400,
            jsonBody: { error: 'Course ID is required' },
          };
        }

      case 'PUT':
        if (!courseId || !reviewId) {
          return {
            status: 400,
            jsonBody: { error: 'Course ID and Review ID are required' },
          };
        }
        return await updateReview(request, courseId, reviewId, reviewService);

      case 'DELETE':
        if (!courseId || !reviewId) {
          return {
            status: 400,
            jsonBody: { error: 'Course ID and Review ID are required' },
          };
        }
        return await deleteReview(request, courseId, reviewId, reviewService);

      default:
        return {
          status: 405,
          jsonBody: { error: 'Method not allowed' },
        };
    }
  } catch (error: any) {
    context.log('Error in reviewManagement function:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error.message,
      },
    };
  }
}

async function createReview(
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

  try {
    const body = (await request.json()) as ReviewCreateData;

    if (
      !body.courseId ||
      !body.rating ||
      !body.difficulty ||
      !body.workload ||
      !body.reviewText
    ) {
      return {
        status: 400,
        jsonBody: {
          error:
            'Missing required fields: courseId, rating, difficulty, workload, reviewText',
        },
      };
    }

    body.userId = authResult.user!.userId;

    const review = await reviewService.createReview(body);

    const reviewWithUser = await reviewService.populateUserDataInReview(review);

    return {
      status: 201,
      jsonBody: {
        success: true,
        data: reviewWithUser,
      },
    };
  } catch (error: any) {
    if (error.message.includes('already reviewed')) {
      return {
        status: 409,
        jsonBody: { error: error.message },
      };
    }
    throw error;
  }
}

async function getReview(
  courseId: string,
  reviewId: string,
  reviewService: ReviewService
): Promise<HttpResponseInit> {
  const review = await reviewService.getReviewById(reviewId, courseId);

  if (!review) {
    return {
      status: 404,
      jsonBody: { error: 'Review not found' },
    };
  }

  const reviewWithUser = await reviewService.populateUserDataInReview(review);

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: reviewWithUser,
    },
  };
}

async function getReviewsForCourse(
  request: HttpRequest,
  courseId: string,
  reviewService: ReviewService
): Promise<HttpResponseInit> {
  const url = new URL(request.url);
  const limit = url.searchParams.get('limit')
    ? parseInt(url.searchParams.get('limit')!)
    : undefined;
  const continuationToken =
    url.searchParams.get('continuationToken') || undefined;

  const result = await reviewService.getReviewsForCourseWithUsers(courseId, {
    limit,
    continuationToken,
  });

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.reviews,
      continuationToken: result.continuationToken,
    },
  };
}

async function updateReview(
  request: HttpRequest,
  courseId: string,
  reviewId: string,
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
    const updateData = (await request.json()) as Partial<ReviewCreateData>;

    const review = await reviewService.updateReview(
      reviewId,
      courseId,
      authResult.user!.userId,
      updateData
    );

    const reviewWithUser = await reviewService.populateUserDataInReview(review);

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: reviewWithUser,
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

async function deleteReview(
  request: HttpRequest,
  courseId: string,
  reviewId: string,
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
    await reviewService.deleteReview(
      reviewId,
      courseId,
      authResult.user!.userId
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Review deleted successfully',
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

app.http('ReviewManagement', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  route: 'reviews/{courseId?}/{reviewId?}',
  authLevel: 'anonymous',
  handler: reviewManagement,
});
