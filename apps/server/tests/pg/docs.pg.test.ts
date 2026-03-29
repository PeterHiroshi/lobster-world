/**
 * DocManager — PostgreSQL Integration Tests
 *
 * Mirrors the InMemory tests in engine/docs.test.ts but runs against a real PG database.
 * Skipped when TEST_DATABASE_URL is not set.
 */
import { pgTestSuite } from '../helpers/pg-test-helpers.js';
import { DocManager } from '../../src/engine/docs.js';
import { PgDocRepo } from '../../src/db/repositories/doc-repo.js';
import type { MemoryCategory } from '@lobster-world/protocol';

pgTestSuite('DocManager (PostgreSQL)', ({ getDb }) => {
  let docs: DocManager;

  beforeEach(() => {
    docs = new DocManager(new PgDocRepo(getDb()));
  });

  describe('createDoc', () => {
    it('creates a document with all fields', async () => {
      const doc = await docs.createDoc({
        category: 'architecture',
        title: 'API Design',
        content: 'RESTful patterns',
        author: 'agent-1',
        tags: ['api', 'rest'],
      });
      expect(doc.id).toMatch(/^doc-/);
      expect(doc.category).toBe('architecture');
      expect(doc.title).toBe('API Design');
      expect(doc.content).toBe('RESTful patterns');
      expect(doc.author).toBe('agent-1');
      expect(doc.tags).toEqual(['api', 'rest']);
      expect(doc.createdAt).toBeGreaterThan(0);
      expect(doc.updatedAt).toBe(doc.createdAt);
    });

    it('creates documents with unique IDs', async () => {
      const d1 = await docs.createDoc({
        category: 'architecture',
        title: 'Doc 1',
        content: 'Content 1',
        author: 'agent-1',
        tags: [],
      });
      const d2 = await docs.createDoc({
        category: 'architecture',
        title: 'Doc 2',
        content: 'Content 2',
        author: 'agent-1',
        tags: [],
      });
      expect(d1.id).not.toBe(d2.id);
    });
  });

  describe('getDoc', () => {
    it('retrieves a document by ID', async () => {
      const created = await docs.createDoc({
        category: 'architecture',
        title: 'Test',
        content: 'Content',
        author: 'agent-1',
        tags: ['test'],
      });
      const found = await docs.getDoc(created.id);
      expect(found).toEqual(created);
    });

    it('returns undefined for unknown ID', async () => {
      expect(await docs.getDoc('doc-999')).toBeUndefined();
    });
  });

  describe('getAllDocs', () => {
    it('returns all documents', async () => {
      await docs.createDoc({ category: 'architecture', title: 'A', content: 'a', author: 'x', tags: [] });
      await docs.createDoc({ category: 'notes', title: 'B', content: 'b', author: 'x', tags: [] });
      const all = await docs.getAllDocs();
      expect(all).toHaveLength(2);
    });
  });

  describe('updateDoc', () => {
    it('updates title and content', async () => {
      const doc = await docs.createDoc({
        category: 'architecture',
        title: 'Old Title',
        content: 'Old Content',
        author: 'agent-1',
        tags: [],
      });
      const updated = await docs.updateDoc(doc.id, {
        title: 'New Title',
        content: 'New Content',
      });
      expect(updated?.title).toBe('New Title');
      expect(updated?.content).toBe('New Content');
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(doc.createdAt);
    });

    it('returns undefined for non-existent doc', async () => {
      expect(await docs.updateDoc('doc-999', { title: 'X' })).toBeUndefined();
    });
  });

  describe('deleteDoc', () => {
    it('deletes an existing doc', async () => {
      const doc = await docs.createDoc({
        category: 'architecture',
        title: 'Delete Me',
        content: 'Gone',
        author: 'agent-1',
        tags: [],
      });
      expect(await docs.deleteDoc(doc.id)).toBe(true);
      expect(await docs.getDoc(doc.id)).toBeUndefined();
    });

    it('returns false for non-existent doc', async () => {
      expect(await docs.deleteDoc('doc-999')).toBe(false);
    });
  });

  describe('getDocsByCategory', () => {
    it('filters by category', async () => {
      await docs.createDoc({ category: 'architecture', title: 'A', content: 'a', author: 'x', tags: [] });
      await docs.createDoc({ category: 'notes', title: 'B', content: 'b', author: 'x', tags: [] });
      await docs.createDoc({ category: 'architecture', title: 'C', content: 'c', author: 'x', tags: [] });
      expect(await docs.getDocsByCategory('architecture')).toHaveLength(2);
      expect(await docs.getDocsByCategory('notes')).toHaveLength(1);
    });
  });

  describe('searchDocs', () => {
    it('searches by title and content', async () => {
      await docs.createDoc({ category: 'architecture', title: 'API Design', content: 'REST patterns', author: 'x', tags: [] });
      await docs.createDoc({ category: 'notes', title: 'Meeting Notes', content: 'Discuss API', author: 'x', tags: [] });
      await docs.createDoc({ category: 'notes', title: 'Random', content: 'Nothing here', author: 'x', tags: [] });

      const results = await docs.searchDocs('api');
      expect(results).toHaveLength(2);
    });
  });

  describe('getDocCount', () => {
    it('returns correct count', async () => {
      expect(await docs.getDocCount()).toBe(0);
      await docs.createDoc({ category: 'architecture', title: 'A', content: 'a', author: 'x', tags: [] });
      expect(await docs.getDocCount()).toBe(1);
    });
  });
});
