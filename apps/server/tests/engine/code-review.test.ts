import { describe, it, expect, beforeEach } from 'vitest';
import { CodeReviewManager } from '../../src/engine/code-review.js';
import type { CodeSubmissionStatus } from '@lobster-world/protocol';

describe('CodeReviewManager', () => {
  let manager: CodeReviewManager;

  beforeEach(() => {
    manager = new CodeReviewManager();
  });

  describe('submitCode', () => {
    it('creates a code submission', () => {
      const sub = manager.submitCode({
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

    it('creates submissions with unique IDs', () => {
      const s1 = manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'a' });
      const s2 = manager.submitCode({ title: 'B', code: 'y', language: 'ts', author: 'b' });
      expect(s1.id).not.toBe(s2.id);
    });
  });

  describe('getSubmission', () => {
    it('returns submission by ID', () => {
      const created = manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'a' });
      expect(manager.getSubmission(created.id)).toEqual(created);
    });

    it('returns undefined for non-existent ID', () => {
      expect(manager.getSubmission('code-999')).toBeUndefined();
    });
  });

  describe('getAllSubmissions', () => {
    it('returns empty array initially', () => {
      expect(manager.getAllSubmissions()).toEqual([]);
    });

    it('returns all submissions', () => {
      manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'a' });
      manager.submitCode({ title: 'B', code: 'y', language: 'ts', author: 'b' });
      expect(manager.getAllSubmissions()).toHaveLength(2);
    });
  });

  describe('reviewCode', () => {
    it('approves a submission with comment', () => {
      const sub = manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'a' });
      const reviewed = manager.reviewCode(sub.id, {
        reviewerId: 'reviewer-1',
        status: 'approved',
        comment: 'LGTM',
      });
      expect(reviewed?.status).toBe('approved');
      expect(reviewed?.comments).toHaveLength(1);
      expect(reviewed?.comments[0].reviewerId).toBe('reviewer-1');
      expect(reviewed?.comments[0].content).toBe('LGTM');
    });

    it('rejects a submission', () => {
      const sub = manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'a' });
      const reviewed = manager.reviewCode(sub.id, {
        reviewerId: 'reviewer-1',
        status: 'rejected',
        comment: 'Needs work',
      });
      expect(reviewed?.status).toBe('rejected');
    });

    it('requests changes on a submission', () => {
      const sub = manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'a' });
      const reviewed = manager.reviewCode(sub.id, {
        reviewerId: 'reviewer-1',
        status: 'changes_requested',
        comment: 'Fix error handling',
      });
      expect(reviewed?.status).toBe('changes_requested');
    });

    it('returns undefined for non-existent submission', () => {
      expect(manager.reviewCode('code-999', { reviewerId: 'r', status: 'approved', comment: 'ok' })).toBeUndefined();
    });

    it('accumulates multiple review comments', () => {
      const sub = manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'a' });
      manager.reviewCode(sub.id, { reviewerId: 'r1', status: 'changes_requested', comment: 'Fix A' });
      manager.reviewCode(sub.id, { reviewerId: 'r2', status: 'approved', comment: 'Looks good now' });
      const result = manager.getSubmission(sub.id);
      expect(result?.comments).toHaveLength(2);
      expect(result?.status).toBe('approved');
    });
  });

  describe('getSubmissionsByStatus', () => {
    it('filters by status', () => {
      const s1 = manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'a' });
      manager.submitCode({ title: 'B', code: 'y', language: 'ts', author: 'b' });
      manager.reviewCode(s1.id, { reviewerId: 'r', status: 'approved', comment: 'ok' });

      expect(manager.getSubmissionsByStatus('approved')).toHaveLength(1);
      expect(manager.getSubmissionsByStatus('pending')).toHaveLength(1);
    });
  });

  describe('getSubmissionsByAuthor', () => {
    it('filters by author', () => {
      manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'agent-1' });
      manager.submitCode({ title: 'B', code: 'y', language: 'ts', author: 'agent-2' });
      manager.submitCode({ title: 'C', code: 'z', language: 'ts', author: 'agent-1' });

      expect(manager.getSubmissionsByAuthor('agent-1')).toHaveLength(2);
    });
  });

  describe('getSubmissionCount', () => {
    it('returns count', () => {
      expect(manager.getSubmissionCount()).toBe(0);
      manager.submitCode({ title: 'A', code: 'x', language: 'ts', author: 'a' });
      expect(manager.getSubmissionCount()).toBe(1);
    });
  });
});
