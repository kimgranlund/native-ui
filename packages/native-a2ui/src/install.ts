/**
 * Install the A2UI plugin into a Kernel instance.
 *
 * ```ts
 * import { getKernel } from '@nonoun/native-ui/kernel';
 * import { installA2UI } from '@nonoun/native-a2ui';
 *
 * const kernel = getKernel();
 * installA2UI(kernel);
 *
 * // Later — lazily instantiated on first access:
 * const a2ui = kernel.plugin<A2UIAdapter>('a2ui');
 * ```
 */
import type { A2UIKernelBridge } from './protocol/kernel-bridge.ts';
import { A2UIAdapter } from './protocol/a2ui-adapter.ts';
import type { A2UIAdapterOptions } from './protocol/a2ui-adapter.ts';

/** Minimal interface for the Kernel.use() method. */
interface PluginHost {
  use<T>(name: string, factory: () => T): void;
}

export function installA2UI(
  kernel: A2UIKernelBridge & PluginHost,
  options?: A2UIAdapterOptions,
): void {
  kernel.use('a2ui', () => new A2UIAdapter(kernel, options));
}
