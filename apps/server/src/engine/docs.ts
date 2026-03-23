import type { MemoryEntry, MemoryCategory } from '@lobster-world/protocol';

export interface CreateDocOpts {
  category: MemoryCategory;
  title: string;
  content: string;
  author: string;
  tags: string[];
}

export class DocManager {
  private docs: Map<string, MemoryEntry> = new Map();
  private nextId: number = 1;

  createDoc(opts: CreateDocOpts): MemoryEntry {
    const id = `doc-${this.nextId++}`;
    const now = Date.now();
    const doc: MemoryEntry = {
      id,
      category: opts.category,
      title: opts.title,
      content: opts.content,
      author: opts.author,
      tags: [...opts.tags],
      createdAt: now,
      updatedAt: now,
    };
    this.docs.set(id, doc);
    return doc;
  }

  getDoc(id: string): MemoryEntry | undefined {
    return this.docs.get(id);
  }

  getAllDocs(): MemoryEntry[] {
    return [...this.docs.values()];
  }

  updateDoc(
    id: string,
    partial: Partial<Pick<MemoryEntry, 'title' | 'content' | 'tags' | 'category'>>,
  ): MemoryEntry | undefined {
    const doc = this.docs.get(id);
    if (!doc) return undefined;
    if (partial.title !== undefined) doc.title = partial.title;
    if (partial.content !== undefined) doc.content = partial.content;
    if (partial.tags !== undefined) doc.tags = [...partial.tags];
    if (partial.category !== undefined) doc.category = partial.category;
    doc.updatedAt = Date.now();
    return doc;
  }

  deleteDoc(id: string): boolean {
    return this.docs.delete(id);
  }

  getDocsByCategory(category: MemoryCategory): MemoryEntry[] {
    return this.getAllDocs().filter((d) => d.category === category);
  }

  getDocsByTag(tag: string): MemoryEntry[] {
    return this.getAllDocs().filter((d) => d.tags.includes(tag));
  }

  searchDocs(query: string): MemoryEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllDocs().filter(
      (d) => d.title.toLowerCase().includes(lowerQuery) || d.content.toLowerCase().includes(lowerQuery),
    );
  }

  getDocCount(): number {
    return this.docs.size;
  }
}
