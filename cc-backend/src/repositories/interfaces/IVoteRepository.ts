import { VoteEntity } from '../../entities/VoteEntity';

export type VoteTarget = 'review' | 'comment';

export interface VoteResult {
  success: boolean;
  action: 'created' | 'updated' | 'removed';
  previousVote: 'upvote' | 'downvote' | null;
  currentVote: 'upvote' | 'downvote' | null;
  upvotes: number;
  downvotes: number;
}

export interface IVoteRepository {
  getUserVote(
    userId: string,
    targetType: VoteTarget,
    targetId: string
  ): Promise<VoteEntity | null>;
  processVote(
    userId: string,
    targetType: VoteTarget,
    targetId: string,
    voteType: 'upvote' | 'downvote'
  ): Promise<VoteResult>;
  countVotes(
    targetType: VoteTarget,
    targetId: string
  ): Promise<{ upvotes: number; downvotes: number }>;
}

export default IVoteRepository;
