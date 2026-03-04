import type { TraitAdapter } from '../../registries/trait-registry.ts';
import { SlashCommandController } from '../slash-command-controller.ts';
import type { SlashCommand } from '../slash-command-controller.ts';

export const slashCommandableAdapter: TraitAdapter<SlashCommandController> = {
  name: 'slash-commandable',
  create(host, options) {
    // Find input element inside host (query for n-input, n-textarea, input, textarea)
    const input = host.querySelector('n-input, n-textarea, input, textarea') as HTMLElement;
    if (!input) return null as unknown as SlashCommandController;

    // Parse commands from options['commands'] (JSON string)
    let commands: SlashCommand[] = [];
    if (options['commands']) {
      try { commands = JSON.parse(options['commands']); } catch { /* ignore */ }
    }

    return new SlashCommandController(host, { input, commands });
  },
  destroy(instance) { instance.destroy(); },
  update(instance, options) {
    if (options['commands']) {
      try {
        instance.commands = JSON.parse(options['commands']);
      } catch { /* ignore */ }
    }
  },
};
