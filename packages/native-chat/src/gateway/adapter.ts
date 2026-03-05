import type {
  BootstrapResponse,
  ChatMessage,
  ClientMetadataResponse,
  GatewayModel,
  GatewayEvent,
  GatewayHealth,
  SendMessageResponse,
  SendMessageStreamChunk,
  GatewayStreamEvent,
  SendTransportMode,
} from './types';

export interface GatewayAdapter {
  bootstrapSession(params?: { signal?: AbortSignal; requestId?: string }): Promise<BootstrapResponse>;
  sendMessage(params: {
    id: string;
    messages: ChatMessage[];
    query: string;
    model?: string;
    localTime?: string;
    signal?: AbortSignal;
    requestId?: string;
  }): Promise<SendMessageResponse>;
  sendMessageStream(params: {
    id: string;
    messages: ChatMessage[];
    query: string;
    model?: string;
    localTime?: string;
    signal?: AbortSignal;
    requestId?: string;
    onChunk?: (chunk: SendMessageStreamChunk) => void;
    onMode?: (mode: SendTransportMode, contentType: string) => void;
    onStreamEvent?: (event: GatewayStreamEvent) => void;
  }): Promise<SendMessageResponse>;
  checkHealth(params?: { signal?: AbortSignal; requestId?: string }): Promise<GatewayHealth>;
  getClientMetadata(params?: { signal?: AbortSignal; requestId?: string }): Promise<ClientMetadataResponse>;
  listModels?(params?: { signal?: AbortSignal; requestId?: string }): Promise<GatewayModel[]>;
}

export interface GatewayCapabilities {
  sessionStrategy: 'provider' | 'local' | 'hybrid';
  supportsHistory: boolean;
  supportsStreaming: boolean;
  supportsStructuredActions: boolean;
  supportsSystemPrompt: boolean;
  supportsTools: boolean;
  supportsModelPicker: boolean;
}

export type GatewayConfig = Record<string, unknown>;

export interface GatewayAuthConfig {
  token?: string | null;
  headerName?: string;
  scheme?: 'bearer' | 'raw';
  additionalHeaders?: Record<string, string>;
}

export interface GatewayAdapterFactoryContext {
  clientId: string;
  baseUrl: string;
  gatewayConfig?: GatewayConfig;
  auth?: GatewayAuthConfig;
  onEvent?: (event: GatewayEvent) => void;
}

export type GatewayAdapterFactory = (context: GatewayAdapterFactoryContext) => GatewayAdapter;

export type GatewayConfigValidator = (config: GatewayConfig) => GatewayConfig;

export interface GatewayRegistration {
  factory: GatewayAdapterFactory;
  capabilities: GatewayCapabilities;
  validateConfig?: GatewayConfigValidator;
}
