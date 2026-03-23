import type { CodeSubmission, CodeSubmissionStatus, CodeReviewComment } from '@lobster-world/protocol';

export interface SubmitCodeOpts {
  title: string;
  code: string;
  language: string;
  author: string;
}

export interface ReviewOpts {
  reviewerId: string;
  status: CodeSubmissionStatus;
  comment: string;
}

export class CodeReviewManager {
  private submissions: Map<string, CodeSubmission> = new Map();
  private nextId: number = 1;
  private nextCommentId: number = 1;

  submitCode(opts: SubmitCodeOpts): CodeSubmission {
    const id = `code-${this.nextId++}`;
    const now = Date.now();
    const submission: CodeSubmission = {
      id,
      title: opts.title,
      code: opts.code,
      language: opts.language,
      author: opts.author,
      status: 'pending',
      comments: [],
      createdAt: now,
      updatedAt: now,
    };
    this.submissions.set(id, submission);
    return submission;
  }

  getSubmission(id: string): CodeSubmission | undefined {
    return this.submissions.get(id);
  }

  getAllSubmissions(): CodeSubmission[] {
    return [...this.submissions.values()];
  }

  reviewCode(id: string, review: ReviewOpts): CodeSubmission | undefined {
    const submission = this.submissions.get(id);
    if (!submission) return undefined;

    const comment: CodeReviewComment = {
      id: `comment-${this.nextCommentId++}`,
      reviewerId: review.reviewerId,
      content: review.comment,
      timestamp: Date.now(),
    };

    submission.comments.push(comment);
    submission.status = review.status;
    submission.updatedAt = Date.now();
    return submission;
  }

  getSubmissionsByStatus(status: CodeSubmissionStatus): CodeSubmission[] {
    return this.getAllSubmissions().filter((s) => s.status === status);
  }

  getSubmissionsByAuthor(author: string): CodeSubmission[] {
    return this.getAllSubmissions().filter((s) => s.author === author);
  }

  getSubmissionCount(): number {
    return this.submissions.size;
  }
}
