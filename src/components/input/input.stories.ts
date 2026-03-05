import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit-html';

// Register icons used in stories
import '../../icons/phosphor/magnifying-glass.ts';
import '../../icons/phosphor/envelope.ts';
import '../../icons/phosphor/eye.ts';

type InputArgs = {
  placeholder: string;
  value: string;
  variant: string;
  size: string;
  intent: string;
  disabled: boolean;
  readonly: boolean;
  required: boolean;
  forceHover: boolean;
  forceFocus: boolean;
};

const meta: Meta<InputArgs> = {
  title: 'Components/Input',
  component: 'n-input',
  argTypes: {
    placeholder: { control: 'text' },
    value: { control: 'text' },
    variant: {
      control: 'select',
      options: ['', 'secondary', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    intent: {
      control: 'select',
      options: ['', 'accent', 'info', 'success', 'warning', 'danger'],
    },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    required: { control: 'boolean' },
    forceHover: { control: 'boolean', name: 'force-hover' },
    forceFocus: { control: 'boolean', name: 'force-focus' },
  },
  args: {
    placeholder: 'Type something...',
    value: '',
    variant: '',
    size: 'md',
    intent: '',
    disabled: false,
    readonly: false,
    required: false,
    forceHover: false,
    forceFocus: false,
  },
  render: (args) => html`
    <n-input
      placeholder=${args.placeholder}
      value=${args.value || undefined}
      variant=${args.variant || undefined}
      size=${args.size}
      intent=${args.intent || undefined}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
      ?required=${args.required}
      ?force-hover=${args.forceHover}
      ?force-focus=${args.forceFocus}
    ></n-input>
  `,
};

export default meta;
type Story = StoryObj<InputArgs>;

export const Default: Story = {};

export const WithValue: Story = {
  args: { value: 'Hello world', placeholder: '' },
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Disabled input' },
};

export const ReadOnly: Story = {
  args: { readonly: true, value: 'Read-only value' },
};

export const WithLeadingIcon: Story = {
  render: (args) => html`
    <n-input
      placeholder=${args.placeholder}
      ?disabled=${args.disabled}
      size=${args.size}
    >
      <n-icon name="magnifying-glass" slot="leading"></n-icon>
    </n-input>
  `,
  args: { placeholder: 'Search...' },
};

export const WithTrailingIcon: Story = {
  render: (args) => html`
    <n-input
      placeholder=${args.placeholder}
      ?disabled=${args.disabled}
      size=${args.size}
    >
      <n-icon name="eye" slot="trailing"></n-icon>
    </n-input>
  `,
  args: { placeholder: 'Password' },
};

export const WithBothIcons: Story = {
  render: (args) => html`
    <n-input
      placeholder=${args.placeholder}
      ?disabled=${args.disabled}
      size=${args.size}
    >
      <n-icon name="envelope" slot="leading"></n-icon>
      <n-icon name="eye" slot="trailing"></n-icon>
    </n-input>
  `,
  args: { placeholder: 'Email address' },
};

export const AllSizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.5rem; max-width: 20rem;">
      <n-input size="sm" placeholder="Small"></n-input>
      <n-input size="md" placeholder="Medium"></n-input>
      <n-input size="lg" placeholder="Large"></n-input>
    </div>
  `,
};

export const InteractiveStates: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.5rem; max-width: 20rem;">
      <n-input placeholder="Rest"></n-input>
      <n-input placeholder="Hover" force-hover></n-input>
      <n-input placeholder="Focus" force-focus></n-input>
      <n-input placeholder="Disabled" disabled></n-input>
    </div>
  `,
};
