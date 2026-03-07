import type { GatewayAdapter, GatewayCapabilities } from './adapter';
import type {
  BootstrapResponse,
  ChatMessage,
  ClientMetadataResponse,
  GatewayModel,
  GatewayHealth,
  SendMessageResponse,
  SendMessageStreamChunk,
  GatewayStreamEvent,
  SendTransportMode,
} from './types';

export class LLMGatewayController {
  private readonly adapter: GatewayAdapter;
  private readonly capabilities: GatewayCapabilities;

  constructor(adapter: GatewayAdapter, capabilities: GatewayCapabilities) {
    this.adapter = adapter;
    this.capabilities = capabilities;
  }

  bootstrapSession(params?: { signal?: AbortSignal; requestId?: string }): Promise<BootstrapResponse> {
    return this.adapter.bootstrapSession(params);
  }

  sendMessage(params: {
    id: string;
    messages: ChatMessage[];
    query: string;
    model?: string;
    localTime?: string;
    signal?: AbortSignal;
    requestId?: string;
  }): Promise<SendMessageResponse> {
    return this.adapter.sendMessage(params);
  }

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
  }): Promise<SendMessageResponse> {
    return this.adapter.sendMessageStream(params);
  }

  checkHealth(params?: { signal?: AbortSignal; requestId?: string }): Promise<GatewayHealth> {
    return this.adapter.checkHealth(params);
  }

  getClientMetadata(params?: { signal?: AbortSignal; requestId?: string }): Promise<ClientMetadataResponse> {
    return this.adapter.getClientMetadata(params);
  }

  listModels(params?: { signal?: AbortSignal; requestId?: string }): Promise<GatewayModel[]> {
    if (!this.adapter.listModels) return Promise.resolve([]);
    return this.adapter.listModels(params);
  }

  getCapabilities(): GatewayCapabilities {
    return this.capabilities;
  }
}
