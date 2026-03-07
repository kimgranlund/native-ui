import type { GatewayAdapter, GatewayAdapterFactory, GatewayConfig } from './adapter';
import type {
  BootstrapResponse,
  ChatMessage,
  ClientMetadataResponse,
  GatewayModel,
  GatewayHealth,
  GatewayStreamEvent,
  SendMessageResponse,
  SendMessageStreamChunk,
  SendTransportMode,
} from './types';
import { createRequestId, DEFAULT_RETRY_DELAYS_MS, fetchWithRetry, GatewayRequestError, parseSseEvent, parseJsonResponse } from './runtime';

interface ClaudeMessageContentBlock {
  type: string;
  text?: string;
}

interface ClaudeMessageResponse {
  content?: ClaudeMessageContentBlock[];
}

interface ClaudeGatewayAdapterConfig {
  clientId: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  system?: string;
  temperature?: number;
  apiKey?: string | null;
  anthropicVersion: string;
  defaultSessionId?: string | null;
  onEvent?: Parameters<typeof fetchWithRetry>[0]['onEvent'];
}

export class ClaudeGatewayAdapter implements GatewayAdapter {
  private readonly clientId: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly system?: string;
  private readonly temperature?: number;
  private readonly apiKey?: string | null;
  private readonly anthropicVersion: string;
  private readonly defaultSessionId?: string | null;
  private readonly onEvent?: Parameters<typeof fetchWithRetry>[0]['onEvent'];

  constructor(config: ClaudeGatewayAdapterConfig) {
    this.clientId = config.clientId;
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.model = config.model;
    this.maxTokens = config.maxTokens;
    this.system = config.system;
    this.temperature = config.temperature;
    this.apiKey = config.apiKey;
    this.anthropicVersion = config.anthropicVersion;
    this.defaultSessionId = config.defaultSessionId;
    this.onEvent = config.onEvent;
    if (config.apiKey && typeof window !== 'undefined') {
      console.warn(
        '[native-chat] ClaudeGatewayAdapter: API key is exposed in the browser. ' +
        'This is for development only. In production, proxy requests through a backend gateway.',
      );
    }
  }

  async bootstrapSession(): Promise<BootstrapResponse> {
    return {
      id: this.defaultSessionId ?? createRequestId(),
      messages: [],
    };
  }

  async sendMessage(params: {
    id: string;
    messages: ChatMessage[];
    query: string;
    model?: string;
    localTime?: string;
    signal?: AbortSignal;
    requestId?: string;
  }): Promise<SendMessageResponse> {
    const requestId = params.requestId ?? createRequestId();
    const response = await this.request({
      url: `${this.baseUrl}/messages`,
      init: {
        method: 'POST',
        signal: params.signal,
        requestId,
        body: JSON.stringify(this.buildRequestPayload(params.messages, params.query, false, params.model)),
      },
    });
    const payload = await parseJsonResponse<ClaudeMessageResponse>(response, requestId);
    return {
      role: 'assistant',
      message: this.extractTextFromMessage(payload),
      datetime: Date.now(),
      partial: false,
    };
  }

  async sendMessageStream(params: {
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
    const requestId = params.requestId ?? createRequestId();
    const response = await this.request({
      url: `${this.baseUrl}/messages`,
      init: {
        method: 'POST',
        signal: params.signal,
        requestId,
        headers: {
          Accept: 'text/event-stream, application/json, text/plain, */*',
        },
        body: JSON.stringify(this.buildRequestPayload(params.messages, params.query, true, params.model)),
      },
      noRetry: true,
    });

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    if (response.body && contentType.includes('text/event-stream')) {
      params.onMode?.('sse', contentType);
      params.onStreamEvent?.({ phase: 'start', mode: 'sse', contentType });
      return this.parseEventStream(response, requestId, params.onChunk, params.onStreamEvent, contentType);
    }

    params.onMode?.('json', contentType);
    params.onStreamEvent?.({ phase: 'start', mode: 'json', contentType });
    const payload = await parseJsonResponse<ClaudeMessageResponse>(response, requestId);
    const result: SendMessageResponse = {
      role: 'assistant',
      message: this.extractTextFromMessage(payload),
      datetime: Date.now(),
      partial: false,
    };
    params.onChunk?.({ delta: result.message, fullMessage: result.message, role: 'assistant', datetime: result.datetime ?? Date.now(), done: true });
    params.onStreamEvent?.({ phase: 'complete', mode: 'json', contentType, fullMessage: result.message });
    return result;
  }

  async checkHealth(params?: { signal?: AbortSignal; requestId?: string }): Promise<GatewayHealth> {
    const requestId = params?.requestId ?? createRequestId();
    const startedAt = performance.now();
    try {
      const response = await this.request({
        url: `${this.baseUrl}/models`,
        init: {
          method: 'GET',
          signal: params?.signal,
          requestId,
        },
      });
      return {
        healthy: response.ok,
        requestId,
        status: response.status,
        durationMs: Math.round(performance.now() - startedAt),
      };
    } catch (err) {
      return {
        healthy: false,
        requestId,
        status: err instanceof GatewayRequestError ? err.status : 0,
        durationMs: Math.round(performance.now() - startedAt),
      };
    }
  }

  async getClientMetadata(): Promise<ClientMetadataResponse> {
    return {
      clientId: this.clientId,
      name: 'Claude Assistant',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  async listModels(params?: { signal?: AbortSignal; requestId?: string }): Promise<GatewayModel[]> {
    const requestId = params?.requestId ?? createRequestId();
    const response = await this.request({
      url: `${this.baseUrl}/models`,
      init: {
        method: 'GET',
        signal: params?.signal,
        requestId,
      },
    });
    const payload = await parseJsonResponse<{ data?: Array<{ id?: string; display_name?: string }> }>(response, requestId);
    return (payload.data ?? [])
      .filter((item) => typeof item.id === 'string' && item.id.length > 0)
      .map((item) => ({
        id: item.id as string,
        label: item.display_name || (item.id as string),
        default: (item.id as string) === this.model,
      }));
  }

  private buildRequestPayload(messages: ChatMessage[], query: string, stream: boolean, modelOverride?: string): Record<string, unknown> {
    const mappedMessages = this.mapMessages(messages, query);
    const payload: Record<string, unknown> = {
      model: modelOverride || this.model,
      max_tokens: this.maxTokens,
      messages: mappedMessages,
      stream,
    };
    if (this.system) payload.system = this.system;
    if (typeof this.temperature === 'number') payload.temperature = this.temperature;
    return payload;
  }

  private mapMessages(messages: ChatMessage[], _query: string): Array<{ role: 'user' | 'assistant'; content: string }> {
    return messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .filter((message) => message.message.trim().length > 0)
      .map((message) => ({
        role: message.role,
        content: message.message,
      }));
  }

  private extractTextFromMessage(payload: ClaudeMessageResponse): string {
    const text = (payload.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('');
    return text || 'No response returned.';
  }

  private async parseEventStream(
    response: Response,
    requestId: string,
    onChunk?: (chunk: SendMessageStreamChunk) => void,
    onStreamEvent?: (event: GatewayStreamEvent) => void,
    contentType?: string,
  ): Promise<SendMessageResponse> {
    if (!response.body) {
      throw new GatewayRequestError({
        message: 'Missing stream body',
        kind: 'unknown',
        requestId,
        status: response.status,
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let message = '';
    const datetime = Date.now();
    let complete = false;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const rawEvent = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');

          const parsed = parseSseEvent(rawEvent);
          if (!parsed) continue;
          if (parsed.data === '[DONE]') {
            complete = true;
            continue;
          }

          let data: Record<string, unknown> = {};
          try {
            data = JSON.parse(parsed.data) as Record<string, unknown>;
          } catch {
            continue;
          }

          if (parsed.event === 'error' || data.type === 'error') {
            const errorPayload = data.error as Record<string, unknown> | undefined;
            const messageText =
              (typeof errorPayload?.message === 'string' && errorPayload.message) ||
              (typeof data.message === 'string' && data.message) ||
              'Claude stream error';
            onStreamEvent?.({ phase: 'error', mode: 'sse', contentType, message: messageText });
            throw new GatewayRequestError({
              message: messageText,
              kind: 'server',
              requestId,
              status: response.status,
              body: parsed.data,
            });
          }

          if (parsed.event === 'message_stop' || data.type === 'message_stop') {
            complete = true;
            continue;
          }

          const isContentDelta = parsed.event === 'content_block_delta' || data.type === 'content_block_delta';
          if (!isContentDelta) continue;
          const delta = data.delta as Record<string, unknown> | undefined;
          if (!delta || delta.type !== 'text_delta' || typeof delta.text !== 'string') continue;
          message += delta.text;
          onChunk?.({
            delta: delta.text,
            fullMessage: message,
            role: 'assistant',
            datetime,
            done: false,
          });
          onStreamEvent?.({ phase: 'delta', mode: 'sse', contentType, delta: delta.text, fullMessage: message });
        }
      }
      // Flush decoder
      buffer += decoder.decode();
    } finally {
      reader.releaseLock();
    }

    if (!message.trim()) {
      throw new GatewayRequestError({
        message: 'Empty stream response body',
        kind: 'unknown',
        requestId,
        status: response.status,
      });
    }

    onChunk?.({
      delta: '',
      fullMessage: message,
      role: 'assistant',
      datetime,
      done: true,
      partial: !complete,
    });
    onStreamEvent?.({ phase: 'complete', mode: 'sse', contentType, fullMessage: message });

    return {
      role: 'assistant',
      message,
      datetime,
      partial: !complete,
    };
  }

  private request(options: { url: string; init: RequestInit & { requestId: string }; noRetry?: boolean }): Promise<Response> {
    return fetchWithRetry({
      url: options.url,
      init: options.init,
      noRetry: options.noRetry,
      retryPolicy: { delaysMs: DEFAULT_RETRY_DELAYS_MS },
      auth: {
        token: this.apiKey,
        headerName: 'x-api-key',
        scheme: 'raw',
      },
      defaultHeaders: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
        'anthropic-version': this.anthropicVersion,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      onEvent: this.onEvent,
    });
  }
}

export const createClaudeGatewayAdapter: GatewayAdapterFactory = ({ clientId, baseUrl, gatewayConfig, onEvent, auth }) => {
  const modelRaw = gatewayConfig?.model ?? 'claude-sonnet-4-6';
  const maxTokensRaw = Number(gatewayConfig?.max_tokens ?? gatewayConfig?.maxTokens ?? 1024);
  const temperatureRaw = gatewayConfig?.temperature;
  const versionRaw = gatewayConfig?.anthropic_version ?? gatewayConfig?.anthropicVersion ?? '2023-06-01';
  const apiKeyRaw = gatewayConfig?.api_key ?? gatewayConfig?.apiKey ?? auth?.token ?? null;
  const defaultSessionId = gatewayConfig?.session_id ?? gatewayConfig?.sessionId ?? null;
  return new ClaudeGatewayAdapter({
    clientId,
    baseUrl,
    model: String(modelRaw),
    maxTokens: Number.isFinite(maxTokensRaw) && maxTokensRaw > 0 ? maxTokensRaw : 1024,
    system: typeof gatewayConfig?.system === 'string' ? gatewayConfig.system : undefined,
    temperature: typeof temperatureRaw === 'number' ? temperatureRaw : undefined,
    apiKey: apiKeyRaw ? String(apiKeyRaw) : null,
    anthropicVersion: String(versionRaw),
    defaultSessionId: defaultSessionId ? String(defaultSessionId) : null,
    onEvent,
  });
};

export function validateClaudeGatewayConfig(config: GatewayConfig): GatewayConfig {
  const model = config.model;
  if (model !== undefined && (typeof model !== 'string' || !model.trim())) {
    throw new Error('Invalid `gateway-config`: claude model must be a non-empty string.');
  }
  const maxTokens = config.max_tokens ?? config.maxTokens;
  if (maxTokens !== undefined) {
    const numeric = Number(maxTokens);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      throw new Error('Invalid `gateway-config`: claude max_tokens/maxTokens must be a positive number.');
    }
  }
  const temperature = config.temperature;
  if (temperature !== undefined) {
    const numeric = Number(temperature);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1) {
      throw new Error('Invalid `gateway-config`: claude temperature must be between 0 and 1.');
    }
  }
  return config;
}
