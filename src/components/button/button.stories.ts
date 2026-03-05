import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit-html';

// Register icons used in stories
import '../../icons/phosphor/heart.ts';
import '../../icons/phosphor/arrow-right.ts';
import '../../icons/phosphor/plus.ts';

type ButtonArgs = {
  label: string;
  variant: string;
  size: string;
  intent: string;
  density: string;
  radius: string;
  disabled: boolean;
  inline: boolean;
  forceHover: boolean;
  forceActive: boolean;
  forceFocusVisible: boolean;
};

const meta: Meta<ButtonArgs> = {
  title: 'Components/Button',
  component: 'n-button',
  argTypes: {
    label: { control: 'text' },
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'ghost', 'outline', 'selected', 'plain'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    intent: {
      control: 'select',
      options: ['', 'accent', 'info', 'success', 'warning', 'danger'],
    },
    density: {
      control: 'select',
      options: ['', 'compact', 'loose'],
    },
    radius: {
      control: 'select',
      options: ['', 'sharp', 'rounded', 'round'],
    },
    disabled: { control: 'boolean' },
    inline: { control: 'boolean' },
    forceHover: { control: 'boolean', name: 'force-hover' },
    forceActive: { control: 'boolean', name: 'force-active' },
    forceFocusVisible: { control: 'boolean', name: 'force-focus-visible' },
  },
  args: {
    label: 'Button',
    variant: 'default',
    size: 'md',
    intent: '',
    density: '',
    radius: '',
    disabled: false,
    inline: false,
    forceHover: false,
    forceActive: false,
    forceFocusVisible: false,
  },
  render: (args) => html`
    <n-button
      variant=${args.variant}
      size=${args.size}
      ?disabled=${args.disabled}
      ?inline=${args.inline}
      ?force-hover=${args.forceHover}
      ?force-active=${args.forceActive}
      ?force-focus-visible=${args.forceFocusVisible}
      intent=${args.intent || undefined}
      density=${args.density || undefined}
      radius=${args.radius || undefined}
    >
      <span slot="label">${args.label}</span>
    </n-button>
  `,
};

export default meta;
type Story = StoryObj<ButtonArgs>;

export const Default: Story = {};

export const Primary: Story = {
  args: { variant: 'primary', label: 'Primary' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', label: 'Secondary' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', label: 'Ghost' },
};

export const Outline: Story = {
  args: { variant: 'outline', label: 'Outline' },
};

export const Disabled: Story = {
  args: { disabled: true, label: 'Disabled' },
};

export const WithLeadingIcon: Story = {
  args: { label: 'Like' },
  render: (args) => html`
    <n-button variant=${args.variant} ?disabled=${args.disabled}>
      <n-icon name="heart" slot="leading"></n-icon>
      <span slot="label">${args.label}</span>
    </n-button>
  `,
};

export const WithTrailingIcon: Story = {
  args: { label: 'Next' },
  render: (args) => html`
    <n-button variant=${args.variant} ?disabled=${args.disabled}>
      <span slot="label">${args.label}</span>
      <n-icon name="arrow-right" slot="trailing"></n-icon>
    </n-button>
  `,
};

export const IconOnly: Story = {
  render: (args) => html`
    <n-button variant=${args.variant} size=${args.size} ?disabled=${args.disabled}>
      <n-icon name="plus"></n-icon>
    </n-button>
  `,
};

export const AllVariants: Story = {
  render: () => html`
    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
      <n-button variant="default"><span slot="label">Default</span></n-button>
      <n-button variant="primary"><span slot="label">Primary</span></n-button>
      <n-button variant="secondary"><span slot="label">Secondary</span></n-button>
      <n-button variant="ghost"><span slot="label">Ghost</span></n-button>
      <n-button variant="outline"><span slot="label">Outline</span></n-button>
      <n-button variant="selected"><span slot="label">Selected</span></n-button>
      <n-button variant="plain"><span slot="label">Plain</span></n-button>
    </div>
  `,
};

export const AllSizes: Story = {
  render: () => html`
    <div style="display: flex; gap: 0.5rem; align-items: center;">
      <n-button size="sm" variant="primary"><span slot="label">Small</span></n-button>
      <n-button size="md" variant="primary"><span slot="label">Medium</span></n-button>
      <n-button size="lg" variant="primary"><span slot="label">Large</span></n-button>
    </div>
  `,
};

export const AllIntents: Story = {
  render: () => html`
    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
      <n-button variant="primary"><span slot="label">Default</span></n-button>
      <n-button variant="primary" intent="accent"><span slot="label">Accent</span></n-button>
      <n-button variant="primary" intent="info"><span slot="label">Info</span></n-button>
      <n-button variant="primary" intent="success"><span slot="label">Success</span></n-button>
      <n-button variant="primary" intent="warning"><span slot="label">Warning</span></n-button>
      <n-button variant="primary" intent="danger"><span slot="label">Danger</span></n-button>
    </div>
  `,
};

export const InteractiveStates: Story = {
  render: () => html`
    <div style="display: flex; gap: 0.5rem; align-items: center;">
      <n-button variant="primary"><span slot="label">Rest</span></n-button>
      <n-button variant="primary" force-hover><span slot="label">Hover</span></n-button>
      <n-button variant="primary" force-active><span slot="label">Active</span></n-button>
      <n-button variant="primary" force-focus-visible><span slot="label">Focus</span></n-button>
      <n-button variant="primary" disabled><span slot="label">Disabled</span></n-button>
    </div>
  `,
};
