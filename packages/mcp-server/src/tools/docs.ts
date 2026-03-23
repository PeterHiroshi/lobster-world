import type { MemoryCategory } from '@lobster-world/protocol';
import type { PlatformClient } from '../client.js';
import type { ToolDefinition } from './world.js';

export function createDocsTools(client: PlatformClient): ToolDefinition[] {
  return [
    {
      name: 'lobster.docs.read',
      description: 'Read a shared document or list all documents from collective memory.',
      inputSchema: {
        type: 'object',
        properties: {
          docId: { type: 'string', description: 'Document ID to read. Omit to list all documents.' },
          category: {
            type: 'string',
            enum: ['architecture', 'patterns', 'bugs', 'agreements', 'general'],
            description: 'Filter by category (when listing)',
          },
        },
      },
      handler: async (args) => {
        try {
          if (args.docId) {
            const doc = await client.getDoc(args.docId as string);
            return { content: JSON.stringify(doc, null, 2) };
          }
          const docs = await client.getDocs(
            args.category ? { category: args.category as MemoryCategory } : undefined,
          );
          return { content: JSON.stringify(docs, null, 2) };
        } catch (err) {
          return { content: `Error reading docs: ${(err as Error).message}`, isError: true };
        }
      },
    },
    {
      name: 'lobster.docs.write',
      description: 'Write or update a shared document in collective memory.',
      inputSchema: {
        type: 'object',
        properties: {
          docId: { type: 'string', description: 'Document ID to update. Omit to create new.' },
          title: { type: 'string', description: 'Document title' },
          content: { type: 'string', description: 'Document content' },
          category: {
            type: 'string',
            enum: ['architecture', 'patterns', 'bugs', 'agreements', 'general'],
            description: 'Document category (for new docs)',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags for the document',
          },
        },
        required: ['title', 'content'],
      },
      handler: async (args) => {
        try {
          if (args.docId) {
            const doc = await client.updateDoc(args.docId as string, {
              title: args.title as string,
              content: args.content as string,
              tags: args.tags as string[] | undefined,
            });
            return { content: `Document updated: ${JSON.stringify(doc, null, 2)}` };
          }
          const doc = await client.createDoc({
            category: (args.category as MemoryCategory) ?? 'general',
            title: args.title as string,
            content: args.content as string,
            author: client.getConfig().displayName,
            tags: (args.tags as string[]) ?? [],
          });
          return { content: `Document created: ${JSON.stringify(doc, null, 2)}` };
        } catch (err) {
          return { content: `Error writing doc: ${(err as Error).message}`, isError: true };
        }
      },
    },
  ];
}
