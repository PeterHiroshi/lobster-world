import type { MemoryEntry, MemoryCategory } from '@lobster-world/protocol';
import type { DocRepository, CreateDocOpts } from '../db/repositories/doc-repo.js';
import { InMemoryDocRepo } from '../db/repositories/doc-repo.js';

export type { CreateDocOpts } from '../db/repositories/doc-repo.js';

export class DocManager {
  private repo: DocRepository;

  constructor(repo?: DocRepository) {
    this.repo = repo ?? new InMemoryDocRepo();
  }

  async createDoc(opts: CreateDocOpts): Promise<MemoryEntry> {
    return this.repo.create(opts);
  }

  async getDoc(id: string): Promise<MemoryEntry | undefined> {
    return this.repo.getById(id);
  }

  async getAllDocs(): Promise<MemoryEntry[]> {
    return this.repo.getAll();
  }

  async updateDoc(
    id: string,
    partial: Partial<Pick<MemoryEntry, 'title' | 'content' | 'tags' | 'category'>>,
  ): Promise<MemoryEntry | undefined> {
    return this.repo.update(id, partial);
  }

  async deleteDoc(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async getDocsByCategory(category: MemoryCategory): Promise<MemoryEntry[]> {
    return this.repo.getByCategory(category);
  }

  async getDocsByTag(tag: string): Promise<MemoryEntry[]> {
    const all = await this.repo.getAll();
    return all.filter((d) => d.tags.includes(tag));
  }

  async searchDocs(query: string): Promise<MemoryEntry[]> {
    const lowerQuery = query.toLowerCase();
    const all = await this.repo.getAll();
    return all.filter(
      (d) => d.title.toLowerCase().includes(lowerQuery) || d.content.toLowerCase().includes(lowerQuery),
    );
  }

  async getDocCount(): Promise<number> {
    return this.repo.count();
  }
}
