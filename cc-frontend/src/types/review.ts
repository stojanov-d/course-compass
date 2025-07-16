import { User } from './user';

export interface Review {
  reviewId: string;
  courseId: string;
  authorId: string; // Always present - the actual user ID who wrote the review
  user: Pick<User, 'id' | 'displayName' | 'avatarUrl'> | null;
  rating: number;
  difficulty: number;
  workload: number;
  recommendsCourse: boolean;
  reviewText: string;
  isAnonymous: boolean;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  commentsCount: number;
}
