import {
  CourseFilters,
  CoursesResponse,
  CoursesBySemesterResponse,
  Course,
  CourseStats,
} from '../types/course';
import apiClient from './apiClient';

export const getCourses = async (
  filters?: CourseFilters
): Promise<CoursesResponse> => {
  const params = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
  }

  const response = await apiClient.get(`/courses?${params}`);
  return response.data;
};

export const getCoursesBySemester = async (
  semester: number
): Promise<CoursesBySemesterResponse> => {
  const response = await apiClient.get(`/courses/semester/${semester}`);
  return response.data;
};

export const getCourseById = async (courseId: string): Promise<Course> => {
  const response = await apiClient.get(`/courses/${courseId}`);
  return response.data;
};

export const getCourseByCode = async (courseCode: string): Promise<Course> => {
  const response = await apiClient.get(`/courses/code/${courseCode}`);
  return response.data;
};

export const getCourseStats = async (): Promise<CourseStats> => {
  const response = await apiClient.get('/course-management/stats');
  return response.data;
};
