import type { CodeSubmission, CodeSubmissionStatus, CodeReviewComment } from '@lobster-world/protocol';
import type { CodeReviewRepository, SubmitCodeOpts } from '../db/repositories/code-review-repo.js';
import { InMemoryCodeReviewRepo } from '../db/repositories/code-review-repo.js';

export type { SubmitCodeOpts } from '../db/repositories/code-review-repo.js';

export interface ReviewOpts {
  reviewerId: string;
  status: CodeSubmissionStatus;
  comment: string;
}

let nextCommentId = 1;

export class CodeReviewManager {
  private repo: CodeReviewRepository;

  constructor(repo?: CodeReviewRepository) {
    this.repo = repo ?? new InMemoryCodeReviewRepo();
  }

  async submitCode(opts: SubmitCodeOpts): Promise<CodeSubmission> {
    return this.repo.create(opts);
  }

  async getSubmission(id: string): Promise<CodeSubmission | undefined> {
    return this.repo.getById(id);
  }

  async getAllSubmissions(): Promise<CodeSubmission[]> {
    return this.repo.getAll();
  }

  async reviewCode(id: string, review: ReviewOpts): Promise<CodeSubmission | undefined> {
    const submission = await this.repo.getById(id);
    if (!submission) return undefined;

    const comment: CodeReviewComment = {
      id: `comment-${nextCommentId++}`,
      reviewerId: review.reviewerId,
      content: review.comment,
      timestamp: Date.now(),
    };

    return this.repo.update(id, {
      status: review.status,
      comments: [...submission.comments, comment],
    });
  }

  async getSubmissionsByStatus(status: CodeSubmissionStatus): Promise<CodeSubmission[]> {
    return this.repo.getByStatus(status);
  }

  async getSubmissionsByAuthor(author: string): Promise<CodeSubmission[]> {
    return this.repo.getByAuthor(author);
  }

  async getSubmissionCount(): Promise<number> {
    return this.repo.count();
  }
}
