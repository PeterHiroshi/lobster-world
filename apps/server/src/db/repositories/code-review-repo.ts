import type { CodeSubmission, CodeSubmissionStatus, CodeReviewComment } from '@lobster-world/protocol';
import { eq } from 'drizzle-orm';
import type { Database } from '../connection.js';
import { codeSubmissions } from '../schema.js';

export interface SubmitCodeOpts {
  title: string;
  code: string;
  language: string;
  author: string;
}

export interface CodeReviewRepository {
  create(opts: SubmitCodeOpts): Promise<CodeSubmission>;
  getById(id: string): Promise<CodeSubmission | undefined>;
  getAll(): Promise<CodeSubmission[]>;
  getByStatus(status: CodeSubmissionStatus): Promise<CodeSubmission[]>;
  getByAuthor(author: string): Promise<CodeSubmission[]>;
  update(id: string, partial: { status?: CodeSubmissionStatus; comments?: CodeReviewComment[] }): Promise<CodeSubmission | undefined>;
  count(): Promise<number>;
}

export class InMemoryCodeReviewRepo implements CodeReviewRepository {
  private submissions: Map<string, CodeSubmission> = new Map();
  private nextId = 1;

  async create(opts: SubmitCodeOpts): Promise<CodeSubmission> {
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

  async getById(id: string): Promise<CodeSubmission | undefined> {
    return this.submissions.get(id);
  }

  async getAll(): Promise<CodeSubmission[]> {
    return [...this.submissions.values()];
  }

  async getByStatus(status: CodeSubmissionStatus): Promise<CodeSubmission[]> {
    return [...this.submissions.values()].filter((s) => s.status === status);
  }

  async getByAuthor(author: string): Promise<CodeSubmission[]> {
    return [...this.submissions.values()].filter((s) => s.author === author);
  }

  async update(id: string, partial: { status?: CodeSubmissionStatus; comments?: CodeReviewComment[] }): Promise<CodeSubmission | undefined> {
    const sub = this.submissions.get(id);
    if (!sub) return undefined;
    if (partial.status !== undefined) sub.status = partial.status;
    if (partial.comments !== undefined) sub.comments = partial.comments;
    sub.updatedAt = Date.now();
    return sub;
  }

  async count(): Promise<number> {
    return this.submissions.size;
  }
}

function rowToSubmission(row: typeof codeSubmissions.$inferSelect): CodeSubmission {
  return {
    id: row.id,
    title: row.title,
    code: row.code,
    language: row.language,
    author: row.author,
    status: row.status as CodeSubmissionStatus,
    comments: (row.comments as CodeReviewComment[]) ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PgCodeReviewRepo implements CodeReviewRepository {
  private nextId = 1;

  constructor(private db: Database) {}

  async create(opts: SubmitCodeOpts): Promise<CodeSubmission> {
    const id = `code-${this.nextId++}`;
    const now = Date.now();
    const [row] = await this.db.insert(codeSubmissions).values({
      id,
      title: opts.title,
      code: opts.code,
      language: opts.language,
      author: opts.author,
      status: 'pending',
      comments: [],
      createdAt: now,
      updatedAt: now,
    }).returning();
    return rowToSubmission(row);
  }

  async getById(id: string): Promise<CodeSubmission | undefined> {
    const [row] = await this.db.select().from(codeSubmissions).where(eq(codeSubmissions.id, id));
    return row ? rowToSubmission(row) : undefined;
  }

  async getAll(): Promise<CodeSubmission[]> {
    const rows = await this.db.select().from(codeSubmissions);
    return rows.map(rowToSubmission);
  }

  async getByStatus(status: CodeSubmissionStatus): Promise<CodeSubmission[]> {
    const rows = await this.db.select().from(codeSubmissions).where(eq(codeSubmissions.status, status));
    return rows.map(rowToSubmission);
  }

  async getByAuthor(author: string): Promise<CodeSubmission[]> {
    const rows = await this.db.select().from(codeSubmissions).where(eq(codeSubmissions.author, author));
    return rows.map(rowToSubmission);
  }

  async update(id: string, partial: { status?: CodeSubmissionStatus; comments?: CodeReviewComment[] }): Promise<CodeSubmission | undefined> {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (partial.status !== undefined) updates.status = partial.status;
    if (partial.comments !== undefined) updates.comments = partial.comments;

    const [row] = await this.db.update(codeSubmissions).set(updates).where(eq(codeSubmissions.id, id)).returning();
    return row ? rowToSubmission(row) : undefined;
  }

  async count(): Promise<number> {
    const rows = await this.db.select().from(codeSubmissions);
    return rows.length;
  }
}
