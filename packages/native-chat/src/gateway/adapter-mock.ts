import type { GatewayAdapter, GatewayAdapterFactoryContext } from './adapter';
import type {
  BootstrapResponse,
  ChatMessage,
  ClientMetadataResponse,
  GatewayHealth,
  GatewayModel,
  SendMessageResponse,
  SendMessageStreamChunk,
  GatewayStreamEvent,
  SendTransportMode,
} from './types';

const MOCK_RESPONSES = [
  `That's a great question! Here's what I think:

**Web components** are built on three main browser APIs:

1. **Custom Elements** — define your own HTML tags
2. **Shadow DOM** — encapsulated styling and markup
3. **HTML Templates** — reusable content fragments

They work natively in all modern browsers.`,

  `Sure, I can help with that! Let me break it down:

- First, you'll want to understand the **component lifecycle**
- Then look at how **attributes** map to **properties**
- Finally, consider your **event strategy**

\`\`\`js
class MyElement extends HTMLElement {
  connectedCallback() {
    console.log('Connected!');
  }
}
\`\`\``,

  `Here are some key points to consider:

> The best code is the code you don't have to write.

1. Keep components **small and focused**
2. Use **composition** over inheritance
3. Leverage **CSS custom properties** for theming
4. Always consider **accessibility**

Let me know if you'd like more detail on any of these!`,
];

const STREAM_DELAY_MS = 25;

class MockGatewayAdapter implements GatewayAdapter {
  #callCount = 0;

  bootstrapSession(): Promise<BootstrapResponse> {
    return Promise.resolve({ id: 'mock-session' });
  }

  sendMessage(_params: {
    id: string;
    messages: ChatMessage[];
    query: string;
  }): Promise<SendMessageResponse> {
    const message = MOCK_RESPONSES[this.#callCount++ % MOCK_RESPONSES.length];
    return Promise.resolve({ role: 'assistant', message, datetime: Date.now() });
  }

  async sendMessageStream(params: {
    id: string;
    messages: ChatMessage[];
    query: string;
    model?: string;
    signal?: AbortSignal;
    onChunk?: (chunk: SendMessageStreamChunk) => void;
    onMode?: (mode: SendTransportMode, contentType: string) => void;
    onStreamEvent?: (event: GatewayStreamEvent) => void;
  }): Promise<SendMessageResponse> {
    const fullMessage = MOCK_RESPONSES[this.#callCount++ % MOCK_RESPONSES.length];
    const words = fullMessage.split(/(\s+)/);

    params.onMode?.('sse', 'text/event-stream');
    params.onStreamEvent?.({ phase: 'start', mode: 'sse' });

    let accumulated = '';
    for (let i = 0; i < words.length; i++) {
      if (params.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      accumulated += words[i];
      const done = i === words.length - 1;

      params.onChunk?.({
        delta: words[i],
        fullMessage: accumulated,
        role: 'assistant',
        datetime: Date.now(),
        done,
      });

      if (!done) {
        await new Promise(r => setTimeout(r, STREAM_DELAY_MS));
      }
    }

    params.onStreamEvent?.({ phase: 'complete', mode: 'sse', fullMessage });

    return { role: 'assistant', message: fullMessage, datetime: Date.now() };
  }

  checkHealth(): Promise<GatewayHealth> {
    return Promise.resolve({ healthy: true, requestId: 'mock', status: 200, durationMs: 1 });
  }

  getClientMetadata(): Promise<ClientMetadataResponse> {
    return Promise.resolve({ clientId: 'mock-client' });
  }

  listModels(): Promise<GatewayModel[]> {
    return Promise.resolve([
      { id: 'mock-fast', label: 'Mock Fast', default: true },
      { id: 'mock-smart', label: 'Mock Smart' },
    ]);
  }
}

export function createMockGatewayAdapter(_context: GatewayAdapterFactoryContext): GatewayAdapter {
  return new MockGatewayAdapter();
}
