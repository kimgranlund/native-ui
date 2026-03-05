import type { Preview } from '@storybook/web-components-vite';

// Foundation CSS (colors, tokens, themes, base)
import '../src/styles/n-index.css';
// Component styles
import '../src/styles/n-components.css';

// Register traits before component definitions
import { registerAllTraits } from '../src/traits/register-all.ts';
registerAllTraits();

// Register all custom elements
import '../src/register-all.ts';

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
  },
};

export default preview;
