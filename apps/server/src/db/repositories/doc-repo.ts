import type { MemoryEntry, MemoryCategory } from '@lobster-world/protocol';
import { eq, sql } from 'drizzle-orm';
import type { Database } from '../connection.js';
import { documents } from '../schema.js';

export interface CreateDocOpts {
  category: MemoryCategory;
  title: string;
  content: string;
  author: string;
  tags: string[];
}

export interface DocRepository {
  create(opts: CreateDocOpts): Promise<MemoryEntry>;
  getById(id: string): Promise<MemoryEntry | undefined>;
  getAll(): Promise<MemoryEntry[]>;
  update(id: string, partial: Partial<Pick<MemoryEntry, 'title' | 'content' | 'tags' | 'category'>>): Promise<MemoryEntry | undefined>;
  delete(id: string): Promise<boolean>;
  getByCategory(category: MemoryCategory): Promise<MemoryEntry[]>;
  count(): Promise<number>;
}

export class InMemoryDocRepo implements DocRepository {
  private docs: Map<string, MemoryEntry> = new Map();
  private nextId = 1;

  async create(opts: CreateDocOpts): Promise<MemoryEntry> {
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

  async getById(id: string): Promise<MemoryEntry | undefined> {
    return this.docs.get(id);
  }

  async getAll(): Promise<MemoryEntry[]> {
    return [...this.docs.values()];
  }

  async update(id: string, partial: Partial<Pick<MemoryEntry, 'title' | 'content' | 'tags' | 'category'>>): Promise<MemoryEntry | undefined> {
    const doc = this.docs.get(id);
    if (!doc) return undefined;
    if (partial.title !== undefined) doc.title = partial.title;
    if (partial.content !== undefined) doc.content = partial.content;
    if (partial.tags !== undefined) doc.tags = [...partial.tags];
    if (partial.category !== undefined) doc.category = partial.category;
    doc.updatedAt = Date.now();
    return doc;
  }

  async delete(id: string): Promise<boolean> {
    return this.docs.delete(id);
  }

  async getByCategory(category: MemoryCategory): Promise<MemoryEntry[]> {
    return [...this.docs.values()].filter((d) => d.category === category);
  }

  async count(): Promise<number> {
    return this.docs.size;
  }
}

function rowToDoc(row: typeof documents.$inferSelect): MemoryEntry {
  return {
    id: row.id,
    category: row.category as MemoryCategory,
    title: row.title,
    content: row.content,
    author: row.author,
    tags: (row.tags as string[]) ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PgDocRepo implements DocRepository {
  private nextId = 1;

  constructor(private db: Database) {}

  async create(opts: CreateDocOpts): Promise<MemoryEntry> {
    const id = `doc-${this.nextId++}`;
    const now = Date.now();
    const [row] = await this.db.insert(documents).values({
      id,
      category: opts.category,
      title: opts.title,
      content: opts.content,
      author: opts.author,
      tags: [...opts.tags],
      createdAt: now,
      updatedAt: now,
    }).returning();
    return rowToDoc(row);
  }

  async getById(id: string): Promise<MemoryEntry | undefined> {
    const [row] = await this.db.select().from(documents).where(eq(documents.id, id));
    return row ? rowToDoc(row) : undefined;
  }

  async getAll(): Promise<MemoryEntry[]> {
    const rows = await this.db.select().from(documents);
    return rows.map(rowToDoc);
  }

  async update(id: string, partial: Partial<Pick<MemoryEntry, 'title' | 'content' | 'tags' | 'category'>>): Promise<MemoryEntry | undefined> {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (partial.title !== undefined) updates.title = partial.title;
    if (partial.content !== undefined) updates.content = partial.content;
    if (partial.tags !== undefined) updates.tags = [...partial.tags];
    if (partial.category !== undefined) updates.category = partial.category;

    const [row] = await this.db.update(documents).set(updates).where(eq(documents.id, id)).returning();
    return row ? rowToDoc(row) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(documents).where(eq(documents.id, id)).returning();
    return result.length > 0;
  }

  async getByCategory(category: MemoryCategory): Promise<MemoryEntry[]> {
    const rows = await this.db.select().from(documents).where(eq(documents.category, category));
    return rows.map(rowToDoc);
  }

  async count(): Promise<number> {
    const [result] = await this.db.select({ count: sql<number>`count(*)` }).from(documents);
    return Number(result.count);
  }
}
