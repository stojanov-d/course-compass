import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { requireAdmin } from '../middleware/authMiddleware';
import {
  CourseService,
  CourseFilters,
  CourseCreateRequest,
  CourseUpdateRequest,
} from '../services/CourseService';

export async function GetCourses(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    context.log('GetCourses function called');

    const courseService = new CourseService();

    const filters: CourseFilters = {};

    const semester = request.query.get('semester');
    if (semester) {
      const semesterNum = parseInt(semester);
      if (semesterNum >= 1 && semesterNum <= 8) {
        filters.semester = semesterNum;
      }
    }

    const isRequired = request.query.get('isRequired');
    if (isRequired !== null) {
      filters.isRequired = isRequired === 'true';
    }

    const isActive = request.query.get('isActive');
    if (isActive !== null) {
      filters.isActive = isActive === 'true';
    } else {
      filters.isActive = true;
    }

    const searchTerm =
      request.query.get('searchTerm') || request.query.get('search');
    if (searchTerm) {
      filters.searchTerm = searchTerm;
    }

    const level = request.query.get('level');
    if (level) {
      filters.level = level;
    }

    const minRating = request.query.get('minRating');
    if (minRating) {
      filters.minRating = parseFloat(minRating);
    }

    const courses = await courseService.getCourses(filters);

    const sanitizedCourses = courses.map((course) => ({
      id: course.courseId,
      courseCode: course.courseCode,
      courseName: course.courseName,
      semester: course.semester,
      isRequired: course.isRequired,
      credits: course.credits,
      description: course.description,
      link: course.link,
      studyPrograms: course.studyPrograms,
      prerequisites: course.prerequisites,
      professors: course.professors,
      level: course.level,
      isActive: course.isActive,
      averageRating: course.averageRating,
      totalReviews: course.totalReviews,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    }));

    return {
      status: 200,
      jsonBody: {
        courses: sanitizedCourses,
        total: sanitizedCourses.length,
        filters: filters,
      },
    };
  } catch (error: any) {
    context.error('Get courses error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
      },
    };
  }
}

export async function GetCoursesBySemester(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const semester = parseInt(request.params.semester || '');

    if (!semester || semester < 1 || semester > 8) {
      return {
        status: 400,
        jsonBody: {
          error: 'Valid semester (1-8) is required',
        },
      };
    }

    const courseService = new CourseService();
    const courses = await courseService.getCoursesBySemester(semester);

    const activeCourses = courses.filter((course) => course.isActive);

    const sanitizedCourses = activeCourses.map((course) => ({
      id: course.courseId,
      courseCode: course.courseCode,
      courseName: course.courseName,
      semester: course.semester,
      isRequired: course.isRequired,
      credits: course.credits,
      description: course.description,
      link: course.link,
      studyPrograms: course.studyPrograms,
      prerequisites: course.prerequisites,
      professors: course.professors,
      level: course.level,
      averageRating: course.averageRating,
      totalReviews: course.totalReviews,
    }));

    return {
      status: 200,
      jsonBody: {
        semester: semester,
        courses: sanitizedCourses,
        total: sanitizedCourses.length,
      },
    };
  } catch (error: any) {
    context.error('Get courses by semester error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
      },
    };
  }
}

export async function GetCourseById(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const courseId = request.params.courseId;

    if (!courseId) {
      return {
        status: 400,
        jsonBody: {
          error: 'Course ID is required',
        },
      };
    }

    const courseService = new CourseService();
    const course = await courseService.getCourseById(courseId);

    if (!course) {
      return {
        status: 404,
        jsonBody: {
          error: 'Course not found',
        },
      };
    }

    if (!course.isActive) {
      return {
        status: 404,
        jsonBody: {
          error: 'Course not found',
        },
      };
    }

    return {
      status: 200,
      jsonBody: {
        id: course.courseId,
        courseCode: course.courseCode,
        courseName: course.courseName,
        semester: course.semester,
        isRequired: course.isRequired,
        credits: course.credits,
        description: course.description,
        link: course.link,
        studyPrograms: course.studyPrograms,
        prerequisites: course.prerequisites,
        professors: course.professors,
        level: course.level,
        averageRating: course.averageRating,
        totalReviews: course.totalReviews,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      },
    };
  } catch (error: any) {
    context.error('Get course by ID error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
      },
    };
  }
}

export async function GetCourseByCode(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const courseCode = request.params.courseCode;

    if (!courseCode) {
      return {
        status: 400,
        jsonBody: {
          error: 'Course code is required',
        },
      };
    }

    const courseService = new CourseService();
    const course = await courseService.getCourseByCode(courseCode);

    if (!course || !course.isActive) {
      return {
        status: 404,
        jsonBody: {
          error: 'Course not found',
        },
      };
    }

    return {
      status: 200,
      jsonBody: {
        id: course.courseId,
        courseCode: course.courseCode,
        courseName: course.courseName,
        semester: course.semester,
        isRequired: course.isRequired,
        credits: course.credits,
        description: course.description,
        link: course.link,
        studyPrograms: course.studyPrograms,
        prerequisites: course.prerequisites,
        professors: course.professors,
        level: course.level,
        averageRating: course.averageRating,
        totalReviews: course.totalReviews,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      },
    };
  } catch (error: any) {
    context.error('Get course by code error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
      },
    };
  }
}

export async function CreateCourse(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const authResult = await requireAdmin(request);
  if (!authResult.isValid || !authResult.user) {
    return {
      status: 403,
      jsonBody: {
        error: authResult.error || 'Access denied',
      },
    };
  }

  try {
    const body = (await request.json()) as CourseCreateRequest;

    if (
      !body.courseCode ||
      !body.courseName ||
      !body.semester ||
      body.credits === undefined ||
      body.isRequired === undefined
    ) {
      return {
        status: 400,
        jsonBody: {
          error:
            'Missing required fields: courseCode, courseName, semester, credits, isRequired',
        },
      };
    }

    if (!/^F\d{2}[LS]\d[WS]\d{3}$/.test(body.courseCode)) {
      return {
        status: 400,
        jsonBody: {
          error:
            'Course code must be in format like F18L1W005, F19L2S012, etc.',
        },
      };
    }

    const courseService = new CourseService();
    const course = await courseService.createCourse(body);

    context.log(
      `Admin ${authResult.user.userId} created course: ${course.courseCode}`
    );

    return {
      status: 201,
      jsonBody: {
        success: true,
        message: 'Course created successfully',
        course: {
          id: course.courseId,
          courseCode: course.courseCode,
          courseName: course.courseName,
          semester: course.semester,
          isRequired: course.isRequired,
          credits: course.credits,
          description: course.description,
          link: course.link,
          studyPrograms: course.studyPrograms,
          prerequisites: course.prerequisites,
          professors: course.professors,
          level: course.level,
          isActive: course.isActive,
          createdAt: course.createdAt,
        },
      },
    };
  } catch (error: any) {
    context.error('Create course error:', error);
    return {
      status: 400,
      jsonBody: {
        error: error.message || 'Failed to create course',
      },
    };
  }
}

export async function UpdateCourse(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const authResult = await requireAdmin(request);
  if (!authResult.isValid || !authResult.user) {
    return {
      status: 403,
      jsonBody: {
        error: authResult.error || 'Access denied',
      },
    };
  }

  try {
    const courseId = request.params.courseId;
    const body = (await request.json()) as CourseUpdateRequest;

    if (!courseId) {
      return {
        status: 400,
        jsonBody: {
          error: 'Course ID is required',
        },
      };
    }

    // Validate course code format if provided
    if (body.courseCode && !/^F\d{2}[LS]\d[WS]\d{3}$/.test(body.courseCode)) {
      return {
        status: 400,
        jsonBody: {
          error:
            'Course code must be in format like F18L1W005, F19L2S012, etc.',
        },
      };
    }

    const courseService = new CourseService();
    const updatedCourse = await courseService.updateCourse(courseId, body);

    if (!updatedCourse) {
      return {
        status: 404,
        jsonBody: {
          error: 'Course not found',
        },
      };
    }

    context.log(
      `Admin ${authResult.user.userId} updated course: ${updatedCourse.courseCode}`
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Course updated successfully',
        course: {
          id: updatedCourse.courseId,
          courseCode: updatedCourse.courseCode,
          courseName: updatedCourse.courseName,
          semester: updatedCourse.semester,
          isRequired: updatedCourse.isRequired,
          credits: updatedCourse.credits,
          description: updatedCourse.description,
          link: updatedCourse.link,
          studyPrograms: updatedCourse.studyPrograms,
          prerequisites: updatedCourse.prerequisites,
          professors: updatedCourse.professors,
          level: updatedCourse.level,
          isActive: updatedCourse.isActive,
          updatedAt: updatedCourse.updatedAt,
        },
      },
    };
  } catch (error: any) {
    context.error('Update course error:', error);
    return {
      status: 400,
      jsonBody: {
        error: error.message || 'Failed to update course',
      },
    };
  }
}

export async function DeleteCourse(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const authResult = await requireAdmin(request);
  if (!authResult.isValid || !authResult.user) {
    return {
      status: 403,
      jsonBody: {
        error: authResult.error || 'Access denied',
      },
    };
  }

  try {
    const courseId = request.params.courseId;

    if (!courseId) {
      return {
        status: 400,
        jsonBody: {
          error: 'Course ID is required',
        },
      };
    }

    const courseService = new CourseService();

    const course = await courseService.getCourseById(courseId);
    if (!course) {
      return {
        status: 404,
        jsonBody: {
          error: 'Course not found',
        },
      };
    }

    const success = await courseService.deleteCourse(courseId);

    if (!success) {
      return {
        status: 404,
        jsonBody: {
          error: 'Course not found',
        },
      };
    }

    context.log(
      `Admin ${authResult.user.userId} deleted course: ${course.courseCode}`
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Course deleted successfully',
      },
    };
  } catch (error: any) {
    context.error('Delete course error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
      },
    };
  }
}

export async function GetCourseStats(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const authResult = await requireAdmin(request);
  if (!authResult.isValid || !authResult.user) {
    return {
      status: 403,
      jsonBody: {
        error: authResult.error || 'Access denied',
      },
    };
  }

  try {
    const courseService = new CourseService();
    const stats = await courseService.getCourseStats();

    return {
      status: 200,
      jsonBody: stats,
    };
  } catch (error: any) {
    context.error('Get course stats error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
      },
    };
  }
}

// Public endpoints
app.http('GetCourses', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'courses',
  handler: GetCourses,
});

app.http('GetCoursesBySemester', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'courses/semester/{semester}',
  handler: GetCoursesBySemester,
});

app.http('GetCourseById', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'courses/{courseId}',
  handler: GetCourseById,
});

app.http('GetCourseByCode', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'courses/code/{courseCode}',
  handler: GetCourseByCode,
});

// Admin endpoints
app.http('CreateCourse', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'course-management/courses',
  handler: CreateCourse,
});

app.http('UpdateCourse', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'course-management/courses/{courseId}',
  handler: UpdateCourse,
});

app.http('DeleteCourse', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'course-management/courses/{courseId}',
  handler: DeleteCourse,
});

app.http('GetCourseStats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'course-management/stats',
  handler: GetCourseStats,
});
