// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContextRequestEvent, ContextProvider, ContextConsumer } from '../context.ts';

// Minimal base class to apply mixins to
class Base extends HTMLElement {
  connectedCallback() {}
  disconnectedCallback() {}
}

class Provider extends ContextProvider(Base) {}
class Consumer extends ContextConsumer(Base) {}

customElements.define('test-ctx-provider', Provider);
customElements.define('test-ctx-consumer', Consumer);

describe('ContextRequestEvent', () => {
  it('creates event with context and callback', () => {
    const cb = () => {};
    const event = new ContextRequestEvent('theme', cb);
    expect(event.context).toBe('theme');
    expect(event.callback).toBe(cb);
    expect(event.type).toBe('context-request');
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
  });
});

describe('ContextProvider', () => {
  let provider: Provider;

  beforeEach(() => {
    provider = document.createElement('test-ctx-provider') as Provider;
    document.body.appendChild(provider);
  });

  afterEach(() => {
    provider.remove();
  });

  it('provides context values to request events', () => {
    provider.provideContext('theme', 'dark');

    let received: unknown;
    const event = new ContextRequestEvent('theme', (v) => { received = v; });
    provider.dispatchEvent(event);

    expect(received).toBe('dark');
  });

  it('stops propagation when context is found', () => {
    provider.provideContext('locale', 'en');

    const event = new ContextRequestEvent('locale', () => {});
    let propagated = false;
    document.body.addEventListener('context-request', () => { propagated = true; }, { once: true });
    provider.dispatchEvent(event);

    expect(propagated).toBe(false);
  });

  it('does not handle unknown context keys', () => {
    let received: unknown = 'unchanged';
    const event = new ContextRequestEvent('unknown', (v) => { received = v; });
    provider.dispatchEvent(event);

    expect(received).toBe('unchanged');
  });

  it('removes listener on disconnect', () => {
    provider.provideContext('theme', 'dark');
    provider.remove();

    // Re-append to trigger connectedCallback again
    document.body.appendChild(provider);
    let received: unknown;
    const event = new ContextRequestEvent('theme', (v) => { received = v; });
    provider.dispatchEvent(event);
    expect(received).toBe('dark');
  });
});

describe('ContextConsumer', () => {
  let provider: Provider;
  let consumer: Consumer;

  beforeEach(() => {
    provider = document.createElement('test-ctx-provider') as Provider;
    consumer = document.createElement('test-ctx-consumer') as Consumer;
    document.body.appendChild(provider);
    provider.appendChild(consumer);
  });

  afterEach(() => {
    provider.remove();
  });

  it('requests and receives context from ancestor provider', () => {
    provider.provideContext('theme', 'light');

    let received: unknown;
    consumer.requestContext('theme', (v) => { received = v; });
    expect(received).toBe('light');
  });

  it('stores resolved context for getContext()', () => {
    provider.provideContext('lang', 'en');
    consumer.requestContext('lang');
    expect(consumer.getContext('lang')).toBe('en');
  });

  it('returns null for unresolved context', () => {
    expect(consumer.getContext('nonexistent')).toBeNull();
  });
});
