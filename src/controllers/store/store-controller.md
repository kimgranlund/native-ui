# StoreController

Reactive key-value store with HTTP loading. Each key is backed by a signal — consumers subscribe to individual keys and only re-render when their data changes.

## Import

```ts
import { StoreController } from '@nonoun/native-ui';
```

## Usage

```ts
const store = new StoreController();

// Manual data
store.set('name', 'Kim');
store.get('name').value; // → 'Kim'

// Load from URL — populates signals from JSON keys
await store.load('/api/user');
store.get('email').value; // → fetched value
```

## Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `parse` | `(res: Response) => Promise<Record<string, unknown>>` | `res.json()` | Custom response parser |

## Signals

| Signal | Type | Description |
|--------|------|-------------|
| `loading` | `Signal<boolean>` | `true` while a `load()` is in flight |
| `error` | `Signal<string \| null>` | Error message from last failed `load()`, or `null` |

## Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `get` | `get<T>(key: string): Signal<T>` | Get or create a signal for a key |
| `set` | `set(key: string, value: unknown): void` | Set a value (creates signal if needed) |
| `setAll` | `setAll(data: Record<string, unknown>): void` | Bulk-set from a plain object |
| `load` | `load(url: string): Promise<boolean>` | Fetch JSON, populate signals from top-level keys |
| `has` | `has(key: string): boolean` | Check if a key exists |
| `keys` | `keys(): IterableIterator<string>` | All current keys |
| `destroy` | `destroy(): void` | Abort pending loads, clean up |

## Provider Usage

`StoreController` is used internally by `<n-controller>` when the `store` attribute is set. It can also be accessed via the Context API:

```html
<n-controller store="/api/data">
  <!-- Children can request the store via context -->
</n-controller>
```

## File Inventory

| File | Purpose |
|------|---------|
| `store-controller.md` | Controller documentation |
| `store-controller.test.ts` | Tests |
| `store-controller.ts` | Controller (reactive state + behavior) |
