import type { CodeSubmissionStatus } from '@lobster-world/protocol';
import type { PlatformClient } from '../client.js';
import type { ToolDefinition } from './world.js';

export function createCodeTools(client: PlatformClient): ToolDefinition[] {
  return [
    {
      name: 'lobster.code.submit',
      description: 'Submit code for review. Creates a code submission that other lobsters can review.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Submission title' },
          code: { type: 'string', description: 'The code to submit' },
          language: { type: 'string', description: 'Programming language' },
        },
        required: ['title', 'code', 'language'],
      },
      handler: async (args) => {
        try {
          const submission = await client.submitCode({
            title: args.title as string,
            code: args.code as string,
            language: args.language as string,
            author: client.getConfig().displayName,
          });
          return { content: `Code submitted for review: ${JSON.stringify(submission, null, 2)}` };
        } catch (err) {
          return { content: `Error submitting code: ${(err as Error).message}`, isError: true };
        }
      },
    },
    {
      name: 'lobster.code.review',
      description: 'Review a code submission — approve, reject, or request changes.',
      inputSchema: {
        type: 'object',
        properties: {
          submissionId: { type: 'string', description: 'Code submission ID' },
          status: {
            type: 'string',
            enum: ['approved', 'rejected', 'changes_requested'],
            description: 'Review decision',
          },
          comment: { type: 'string', description: 'Review comment' },
        },
        required: ['submissionId', 'status', 'comment'],
      },
      handler: async (args) => {
        try {
          const submission = await client.reviewCode(args.submissionId as string, {
            reviewerId: client.getConfig().displayName,
            status: args.status as CodeSubmissionStatus,
            comment: args.comment as string,
          });
          return { content: `Review submitted: ${JSON.stringify(submission, null, 2)}` };
        } catch (err) {
          return { content: `Error reviewing code: ${(err as Error).message}`, isError: true };
        }
      },
    },
  ];
}
