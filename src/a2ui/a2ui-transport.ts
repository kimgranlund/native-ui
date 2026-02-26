/**
 * A2UI Transport
 *
 * WebSocket and SSE (Server-Sent Events) transport layers for the A2UI protocol.
 * Connects a remote A2UI server to the local A2UIAdapter, forwarding inbound
 * messages to receive() and outbound client messages back to the server.
 */

import type { A2UIAdapter } from './a2ui-adapter.ts';
import type { A2UIClientMessage, A2UIServerMessage } from './a2ui-types.ts';

// ── Transport State ──

export type TransportState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'closed';

export interface TransportEvents {
  readonly onStateChange?: (state: TransportState) => void;
  readonly onError?: (error: Error) => void;
  readonly onMessage?: (msg: A2UIServerMessage) => void;
}

// ── WebSocket Transport ──

export interface WebSocketTransportOptions extends TransportEvents {
  /** Render container for received surfaces. */
  readonly container?: HTMLElement;
  /** Auto-reconnect on disconnect (default: true). */
  readonly reconnect?: boolean;
  /** Max reconnect attempts (default: 5). */
  readonly maxReconnects?: number;
  /** Base reconnect delay in ms (default: 1000). Doubles each attempt. */
  readonly reconnectDelay?: number;
  /** Protocols to pass to WebSocket constructor. */
  readonly protocols?: string | string[];
}

export class WebSocketTransport {
  readonly #adapter: A2UIAdapter;
  readonly #url: string;
  readonly #options: WebSocketTransportOptions;
  #ws: WebSocket | null = null;
  #state: TransportState = 'disconnected';
  #reconnectCount = 0;
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(adapter: A2UIAdapter, url: string, options?: WebSocketTransportOptions) {
    this.#adapter = adapter;
    this.#url = url;
    this.#options = options ?? {};
  }

  get state(): TransportState { return this.#state; }

  /**
   * Open the WebSocket connection.
   * Messages are forwarded to adapter.receive() as they arrive.
   */
  connect(): void {
    if (this.#state === 'connected' || this.#state === 'connecting') return;
    this.#setState(this.#reconnectCount > 0 ? 'reconnecting' : 'connecting');

    const ws = new WebSocket(this.#url, this.#options.protocols);
    this.#ws = ws;

    ws.addEventListener('open', () => {
      this.#reconnectCount = 0;
      this.#setState('connected');
    });

    ws.addEventListener('message', (event) => {
      const data = typeof event.data === 'string' ? event.data : '';
      if (!data) return;

      try {
        const msg = this.#adapter.parse(data);
        if (msg) {
          this.#options.onMessage?.(msg);
          this.#adapter.receive(msg, this.#options.container);
        }
      } catch (e) {
        this.#options.onError?.(e instanceof Error ? e : new Error(String(e)));
      }
    });

    ws.addEventListener('close', () => {
      this.#ws = null;
      if (this.#state === 'closed') return; // intentional close
      this.#setState('disconnected');
      this.#maybeReconnect();
    });

    ws.addEventListener('error', () => {
      this.#options.onError?.(new Error(`WebSocket error on ${this.#url}`));
    });
  }

  /**
   * Send a client message (action, error) to the server.
   */
  send(msg: A2UIClientMessage): void {
    if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) {
      this.#options.onError?.(new Error('WebSocket not connected'));
      return;
    }
    this.#ws.send(JSON.stringify(msg));
  }

  /**
   * Close the connection. No reconnection will be attempted.
   */
  close(): void {
    this.#setState('closed');
    if (this.#reconnectTimer !== null) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
    this.#ws?.close();
    this.#ws = null;
  }

  #setState(state: TransportState): void {
    if (this.#state === state) return;
    this.#state = state;
    this.#options.onStateChange?.(state);
  }

  #maybeReconnect(): void {
    const shouldReconnect = this.#options.reconnect !== false;
    const maxReconnects = this.#options.maxReconnects ?? 5;

    if (!shouldReconnect || this.#reconnectCount >= maxReconnects) return;

    const baseDelay = this.#options.reconnectDelay ?? 1000;
    const delay = baseDelay * Math.pow(2, this.#reconnectCount);
    this.#reconnectCount++;

    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      if (this.#state !== 'closed') this.connect();
    }, delay);
  }
}

// ── SSE Transport ──

export interface SSETransportOptions extends TransportEvents {
  /** Render container for received surfaces. */
  readonly container?: HTMLElement;
  /** EventSource init options (e.g., withCredentials). */
  readonly eventSourceInit?: EventSourceInit;
  /** SSE event name to listen for (default: 'message'). */
  readonly eventName?: string;
  /**
   * URL to POST client messages to (actions, errors).
   * If not provided, send() will throw.
   */
  readonly postUrl?: string;
}

export class SSETransport {
  readonly #adapter: A2UIAdapter;
  readonly #url: string;
  readonly #options: SSETransportOptions;
  #source: EventSource | null = null;
  #state: TransportState = 'disconnected';

  constructor(adapter: A2UIAdapter, url: string, options?: SSETransportOptions) {
    this.#adapter = adapter;
    this.#url = url;
    this.#options = options ?? {};
  }

  get state(): TransportState { return this.#state; }

  /**
   * Open the SSE connection.
   * Messages are forwarded to adapter.receive() as they arrive.
   */
  connect(): void {
    if (this.#state === 'connected' || this.#state === 'connecting') return;
    this.#setState('connecting');

    const source = new EventSource(this.#url, this.#options.eventSourceInit);
    this.#source = source;

    const eventName = this.#options.eventName ?? 'message';

    source.addEventListener('open', () => {
      this.#setState('connected');
    });

    source.addEventListener(eventName, (event) => {
      const data = (event as MessageEvent).data;
      if (typeof data !== 'string' || !data) return;

      try {
        const msg = this.#adapter.parse(data);
        if (msg) {
          this.#options.onMessage?.(msg);
          this.#adapter.receive(msg, this.#options.container);
        }
      } catch (e) {
        this.#options.onError?.(e instanceof Error ? e : new Error(String(e)));
      }
    });

    source.addEventListener('error', () => {
      // EventSource auto-reconnects — just report the error
      if (source.readyState === EventSource.CLOSED) {
        this.#setState('disconnected');
      } else {
        this.#setState('reconnecting');
      }
      this.#options.onError?.(new Error(`SSE error on ${this.#url}`));
    });
  }

  /**
   * Send a client message to the server via POST.
   * Requires postUrl to be set in options.
   */
  async send(msg: A2UIClientMessage): Promise<void> {
    const postUrl = this.#options.postUrl;
    if (!postUrl) {
      throw new Error('SSE transport: postUrl not configured for outbound messages');
    }

    const response = await fetch(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    });

    if (!response.ok) {
      throw new Error(`SSE POST failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Close the SSE connection.
   */
  close(): void {
    this.#setState('closed');
    this.#source?.close();
    this.#source = null;
  }

  #setState(state: TransportState): void {
    if (this.#state === state) return;
    this.#state = state;
    this.#options.onStateChange?.(state);
  }
}

// ── Factory Functions ──

export function createWebSocketTransport(
  adapter: A2UIAdapter,
  url: string,
  options?: WebSocketTransportOptions,
): WebSocketTransport {
  return new WebSocketTransport(adapter, url, options);
}

export function createSSETransport(
  adapter: A2UIAdapter,
  url: string,
  options?: SSETransportOptions,
): SSETransport {
  return new SSETransport(adapter, url, options);
}
