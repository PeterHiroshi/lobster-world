import Fastify from 'fastify';
import { SERVER_PORT, SERVER_HOST } from './config.js';

const server = Fastify({ logger: true });

server.get('/api/health', async () => {
  return { status: 'ok', timestamp: Date.now() };
});

async function start(): Promise<void> {
  try {
    await server.listen({ port: SERVER_PORT, host: SERVER_HOST });
    server.log.info(`Server listening on ${SERVER_HOST}:${SERVER_PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();

export { server };
