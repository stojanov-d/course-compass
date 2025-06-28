/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
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

interface UseCoursesResult {
  courses: Course[];
  loading: boolean;
  error: string | null;
  total: number;
  filters: CourseFilters;
  fetchCourses: (filters?: CourseFilters) => Promise<void>;
  searchCourses: (searchTerm: string) => Promise<void>;
  filterBySemester: (semester: number) => Promise<void>;
  clearFilters: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const useCourses = (
  initialFilters?: CourseFilters
): UseCoursesResult => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<CourseFilters>(
    initialFilters || { isActive: true }
  );

  const fetchCourses = useCallback(
    async (newFilters?: CourseFilters) => {
      setLoading(true);
      setError(null);

      try {
        const filtersToUse = newFilters || filters;
        const response: CoursesResponse = await getCourses(filtersToUse);

        setCourses(response.courses);
        setTotal(response.total);
        setFilters(filtersToUse);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to fetch courses');
        setCourses([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const searchCourses = useCallback(
    async (searchTerm: string) => {
      const newFilters = { ...filters, searchTerm };
      await fetchCourses(newFilters);
    },
    [filters, fetchCourses]
  );

  const filterBySemester = useCallback(
    async (semester: number) => {
      const newFilters = { ...filters, semester };
      await fetchCourses(newFilters);
    },
    [filters, fetchCourses]
  );

  const clearFilters = useCallback(async () => {
    const clearedFilters = { isActive: true };
    await fetchCourses(clearedFilters);
  }, [fetchCourses]);

  const refetch = useCallback(async () => {
    await fetchCourses(filters);
  }, [fetchCourses, filters]);

  useEffect(() => {
    fetchCourses();
  }, []);

  return {
    courses,
    loading,
    error,
    total,
    filters,
    fetchCourses,
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
      setError('Semester must be between 1 and 8');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response: CoursesBySemesterResponse =
        await getCoursesBySemester(semesterNumber);

      setCourses(response.courses);
      setTotal(response.total);
      setSemester(response.semester);
    } catch (err: any) {
      setError(
        err.response?.data?.error || 'Failed to fetch courses by semester'
      );
      setCourses([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (semester >= 1 && semester <= 8) {
      fetchCoursesBySemester(semester);
    }
  }, [semester, fetchCoursesBySemester]);

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
