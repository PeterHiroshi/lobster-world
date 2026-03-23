import { describe, it, expect, beforeEach } from 'vitest';
import { DocManager } from '../../src/engine/docs.js';
import type { MemoryCategory } from '@lobster-world/protocol';

describe('DocManager', () => {
  let docs: DocManager;

  beforeEach(() => {
    docs = new DocManager();
  });

  describe('createDoc', () => {
    it('creates a document with all fields', () => {
      const doc = docs.createDoc({
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

    it('creates documents with incrementing IDs', () => {
      const doc1 = docs.createDoc({ category: 'general', title: 'A', content: 'x', author: 'a', tags: [] });
      const doc2 = docs.createDoc({ category: 'general', title: 'B', content: 'y', author: 'b', tags: [] });
      expect(doc1.id).not.toBe(doc2.id);
    });
  });

  describe('getDoc', () => {
    it('returns document by ID', () => {
      const created = docs.createDoc({ category: 'bugs', title: 'Bug 1', content: 'desc', author: 'a', tags: [] });
      const retrieved = docs.getDoc(created.id);
      expect(retrieved).toEqual(created);
    });

    it('returns undefined for non-existent ID', () => {
      expect(docs.getDoc('doc-999')).toBeUndefined();
    });
  });

  describe('getAllDocs', () => {
    it('returns empty array when no docs', () => {
      expect(docs.getAllDocs()).toEqual([]);
    });

    it('returns all documents', () => {
      docs.createDoc({ category: 'general', title: 'A', content: 'x', author: 'a', tags: [] });
      docs.createDoc({ category: 'general', title: 'B', content: 'y', author: 'b', tags: [] });
      expect(docs.getAllDocs()).toHaveLength(2);
    });
  });

  describe('updateDoc', () => {
    it('updates title and content', () => {
      const doc = docs.createDoc({ category: 'general', title: 'Old', content: 'old', author: 'a', tags: [] });
      const updated = docs.updateDoc(doc.id, { title: 'New', content: 'new' });
      expect(updated?.title).toBe('New');
      expect(updated?.content).toBe('new');
      expect(updated!.updatedAt).toBeGreaterThanOrEqual(doc.createdAt);
    });

    it('returns undefined for non-existent doc', () => {
      expect(docs.updateDoc('doc-999', { title: 'x' })).toBeUndefined();
    });

    it('updates tags', () => {
      const doc = docs.createDoc({ category: 'general', title: 'A', content: 'x', author: 'a', tags: ['old'] });
      const updated = docs.updateDoc(doc.id, { tags: ['new'] });
      expect(updated?.tags).toEqual(['new']);
    });
  });

  describe('deleteDoc', () => {
    it('deletes an existing document', () => {
      const doc = docs.createDoc({ category: 'general', title: 'A', content: 'x', author: 'a', tags: [] });
      expect(docs.deleteDoc(doc.id)).toBe(true);
      expect(docs.getDoc(doc.id)).toBeUndefined();
    });

    it('returns false for non-existent doc', () => {
      expect(docs.deleteDoc('doc-999')).toBe(false);
    });
  });

  describe('getDocsByCategory', () => {
    it('filters documents by category', () => {
      docs.createDoc({ category: 'architecture', title: 'A', content: 'x', author: 'a', tags: [] });
      docs.createDoc({ category: 'bugs', title: 'B', content: 'y', author: 'b', tags: [] });
      docs.createDoc({ category: 'architecture', title: 'C', content: 'z', author: 'c', tags: [] });

      const archDocs = docs.getDocsByCategory('architecture');
      expect(archDocs).toHaveLength(2);
      expect(archDocs.every((d) => d.category === 'architecture')).toBe(true);
    });
  });

  describe('getDocsByTag', () => {
    it('filters documents by tag', () => {
      docs.createDoc({ category: 'general', title: 'A', content: 'x', author: 'a', tags: ['api', 'rest'] });
      docs.createDoc({ category: 'general', title: 'B', content: 'y', author: 'b', tags: ['db'] });
      docs.createDoc({ category: 'general', title: 'C', content: 'z', author: 'c', tags: ['api'] });

      const apiDocs = docs.getDocsByTag('api');
      expect(apiDocs).toHaveLength(2);
    });
  });

  describe('searchDocs', () => {
    it('searches in title and content', () => {
      docs.createDoc({ category: 'general', title: 'WebSocket Protocol', content: 'binary frames', author: 'a', tags: [] });
      docs.createDoc({ category: 'general', title: 'REST API', content: 'websocket fallback', author: 'b', tags: [] });
      docs.createDoc({ category: 'general', title: 'Database', content: 'indexes', author: 'c', tags: [] });

      const results = docs.searchDocs('websocket');
      expect(results).toHaveLength(2);
    });

    it('returns empty for no match', () => {
      docs.createDoc({ category: 'general', title: 'A', content: 'x', author: 'a', tags: [] });
      expect(docs.searchDocs('nonexistent')).toEqual([]);
    });
  });

  describe('getDocCount', () => {
    it('returns count of all documents', () => {
      expect(docs.getDocCount()).toBe(0);
      docs.createDoc({ category: 'general', title: 'A', content: 'x', author: 'a', tags: [] });
      expect(docs.getDocCount()).toBe(1);
    });
  });
});
