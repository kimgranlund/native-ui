// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketTransport, SSETransport, createWebSocketTransport, createSSETransport } from '../protocol/a2ui-transport.ts';
import { A2UIAdapter, createA2UIAdapter } from '../protocol/a2ui-adapter.ts';
import { Kernel, resetKernel } from '../../../../src/kernel/kernel.ts';
import type { TransportState } from '../protocol/a2ui-transport.ts';

describe('A2UI Transport', () => {
  let kernel: Kernel;
  let adapter: A2UIAdapter;

  beforeEach(() => {
    resetKernel();
    kernel = new Kernel({ allowUnregistered: true });
    adapter = createA2UIAdapter(kernel);
  });

  afterEach(() => {
    adapter.destroy();
    resetKernel();
  });

  // ── WebSocketTransport ──

  describe('WebSocketTransport', () => {
    it('creates with correct initial state', () => {
      const transport = new WebSocketTransport(adapter, 'ws://localhost:8080');
      expect(transport.state).toBe('disconnected');
    });

    it('factory function creates instance', () => {
      const transport = createWebSocketTransport(adapter, 'ws://localhost:8080');
      expect(transport).toBeInstanceOf(WebSocketTransport);
      expect(transport.state).toBe('disconnected');
    });

    it('accepts options', () => {
      const states: TransportState[] = [];
      const transport = new WebSocketTransport(adapter, 'ws://localhost:8080', {
        reconnect: false,
        maxReconnects: 3,
        reconnectDelay: 500,
        protocols: 'a2ui',
        onStateChange: (s) => states.push(s),
      });
      expect(transport.state).toBe('disconnected');
    });

    it('send reports error when not connected', () => {
      const errors: Error[] = [];
      const transport = new WebSocketTransport(adapter, 'ws://localhost:8080', {
        onError: (e) => errors.push(e),
      });

      transport.send({ action: { surfaceId: 's', sourceComponentId: 'c', name: 'test', timestamp: '' } });
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('not connected');
    });

    it('close sets state to closed', () => {
      const states: TransportState[] = [];
      const transport = new WebSocketTransport(adapter, 'ws://localhost:8080', {
        onStateChange: (s) => states.push(s),
      });

      transport.close();
      expect(transport.state).toBe('closed');
      expect(states).toContain('closed');
    });

    it('close is idempotent', () => {
      const transport = new WebSocketTransport(adapter, 'ws://localhost:8080');
      transport.close();
      transport.close(); // should not throw
      expect(transport.state).toBe('closed');
    });
  });

  // ── SSETransport ──

  describe('SSETransport', () => {
    it('creates with correct initial state', () => {
      const transport = new SSETransport(adapter, 'http://localhost:8080/events');
      expect(transport.state).toBe('disconnected');
    });

    it('factory function creates instance', () => {
      const transport = createSSETransport(adapter, 'http://localhost:8080/events');
      expect(transport).toBeInstanceOf(SSETransport);
      expect(transport.state).toBe('disconnected');
    });

    it('send throws without postUrl', async () => {
      const transport = new SSETransport(adapter, 'http://localhost:8080/events');

      await expect(
        transport.send({ action: { surfaceId: 's', sourceComponentId: 'c', name: 'test', timestamp: '' } }),
      ).rejects.toThrow('postUrl not configured');
    });

    it('close sets state to closed', () => {
      const states: TransportState[] = [];
      const transport = new SSETransport(adapter, 'http://localhost:8080/events', {
        onStateChange: (s) => states.push(s),
      });

      transport.close();
      expect(transport.state).toBe('closed');
      expect(states).toContain('closed');
    });

    it('accepts options', () => {
      const transport = new SSETransport(adapter, 'http://localhost:8080/events', {
        postUrl: 'http://localhost:8080/actions',
        eventName: 'a2ui',
        eventSourceInit: { withCredentials: true },
      });
      expect(transport.state).toBe('disconnected');
    });
  });
});
