import type { GatewayAuthConfig } from './adapter';
import type { GatewayErrorKind, GatewayEvent } from './types';

export interface GatewayRequestErrorLike extends Error {
  kind: GatewayErrorKind;
  status: number;
  body: string;
  requestId: string;
  contentType?: string;
}

export class GatewayRequestError extends Error implements GatewayRequestErrorLike {
  readonly kind: GatewayErrorKind;
  readonly status: number;
  readonly body: string;
  readonly requestId: string;
  readonly contentType?: string;

  constructor(params: {
    message: string;
    kind: GatewayErrorKind;
    requestId: string;
    status?: number;
    body?: string;
    contentType?: string;
  }) {
    super(params.message);
    this.name = 'GatewayRequestError';
    this.kind = params.kind;
    this.status = params.status ?? 0;
    this.body = params.body ?? '';
    this.requestId = params.requestId;
    this.contentType = params.contentType;
  }
}

export interface GatewayRetryPolicy {
  delaysMs: number[];
  jitterRatio?: number;
}

export interface FetchWithRetryOptions {
  url: string;
  init: RequestInit & { requestId: string };
  retryPolicy?: GatewayRetryPolicy;
  auth?: GatewayAuthConfig;
  defaultHeaders?: Record<string, string>;
  onEvent?: (event: GatewayEvent) => void;
}

export async function fetchWithRetry(options: FetchWithRetryOptions): Promise<Response> {
  const retryPolicy = options.retryPolicy ?? { delaysMs: [1000, 2000, 4000], jitterRatio: 0 };
  return fetchAttempt(options, retryPolicy, 0);
}

function mergeHeaders(
  defaults: Record<string, string>,
  initHeaders?: HeadersInit,
): Record<string, string> {
  const merged: Record<string, string> = { ...defaults };
  if (!initHeaders) return merged;
  if (initHeaders instanceof Headers) {
    initHeaders.forEach((value, key) => {
      merged[key] = value;
    });
    return merged;
  }
  if (Array.isArray(initHeaders)) {
    for (const [key, value] of initHeaders) {
      merged[key] = value;
    }
    return merged;
  }
  return { ...merged, ...(initHeaders as Record<string, string>) };
}

async function fetchAttempt(
  options: FetchWithRetryOptions,
  retryPolicy: GatewayRetryPolicy,
  attempt: number,
): Promise<Response> {
  const { url, init, onEvent } = options;
  const startedAt = performance.now();
  onEvent?.({
    type: 'request:start',
    requestId: init.requestId,
    endpoint: url,
    method: init.method ?? 'GET',
    attempt,
    maxAttempts: retryPolicy.delaysMs.length + 1,
  });

  try {
    const defaultHeaders = options.defaultHeaders ?? {};
    const mergedHeaders = mergeHeaders(defaultHeaders, init.headers);
    const auth = options.auth;
    if (auth?.token) {
      const header = auth.headerName ?? 'Authorization';
      mergedHeaders[header] = auth.scheme === 'raw' ? auth.token : `Bearer ${auth.token}`;
    }
    if (auth?.additionalHeaders) {
      for (const [key, value] of Object.entries(auth.additionalHeaders)) {
        mergedHeaders[key] = value;
      }
    }
    const response = await fetch(url, {
      ...init,
      credentials: 'include',
      headers: mergedHeaders,
    });
    const durationMs = Math.round(performance.now() - startedAt);

    if (!response.ok) {
      const body = await response.text();
      const kind = classifyByStatus(response.status);
      const contentType = response.headers.get('content-type') ?? undefined;
      if ((kind === 'rate-limit' || kind === 'server') && attempt < retryPolicy.delaysMs.length) {
        onEvent?.({
          type: 'request:retry',
          requestId: init.requestId,
          endpoint: url,
          method: init.method ?? 'GET',
          attempt,
          maxAttempts: retryPolicy.delaysMs.length + 1,
          durationMs,
          status: response.status,
          errorKind: kind,
        });
        await sleep(withJitter(retryPolicy.delaysMs[attempt], retryPolicy.jitterRatio ?? 0));
        return fetchAttempt(options, retryPolicy, attempt + 1);
      }

      onEvent?.({
        type: 'request:error',
        requestId: init.requestId,
        endpoint: url,
        method: init.method ?? 'GET',
        attempt,
        maxAttempts: retryPolicy.delaysMs.length + 1,
        durationMs,
        status: response.status,
        errorKind: kind,
      });

      throw new GatewayRequestError({
        message: extractGatewayErrorMessage(response.status, body, contentType),
        kind,
        requestId: init.requestId,
        status: response.status,
        body,
        contentType,
      });
    }

    onEvent?.({
      type: 'request:success',
      requestId: init.requestId,
      endpoint: url,
      method: init.method ?? 'GET',
      attempt,
      maxAttempts: retryPolicy.delaysMs.length + 1,
      durationMs,
      status: response.status,
    });

    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    if (error instanceof GatewayRequestError) throw error;
    const durationMs = Math.round(performance.now() - startedAt);
    if (attempt < retryPolicy.delaysMs.length) {
      onEvent?.({
        type: 'request:retry',
        requestId: init.requestId,
        endpoint: url,
        method: init.method ?? 'GET',
        attempt,
        maxAttempts: retryPolicy.delaysMs.length + 1,
        durationMs,
        errorKind: 'network',
      });
      await sleep(withJitter(retryPolicy.delaysMs[attempt], retryPolicy.jitterRatio ?? 0));
      return fetchAttempt(options, retryPolicy, attempt + 1);
    }
    onEvent?.({
      type: 'request:error',
      requestId: init.requestId,
      endpoint: url,
      method: init.method ?? 'GET',
      attempt,
      maxAttempts: retryPolicy.delaysMs.length + 1,
      durationMs,
      errorKind: 'network',
    });
    throw new GatewayRequestError({
      message: error instanceof Error ? error.message : 'Network error',
      kind: 'network',
      requestId: init.requestId,
    });
  }
}

export function classifyByStatus(status: number): GatewayErrorKind {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate-limit';
  if (status >= 500) return 'server';
  if (status >= 400) return 'client';
  return 'unknown';
}

export async function parseJsonResponse<T>(
  response: Response,
  requestId: string,
): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  const body = await response.text();
  if (!body.trim()) {
    throw new GatewayRequestError({
      message: 'Empty response body',
      kind: 'unknown',
      requestId,
      status: response.status,
      contentType,
    });
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new GatewayRequestError({
      message: `Invalid JSON response (status ${response.status}, content-type "${contentType || 'unknown'}")`,
      kind: 'unknown',
      requestId,
      status: response.status,
      body,
      contentType,
    });
  }
}

export function createRequestId(): string {
  return crypto.randomUUID();
}

function withJitter(ms: number, jitterRatio: number): number {
  if (jitterRatio <= 0) return ms;
  const factor = 1 + Math.random() * jitterRatio;
  return Math.round(ms * factor);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractGatewayErrorMessage(status: number, body: string, contentType?: string): string {
  const fallback = `Request failed with ${status}`;
  if (!body.trim()) return fallback;

  const looksJson = (contentType ?? '').toLowerCase().includes('application/json') || body.trim().startsWith('{');
  if (looksJson) {
    try {
      const payload = JSON.parse(body) as Record<string, unknown>;
      const topMessage = typeof payload.message === 'string' ? payload.message : null;
      const errorNode =
        payload.error && typeof payload.error === 'object' ? (payload.error as Record<string, unknown>) : null;
      const errorMessage = errorNode && typeof errorNode.message === 'string' ? errorNode.message : null;
      const detailNode = Array.isArray(payload.detail) ? payload.detail[0] : payload.detail;
      const detailMessage =
        detailNode && typeof detailNode === 'object' && 'msg' in detailNode && typeof detailNode.msg === 'string'
          ? detailNode.msg
          : typeof detailNode === 'string'
            ? detailNode
            : null;
      const message = errorMessage || topMessage || detailMessage;
      if (message) return message;
      return fallback;
    } catch {
      return fallback;
    }
  }

  if ((contentType ?? '').toLowerCase().includes('text/html')) {
    return `${fallback} (received HTML instead of API JSON)`;
  }

  return fallback;
}
