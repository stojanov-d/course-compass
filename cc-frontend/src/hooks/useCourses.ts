/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Course,
  CourseFilters,
  CoursesBySemesterResponse,
  CoursesResponse,
} from '../types/course';
import {
  getCourses,
  getCoursesBySemester,
  getCourseById,
  getCourseByCode,
} from '../api/courseApi';

const filterCoursesLocally = (
  courses: Course[],
  filters: CourseFilters
): Course[] => {
  return courses.filter((course) => {
    if (filters.semester && course.semester !== filters.semester) {
      return false;
    }

    if (
      filters.isRequired !== undefined &&
      course.isRequired !== filters.isRequired
    ) {
      return false;
    }

    if (filters.level && course.level !== filters.level) {
      return false;
    }

    if (
      filters.minRating &&
      (!course.averageRating || course.averageRating < filters.minRating)
    ) {
      return false;
    }

    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      const courseName = course.courseName.toLowerCase();
      const courseCode = course.courseCode.toLowerCase();
      const description = course.description?.toLowerCase() || '';

      if (
        !courseName.includes(searchTerm) &&
        !courseCode.includes(searchTerm) &&
        !description.includes(searchTerm)
      ) {
        return false;
      }
    }

    return true;
  });
};

interface UseCoursesResult {
  courses: Course[];
  loading: boolean;
  error: string | null;
  total: number;
  filters: CourseFilters;
  fetchCourses: (filters?: CourseFilters) => void;
  searchCourses: (searchTerm: string) => void;
  filterBySemester: (semester: number) => void;
  clearFilters: () => void;
  refetch: () => Promise<void>;
}

export const useCourses = (
  initialFilters?: CourseFilters
): UseCoursesResult => {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CourseFilters>(
    initialFilters || { isActive: true }
  );

  const courses = useMemo(() => {
    return filterCoursesLocally(allCourses, filters);
  }, [allCourses, filters]);

  const fetchAllCourses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: CoursesResponse = await getCourses({ isActive: true });
      setAllCourses(response.courses);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch courses');
      setAllCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFilters = useCallback((newFilters?: CourseFilters) => {
    if (newFilters) {
      setFilters(newFilters);
    }
  }, []);

  const searchCourses = useCallback(
    (searchTerm: string) => {
      const newFilters = { ...filters, searchTerm };
      setFilters(newFilters);
    },
    [filters]
  );

  const filterBySemester = useCallback(
    (semester: number) => {
      const newFilters = { ...filters, semester };
      setFilters(newFilters);
    },
    [filters]
  );

  const clearFilters = useCallback(() => {
    const clearedFilters = { isActive: true };
    setFilters(clearedFilters);
  }, []);

  const refetch = useCallback(async () => {
    await fetchAllCourses();
  }, [fetchAllCourses]);

  useEffect(() => {
    fetchAllCourses();
  }, [fetchAllCourses]);

  return {
    courses,
    loading,
    error,
    total: courses.length,
    filters,
    fetchCourses: updateFilters,
    searchCourses,
    filterBySemester,
    clearFilters,
    refetch,
  };
};

interface UseCoursesBySemesterResult {
  courses: Course[];
  loading: boolean;
  error: string | null;
  total: number;
  semester: number;
  fetchCoursesBySemester: (semester: number) => Promise<void>;
}

export const useCoursesBySemester = (
  initialSemester?: number
): UseCoursesBySemesterResult => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [semester, setSemester] = useState(initialSemester || 1);

  const fetchCoursesBySemester = useCallback(async (semesterNumber: number) => {
    if (semesterNumber < 1 || semesterNumber > 8) {
      setError('Invalid semester number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response: CoursesBySemesterResponse =
        await getCoursesBySemester(semesterNumber);

      setCourses(response.courses);
      setTotal(response.total);
      setSemester(semesterNumber);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch courses');
      setCourses([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoursesBySemester(semester);
  }, []);

  return {
    courses,
    loading,
    error,
    total,
    semester,
    fetchCoursesBySemester,
  };
};

interface UseCourseResult {
  course: Course | null;
  loading: boolean;
  error: string | null;
  fetchCourseById: (courseId: string) => Promise<void>;
  fetchCourseByCode: (courseCode: string) => Promise<void>;
}

export const useCourse = (): UseCourseResult => {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCourseById = useCallback(async (courseId: string) => {
    setLoading(true);
    setError(null);

    try {
      const courseData = await getCourseById(courseId);
      setCourse(courseData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch course');
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCourseByCode = useCallback(async (courseCode: string) => {
    setLoading(true);
    setError(null);

    try {
      const courseData = await getCourseByCode(courseCode);
      setCourse(courseData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch course');
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    course,
    loading,
    error,
    fetchCourseById,
    fetchCourseByCode,
  };
};
