import { User } from './user';

export interface Review {
  reviewId: string;
  courseId: string;
  user: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
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
