import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerRoutes } from '../src/api/routes.js';
import { LobsterRegistry } from '../src/engine/registry.js';
import { SceneEngine } from '../src/engine/scene.js';
import { DialogueRouter } from '../src/engine/dialogue.js';
import { ConnectionManager } from '../src/ws/connection-manager.js';
import { KeyStore } from '../src/engine/key-store.js';

describe('Crypto key routes', () => {
  let app: FastifyInstance;
  let keyStore: KeyStore;

  beforeAll(async () => {
    keyStore = new KeyStore();
    app = Fastify({ logger: false });
    registerRoutes(app, {
      registry: new LobsterRegistry(),
      scene: new SceneEngine(),
      dialogue: new DialogueRouter(),
      connections: new ConnectionManager(),
      keyStore,
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/crypto/keys', () => {
    it('stores a public key and returns 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/crypto/keys',
        payload: { lobsterId: 'lobster-a', x25519PublicKey: 'base64-key-abc' },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.lobsterId).toBe('lobster-a');
      expect(body.x25519PublicKey).toBe('base64-key-abc');
      expect(body.updatedAt).toBeGreaterThan(0);
    });

    it('returns 400 when lobsterId is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/crypto/keys',
        payload: { x25519PublicKey: 'key' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when x25519PublicKey is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/crypto/keys',
        payload: { lobsterId: 'lobster-a' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/crypto/keys/:lobsterId', () => {
    it('retrieves a stored key', async () => {
      keyStore.store('lobster-b', 'key-b');
      const res = await app.inject({
        method: 'GET',
        url: '/api/crypto/keys/lobster-b',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.lobsterId).toBe('lobster-b');
      expect(body.x25519PublicKey).toBe('key-b');
    });

    it('returns 404 for unknown lobster', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/crypto/keys/unknown',
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/crypto/keys', () => {
    it('returns all stored keys', async () => {
      const freshStore = new KeyStore();
      freshStore.store('x', 'key-x');
      freshStore.store('y', 'key-y');

      const freshApp = Fastify({ logger: false });
      registerRoutes(freshApp, {
        registry: new LobsterRegistry(),
        scene: new SceneEngine(),
        dialogue: new DialogueRouter(),
        connections: new ConnectionManager(),
        keyStore: freshStore,
      });
      await freshApp.ready();

      const res = await freshApp.inject({
        method: 'GET',
        url: '/api/crypto/keys',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(2);

      await freshApp.close();
    });
  });
});
