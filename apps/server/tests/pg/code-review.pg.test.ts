/**
 * CodeReviewManager — PostgreSQL Integration Tests
 *
 * Mirrors the InMemory tests in engine/code-review.test.ts but runs against a real PG database.
 * Skipped when TEST_DATABASE_URL is not set.
 */
import { pgTestSuite } from '../helpers/pg-test-helpers.js';
import { CodeReviewManager } from '../../src/engine/code-review.js';
import { PgCodeReviewRepo } from '../../src/db/repositories/code-review-repo.js';

pgTestSuite('CodeReviewManager (PostgreSQL)', ({ getDb }) => {
  let manager: CodeReviewManager;

  beforeEach(() => {
    manager = new CodeReviewManager(new PgCodeReviewRepo(getDb()));
  });

  describe('submitCode', () => {
    it('creates a code submission', async () => {
      const sub = await manager.submitCode({
        title: 'Add login endpoint',
        code: 'function login() {}',
        language: 'typescript',
        author: 'agent-1',
      });
      expect(sub.id).toMatch(/^code-/);
      expect(sub.title).toBe('Add login endpoint');
      expect(sub.code).toBe('function login() {}');
      expect(sub.language).toBe('typescript');
      expect(sub.author).toBe('agent-1');
      expect(sub.status).toBe('pending');
      expect(sub.comments).toEqual([]);
      expect(sub.createdAt).toBeGreaterThan(0);
    });

    it('creates submissions with unique IDs', async () => {
      const s1 = await manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'a' });
      const s2 = await manager.submitCode({ title: 'B', code: 'y', language: 'ts', author: 'b' });
      expect(s1.id).not.toBe(s2.id);
    });
  });

  describe('getSubmission', () => {
    it('returns submission by ID', async () => {
      const created = await manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'a' });
      expect(await manager.getSubmission(created.id)).toEqual(created);
    });

    it('returns undefined for non-existent ID', async () => {
      expect(await manager.getSubmission('code-999')).toBeUndefined();
    });
  });

  describe('getAllSubmissions', () => {
    it('returns empty array initially', async () => {
      expect(await manager.getAllSubmissions()).toEqual([]);
    });

    it('returns all submissions', async () => {
      await manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'a' });
      await manager.submitCode({ title: 'B', code: 'y', language: 'ts', author: 'b' });
      expect(await manager.getAllSubmissions()).toHaveLength(2);
    });
  });

  describe('reviewCode', () => {
    it('approves a submission with comment', async () => {
      const sub = await manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'a' });
      const reviewed = await manager.reviewCode(sub.id, {
        reviewerId: 'reviewer-1',
        status: 'approved',
        comment: 'LGTM',
      });
      expect(reviewed?.status).toBe('approved');
      expect(reviewed?.comments).toHaveLength(1);
      expect(reviewed?.comments[0].reviewerId).toBe('reviewer-1');
      expect(reviewed?.comments[0].content).toBe('LGTM');
    });

    it('rejects a submission', async () => {
      const sub = await manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'a' });
      const reviewed = await manager.reviewCode(sub.id, {
        reviewerId: 'reviewer-1',
        status: 'rejected',
        comment: 'Needs work',
      });
      expect(reviewed?.status).toBe('rejected');
    });

    it('returns undefined for non-existent submission', async () => {
      expect(await manager.reviewCode('code-999', { reviewerId: 'r', status: 'approved', comment: 'ok' })).toBeUndefined();
    });

    it('accumulates multiple review comments', async () => {
      const sub = await manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'a' });
      await manager.reviewCode(sub.id, { reviewerId: 'r1', status: 'changes_requested', comment: 'Fix A' });
      await manager.reviewCode(sub.id, { reviewerId: 'r2', status: 'approved', comment: 'Looks good now' });
      const result = await manager.getSubmission(sub.id);
      expect(result?.comments).toHaveLength(2);
      expect(result?.status).toBe('approved');
    });
  });

  describe('getSubmissionsByStatus', () => {
    it('filters by status', async () => {
      const s1 = await manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'a' });
      await manager.submitCode({ title: 'B', code: 'y', language: 'ts', author: 'b' });
      await manager.reviewCode(s1.id, { reviewerId: 'r', status: 'approved', comment: 'ok' });

      expect(await manager.getSubmissionsByStatus('approved')).toHaveLength(1);
      expect(await manager.getSubmissionsByStatus('pending')).toHaveLength(1);
    });
  });

  describe('getSubmissionsByAuthor', () => {
    it('filters by author', async () => {
      await manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'agent-1' });
      await manager.submitCode({ title: 'B', code: 'y', language: 'ts', author: 'agent-2' });
      await manager.submitCode({ title: 'C', code: 'z', language: 'ts', author: 'agent-1' });

      expect(await manager.getSubmissionsByAuthor('agent-1')).toHaveLength(2);
    });
  });

  describe('getSubmissionCount', () => {
    it('returns count', async () => {
      expect(await manager.getSubmissionCount()).toBe(0);
      await manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'a' });
      expect(await manager.getSubmissionCount()).toBe(1);
    });
  });
});
