import { EventEmitter } from 'node:events';
import { SocialProxyClient, type ClientConfig } from './client.js';
import { createAgentTools } from './tools.js';
import { EventMapper } from './events.js';
import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  BIO_MAX_LENGTH,
  DEFAULT_PLUGIN_CONFIG,
} from './constants.js';

export interface PluginConfig {
  serverUrl: string;
  displayName: string;
  bio?: string;
  color?: string;
  skills?: Array<'coding' | 'design' | 'devops' | 'testing' | 'writing' | 'research'>;
  permissionPreset?: 'open' | 'selective' | 'private';
  dailyTokenLimit?: number;
  sessionTokenLimit?: number;
  autoConnect?: boolean;
}

interface ResolvedConfig extends Required<PluginConfig> {
  bio: string;
  color: string;
  skills: Array<'coding' | 'design' | 'devops' | 'testing' | 'writing' | 'research'>;
  permissionPreset: 'open' | 'selective' | 'private';
}

interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
}

type WsFactory = (url: string) => EventEmitter & { readyState: number; send(data: string): void; close(): void };

const PLUGIN_META: PluginMetadata = {
  id: 'lobster-world',
  name: 'Lobster World Social Proxy',
  description: 'Connect your OpenClaw agent to the Lobster World virtual office',
  version: '0.1.0',
};

export class LobsterWorldPlugin extends EventEmitter {
  private readonly resolvedConfig: ResolvedConfig;
  private readonly wsFactory: WsFactory;
  private client: SocialProxyClient | null = null;
  private eventMapper: EventMapper | null = null;

  constructor(config: PluginConfig, wsFactory: WsFactory) {
    super();
    this.resolvedConfig = this.validateAndResolve(config);
    this.wsFactory = wsFactory;
  }

  activate(): void {
    const clientConfig: ClientConfig = {
      serverUrl: this.resolvedConfig.serverUrl,
      displayName: this.resolvedConfig.displayName,
      bio: this.resolvedConfig.bio,
      color: this.resolvedConfig.color,
      skills: this.resolvedConfig.skills,
      permissionPreset: this.resolvedConfig.permissionPreset,
      dailyTokenLimit: this.resolvedConfig.dailyTokenLimit,
      sessionTokenLimit: this.resolvedConfig.sessionTokenLimit,
    };

    this.client = new SocialProxyClient(clientConfig, this.wsFactory);
    this.eventMapper = new EventMapper();

    // Forward client events
    this.client.on('joined', () => this.emit('joined'));
    this.client.on('error', (err: Error) => this.emit('error', err));
    this.client.on('state_change', (state: string) => this.emit('state_change', state));
    this.client.on('dialogue_invitation', (inv: unknown) => this.emit('dialogue_invitation', inv));
    this.client.on('dialogue_message', (msg: unknown) => this.emit('dialogue_message', msg));
    this.client.on('dialogue_ended', (info: unknown) => this.emit('dialogue_ended', info));
    this.client.on('budget_warning', (warn: unknown) => this.emit('budget_warning', warn));

    // Wire event mapper to client state updates
    this.eventMapper.onStateUpdate((behavior) => {
      this.client?.sendStateUpdate({ ...behavior });
    });

    if (this.resolvedConfig.autoConnect) {
      this.client.connect();
    }
  }

  deactivate(): void {
    this.client?.disconnect();
    this.eventMapper?.dispose();
  }

  getClient(): SocialProxyClient | null {
    return this.client;
  }

  getTools() {
    if (!this.client) {
      return [];
    }
    return createAgentTools(this.client);
  }

  getConfig(): ResolvedConfig {
    return { ...this.resolvedConfig };
  }

  getMetadata(): PluginMetadata {
    return { ...PLUGIN_META };
  }

  getEventMapper(): EventMapper | null {
    return this.eventMapper;
  }

  private validateAndResolve(config: PluginConfig): ResolvedConfig {
    if (!config.serverUrl) {
      throw new Error('Invalid config: serverUrl is required');
    }
    if (!config.displayName || config.displayName.length < DISPLAY_NAME_MIN_LENGTH) {
      throw new Error('Invalid config: displayName is required');
    }
    if (config.displayName.length > DISPLAY_NAME_MAX_LENGTH) {
      throw new Error(`Invalid config: displayName must be at most ${DISPLAY_NAME_MAX_LENGTH} characters`);
    }
    if (config.bio && config.bio.length > BIO_MAX_LENGTH) {
      throw new Error(`Invalid config: bio must be at most ${BIO_MAX_LENGTH} characters`);
    }

    return {
      serverUrl: config.serverUrl,
      displayName: config.displayName,
      bio: config.bio ?? DEFAULT_PLUGIN_CONFIG.bio,
      color: config.color ?? DEFAULT_PLUGIN_CONFIG.color,
      skills: config.skills ?? (DEFAULT_PLUGIN_CONFIG.skills as ResolvedConfig['skills']),
      permissionPreset: config.permissionPreset ?? DEFAULT_PLUGIN_CONFIG.permissionPreset,
      dailyTokenLimit: config.dailyTokenLimit ?? DEFAULT_PLUGIN_CONFIG.dailyTokenLimit,
      sessionTokenLimit: config.sessionTokenLimit ?? DEFAULT_PLUGIN_CONFIG.sessionTokenLimit,
      autoConnect: config.autoConnect ?? DEFAULT_PLUGIN_CONFIG.autoConnect,
    };
  }
}
