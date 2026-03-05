import type { GatewayAdapter, GatewayAdapterFactory, GatewayConfig } from './adapter';
import type {
  BootstrapResponse,
  ChatMessage,
  ClientMetadataResponse,
  GatewayModel,
  GatewayHealth,
  SendMessageResponse,
  SendMessageStreamChunk,
  SendTransportMode,
} from './types';
import { createRequestId, fetchWithRetry, GatewayRequestError, parseJsonResponse } from './runtime';

interface OpenAiGatewayAdapterConfig {
  clientId: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  system?: string;
  temperature?: number;
  apiKey?: string | null;
  organization?: string | null;
  defaultSessionId?: string | null;
  onEvent?: Parameters<typeof fetchWithRetry>[0]['onEvent'];
}

interface OpenAiChatCompletionChoice {
  message?: {
    role?: 'assistant' | 'user' | 'system';
    content?: string | null;
  };
}

interface OpenAiChatCompletionResponse {
  choices?: OpenAiChatCompletionChoice[];
}

const RETRY_DELAYS_MS = [1000, 2000, 4000];

export class OpenAiGatewayAdapter implements GatewayAdapter {
  private readonly clientId: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly system?: string;
  private readonly temperature?: number;
  private readonly apiKey?: string | null;
  private readonly organization?: string | null;
  private readonly defaultSessionId?: string | null;
  private readonly onEvent?: Parameters<typeof fetchWithRetry>[0]['onEvent'];

  constructor(config: OpenAiGatewayAdapterConfig) {
    this.clientId = config.clientId;
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.model = config.model;
    this.maxTokens = config.maxTokens;
    this.system = config.system;
    this.temperature = config.temperature;
    this.apiKey = config.apiKey;
    this.organization = config.organization;
    this.defaultSessionId = config.defaultSessionId;
    this.onEvent = config.onEvent;
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
      url: `${this.baseUrl}/chat/completions`,
      init: {
        method: 'POST',
        signal: params.signal,
        requestId,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.buildRequestPayload(params.messages, params.query, false, params.model)),
      },
    });
    const payload = await parseJsonResponse<OpenAiChatCompletionResponse>(response, requestId);
    const message = payload.choices?.[0]?.message?.content?.trim() || 'No response returned.';
    return {
      role: 'assistant',
      message,
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
    onStreamEvent?: (event: import('./types').GatewayStreamEvent) => void;
  }): Promise<SendMessageResponse> {
    const requestId = params.requestId ?? createRequestId();
    const response = await this.request({
      url: `${this.baseUrl}/chat/completions`,
      init: {
        method: 'POST',
        signal: params.signal,
        requestId,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream, application/json, text/plain, */*',
        },
        body: JSON.stringify(this.buildRequestPayload(params.messages, params.query, true, params.model)),
      },
    });

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    if (response.body && contentType.includes('text/event-stream')) {
      params.onMode?.('sse', contentType);
      params.onStreamEvent?.({ phase: 'start', mode: 'sse', contentType });
      return this.parseEventStream(response, requestId, params.onChunk, params.onStreamEvent, contentType);
    }

    params.onMode?.('json', contentType);
    params.onStreamEvent?.({ phase: 'start', mode: 'json', contentType });
    return this.sendMessage({ ...params, requestId });
  }

  async checkHealth(params?: { signal?: AbortSignal; requestId?: string }): Promise<GatewayHealth> {
    const requestId = params?.requestId ?? createRequestId();
    const startedAt = performance.now();
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
  }

  async getClientMetadata(): Promise<ClientMetadataResponse> {
    return {
      clientId: this.clientId,
      name: 'OpenAI Assistant',
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
    const payload = await parseJsonResponse<{ data?: Array<{ id?: string }> }>(response, requestId);
    const all = (payload.data ?? [])
      .filter((item) => typeof item.id === 'string' && item.id.length > 0)
      .map((item) => item.id as string);

    const chatCompatible = all.filter((id) => isLikelyChatCompletionsModel(id));
    const ids = chatCompatible.length ? chatCompatible : all;

    return ids.map((id) => ({
      id,
      label: id,
      default: id === this.model,
    }));
  }

  private buildRequestPayload(messages: ChatMessage[], query: string, stream: boolean, modelOverride?: string): Record<string, unknown> {
    const mappedMessages = this.mapMessages(messages, query);
    const payload: Record<string, unknown> = {
      model: modelOverride || this.model,
      messages: mappedMessages,
      stream,
    };
    // OpenAI modern chat models require `max_completion_tokens`.
    payload.max_completion_tokens = this.maxTokens;
    if (typeof this.temperature === 'number') payload.temperature = this.temperature;
    return payload;
  }

  private mapMessages(messages: ChatMessage[], query: string): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const mapped: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    if (this.system) {
      mapped.push({
        role: 'system',
        content: this.system,
      });
    }
    mapped.push(
      ...messages
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .filter((message) => message.message.trim().length > 0)
        .map((message) => ({
          role: message.role,
          content: message.message,
        })),
    );
    if (!mapped.length || mapped[mapped.length - 1]?.role !== 'user') {
      mapped.push({ role: 'user', content: query });
    }
    return mapped;
  }

  private async parseEventStream(
    response: Response,
    requestId: string,
    onChunk?: (chunk: SendMessageStreamChunk) => void,
    onStreamEvent?: (event: import('./types').GatewayStreamEvent) => void,
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

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');

        const parsed = this.parseSseEvent(rawEvent);
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

        const errorPayload = data.error as Record<string, unknown> | undefined;
        if (errorPayload) {
          const messageText =
            (typeof errorPayload.message === 'string' && errorPayload.message) ||
            (typeof data.message === 'string' && data.message) ||
            'OpenAI stream error';
          onStreamEvent?.({ phase: 'error', mode: 'sse', contentType, message: messageText });
          throw new GatewayRequestError({
            message: messageText,
            kind: 'server',
            requestId,
            status: response.status,
            body: parsed.data,
          });
        }

        const choices = Array.isArray(data.choices) ? (data.choices as Array<Record<string, unknown>>) : [];
        const first = choices[0];
        const deltaNode = first?.delta as Record<string, unknown> | undefined;
        const deltaFromChatCompletions = typeof deltaNode?.content === 'string' ? deltaNode.content : '';
        const deltaFromResponsesApi = typeof data.delta === 'string' ? data.delta : '';
        const deltaText = deltaFromChatCompletions || deltaFromResponsesApi;
        if (deltaText) {
          message += deltaText;
          onChunk?.({
            delta: deltaText,
            fullMessage: message,
            role: 'assistant',
            datetime,
            done: false,
          });
          onStreamEvent?.({ phase: 'delta', mode: 'sse', contentType, delta: deltaText, fullMessage: message });
        }

        const finishReason = typeof first?.finish_reason === 'string' ? first.finish_reason : null;
        if (finishReason && finishReason !== 'null') {
          complete = true;
        }
      }
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

  private parseSseEvent(raw: string): { event: string; data: string } | null {
    const lines = raw.split('\n');
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }
    if (!dataLines.length) return null;
    return { event, data: dataLines.join('\n') };
  }

  private request(options: { url: string; init: RequestInit & { requestId: string } }): Promise<Response> {
    return fetchWithRetry({
      url: options.url,
      init: options.init,
      retryPolicy: { delaysMs: RETRY_DELAYS_MS },
      auth: {
        token: this.apiKey,
        headerName: 'Authorization',
        scheme: 'bearer',
      },
      defaultHeaders: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
        ...(this.organization ? { 'OpenAI-Organization': this.organization } : {}),
      },
      onEvent: this.onEvent,
    });
  }
}

export const createOpenAiGatewayAdapter: GatewayAdapterFactory = ({ clientId, baseUrl, gatewayConfig, onEvent, auth }) => {
  const modelRaw = gatewayConfig?.model ?? 'gpt-4.1-mini';
  const maxTokensRaw = Number(gatewayConfig?.max_tokens ?? gatewayConfig?.maxTokens ?? 1024);
  const temperatureRaw = gatewayConfig?.temperature;
  const apiKeyRaw = gatewayConfig?.api_key ?? gatewayConfig?.apiKey ?? auth?.token ?? null;
  const organizationRaw = gatewayConfig?.organization ?? gatewayConfig?.openai_organization ?? gatewayConfig?.openaiOrganization ?? null;
  const defaultSessionId = gatewayConfig?.session_id ?? gatewayConfig?.sessionId ?? null;
  return new OpenAiGatewayAdapter({
    clientId,
    baseUrl,
    model: String(modelRaw),
    maxTokens: Number.isFinite(maxTokensRaw) && maxTokensRaw > 0 ? maxTokensRaw : 1024,
    system: typeof gatewayConfig?.system === 'string' ? gatewayConfig.system : undefined,
    temperature: typeof temperatureRaw === 'number' ? temperatureRaw : undefined,
    apiKey: apiKeyRaw ? String(apiKeyRaw) : null,
    organization: organizationRaw ? String(organizationRaw) : null,
    defaultSessionId: defaultSessionId ? String(defaultSessionId) : null,
    onEvent,
  });
};

export function validateOpenAiGatewayConfig(config: GatewayConfig): GatewayConfig {
  const model = config.model;
  if (model !== undefined && (typeof model !== 'string' || !model.trim())) {
    throw new Error('Invalid `gateway-config`: openai model must be a non-empty string.');
  }
  const maxTokens = config.max_tokens ?? config.maxTokens;
  if (maxTokens !== undefined) {
    const numeric = Number(maxTokens);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      throw new Error('Invalid `gateway-config`: openai max_tokens/maxTokens must be a positive number.');
    }
  }
  const temperature = config.temperature;
  if (temperature !== undefined) {
    const numeric = Number(temperature);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 2) {
      throw new Error('Invalid `gateway-config`: openai temperature must be between 0 and 2.');
    }
  }
  return config;
}

function isLikelyChatCompletionsModel(modelId: string): boolean {
  const value = modelId.trim().toLowerCase();
  if (!value) return false;
  // Keep picker focused on chat-completions-capable families.
  return value.startsWith('gpt-') || value.startsWith('chatgpt-');
}
