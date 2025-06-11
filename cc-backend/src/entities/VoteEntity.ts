import { BaseTableEntity } from './BaseEntity';

export interface IVoteEntity {
  voteId: string;
  targetType: 'review' | 'comment';
  targetId: string;
  voteType: 'upvote' | 'downvote';
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoteTrackingData {
  userId: string;
  voteType: 'upvote' | 'downvote';
  targetType: 'review' | 'comment';
  targetId: string;
}

export interface VoteResult {
  success: boolean;
  action: 'created' | 'updated' | 'removed';
  previousVote?: 'upvote' | 'downvote' | null;
  currentVote?: 'upvote' | 'downvote' | null;
  upvotes: number;
  downvotes: number;
}

export class VoteEntity extends BaseTableEntity implements IVoteEntity {
  public voteId: string;
  public targetType: 'review' | 'comment';
  public targetId: string;
  public voteType: 'upvote' | 'downvote';
  public userId: string;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: Omit<IVoteEntity, 'voteId'> & { voteId?: string }) {
    const voteId = data.voteId || crypto.randomUUID();
    super(
      `VOTE_${data.targetType.toUpperCase()}_${data.targetId}`,
      data.userId
    );

    this.voteId = voteId;
    this.targetType = data.targetType;
    this.targetId = data.targetId;
    this.voteType = data.voteType;
    this.userId = data.userId;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
